// The Playground's work outside React (research R2): the engine, once
// loaded, its checks, the kept code and the messages. Like the session it
// lives for the visit, so the content can unmount and mount again (FR-005,
// FR-061) without losing the editor's model or a download in progress.
import cvTypes from 'virtual:cv-types';
import { counted, fill, siteText } from '../../site-text.ts';
import { announce } from '../../os/announce.ts';
import { createChecker } from './checker.ts';
import { changedOptions, settle } from './compiler-options.ts';
import type { ChangedOptions } from './compiler-options.ts';
import { welcome } from './examples/index.ts';
import type { Example } from './examples/index.ts';
import { createKeeper, readKept, removeKept, worthKeeping, writeKept } from './kept.ts';
import type { Engine, EngineCommand } from './engine/contract.ts';
import { loadEngine, requestRetry } from './engine/loader.ts';
import { session } from './session.ts';
import { editorTheme } from './theme-values.ts';
import type { CheckResult, DownloadState, Message, MessageAction, MessageKey } from './types.ts';

const words = siteText.playground;

// What the code sees beside a worker's globals (research R14): the three
// dialogs as the runtime gives them.
const GLOBALS_TYPES = `/** Logs an alert entry; the code goes on. */
declare function alert(message?: unknown): void;
/** Not available in the Playground: logs a note and returns null. */
declare function prompt(message?: string, _default?: string): string | null;
/** Not available in the Playground: logs a note and returns false. */
declare function confirm(message?: string): boolean;
`;

let engine: Engine | null = null;
let loading: AbortController | null = null;
let mac = false;
let starting: Example | null = null;
// The code before the last replacement, for Undo.
let undoable = false;
let messageIds = 0;
let commandHandler: (id: EngineCommand) => void = () => undefined;
const engineListeners = new Set<() => void>();

export const currentEngine = (): Engine | null => engine;

export function onEngine(listener: () => void): () => void {
  engineListeners.add(listener);
  return () => void engineListeners.delete(listener);
}

export const startingExample = (): Example => (starting ??= welcome(mac));

export function setCommandHandler(handler: (id: EngineCommand) => void): void {
  commandHandler = handler;
}

// The one message under the toolbar; a new one replaces it (data-model.md
// Message).
export function showMessage(kind: Message['kind'], text: MessageKey, actions: MessageAction[] = [], values?: Record<string, string | number>, link?: string): void {
  messageIds += 1;
  session.update({ message: { kind, text, actions, id: messageIds, ...(values === undefined ? {} : { values }), ...(link === undefined ? {} : { link }) } });
}

export const dismissMessage = () => session.update({ message: null });

// Kept code (FR-019): read once when the Playground first mounts in a visit.
let keptRead = false;

function readKeptOnce(): { code: string; options: ChangedOptions } {
  const start = startingExample();
  if (keptRead) return { code: engine?.getCode() ?? start.code, options: session.get().options };
  keptRead = true;
  const kept = readKept();
  if (kept.kind === 'no-storage') {
    session.update({ keeping: 'no-storage' });
    return { code: start.code, options: {} };
  }
  if (kept.kind === 'none') return { code: start.code, options: {} };
  session.update({ options: kept.options });
  if (kept.unknown.length > 0) showMessage('info', 'unknownKeptOptions', [], { n: kept.unknown.length, names: kept.unknown.join(', ') });
  return { code: kept.code, options: kept.options };
}

let toldCantKeep = false;

function keepNow(): void {
  if (engine === null) return;
  const { options } = session.get();
  const code = engine.getCode();
  if (!worthKeeping(code, options, startingExample().code)) return;
  if (session.get().keeping === 'no-storage' || writeKept(code, options) === 'no-storage') {
    session.update({ keeping: 'no-storage' });
    if (!toldCantKeep) {
      toldCantKeep = true;
      showMessage('warn', 'cantKeepCode');
    }
  }
}

const keeper = createKeeper(keepNow);

// FR-064: the error count, once typing has paused.
function announceErrors(result: CheckResult): void {
  const errors = result.diagnostics.filter((entry) => entry.category === 'error').length;
  const forms = words.announce.errors;
  announce(errors === 0 ? forms.none : fill(counted(forms, errors), { n: errors }));
}

let lastAnnouncedErrors: number | null = null;

const checker = createChecker({
  check: () => engine?.check(),
  setChecking: (on) => session.update({ checking: on }),
});

function onCheck(result: CheckResult): void {
  if (!checker.result(result.version)) return;
  if (engine !== null && result.version !== engine.version()) return;
  session.update({ check: result, checking: false });
  const errors = result.diagnostics.filter((entry) => entry.category === 'error').length;
  if (lastAnnouncedErrors !== errors) {
    lastAnnouncedErrors = errors;
    announceErrors(result);
  }
}

function onChange(version: number): void {
  checker.changed(version);
  keeper.changed();
  undoable = false;
  const { example } = session.get();
  if (example !== null && engine !== null) {
    const shown = example === startingExample().id ? startingExample().code : null;
    if (shown === null || engine.getCode() !== shown) session.update({ example: null });
  }
}

// The download's announcements (FR-065).
function announceDownload(previous: DownloadState, next: DownloadState): void {
  if (next.kind === 'downloading') {
    if (previous.kind !== 'downloading') announce(words.announce.downloadStarted);
    else if (next.announcedStep > previous.announcedStep && next.announcedStep < 4) announce(fill(words.announce.downloadStep, { percent: next.announcedStep * 25 }));
  } else if (next.kind === 'ready' && previous.kind === 'downloading') announce(words.announce.downloadDone);
  else if (next.kind === 'offline' && previous.kind === 'downloading') announce(words.announce.downloadFailed);
}

export type StartInput = { manifest: string; bytes: number; mac: boolean };

// The first desktop open of a visit: download or open the stored engine,
// then the editor (FR-007, FR-008).
export function startEngine(input: StartInput): void {
  if (engine !== null || loading !== null) return;
  mac = input.mac;
  starting = welcome(mac);
  const controller = new AbortController();
  loading = controller;
  let readyState: DownloadState | null = null;
  void loadEngine(
    input.manifest,
    input.bytes,
    {
      onState: (state) => {
        const previous = session.get().download;
        if (state.kind === 'ready') readyState = state;
        else session.update({ download: state });
        announceDownload(previous, state);
      },
    },
    controller.signal,
  )
    .then(async ({ module, kept }) => {
      const { code, options } = readKeptOnce();
      const created = await module.createEngine({
        code,
        options,
        cvTypes,
        globalsTypes: GLOBALS_TYPES,
        theme: editorTheme(),
        text: { editorName: words.editor.name, packages: words.editor.packages, runCommand: words.editor.runCommand, keysCommand: words.editor.keysCommand },
        mac,
        onChange,
        onCheck,
        onCommand: (id) => commandHandler(id),
        onCursor: (cursor) => session.update({ cursor }),
        onTabFocus: (on) => session.update({ tabMovesFocus: on }),
      });
      if (controller.signal.aborted) {
        created.dispose();
        return;
      }
      engine = created;
      loading = null;
      if (code === startingExample().code && Object.keys(options).length === 0) session.update({ example: startingExample().id });
      session.update({ download: readyState ?? { kind: 'ready', typescript: created.typescript, kept } });
      if (!kept) showMessage('warn', 'cantKeepTypeScript');
      for (const listener of [...engineListeners]) listener();
    })
    .catch(() => {
      if (loading === controller) loading = null;
      if (!controller.signal.aborted) session.update({ download: { kind: 'idle' } });
    });
}

export const retryDownload = () => requestRetry();

// The window closed (FR-046): a download in progress stops; the code is kept.
export function closePlayground(): void {
  keeper.flush();
  if (loading !== null) {
    loading.abort();
    loading = null;
    session.update({ download: { kind: 'idle' } });
  }
  session.close();
}

// The page goes: the code is kept now (R15).
export function onPageHide(): void {
  keeper.flush();
}

// Options (FR-025, FR-026): applied at once, kept as code is.
export function setOptions(options: ChangedOptions): void {
  const changed = changedOptions(settle(options));
  session.update({ options: changed });
  engine?.setOptions(changed);
  keeper.changed();
}

// Replaces the code as one undoable edit (FR-027, FR-057, FR-080).
export function replaceCode(code: string, options: ChangedOptions): void {
  if (engine === null) return;
  engine.replaceCode(code);
  setOptions(options);
  undoable = true;
}

export function undoReplacement(): void {
  if (engine === null) return;
  engine.undo();
  dismissMessage();
}

export const canUndo = () => undoable;

// Reset (FR-080): Welcome and the defaults come back; the code is no longer kept.
export function resetPlayground(): void {
  replaceCode(startingExample().code, {});
  keeper.cancel();
  removeKept();
  session.update({ example: startingExample().id });
  showMessage('done', 'resetDone', ['undo']);
}

export const keepingNow = () => keeper.flush();
