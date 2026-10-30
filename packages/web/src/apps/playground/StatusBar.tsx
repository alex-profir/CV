// The status bar (FR-012, FR-016, FR-062): the cursor's place, the indent,
// the error count or `Checking…`, the `Tab moves focus` chip when it's on,
// and the TypeScript version the engine runs.
import { counted, fill, siteText } from '../../site-text.ts';
import { currentEngine } from './controller.ts';
import { useSession } from './session.ts';

const words = siteText.playground.status;

// The editor's indent, as the model sets it.
const INDENT = 2;

export function StatusBar() {
  const cursor = useSession((state) => state.cursor);
  const checking = useSession((state) => state.checking);
  const errors = useSession((state) => state.check?.diagnostics.filter((entry) => entry.category === 'error').length ?? 0);
  const tabMovesFocus = useSession((state) => state.tabMovesFocus);
  const version = currentEngine()?.typescript ?? '';
  return (
    <div className="playground-status" role="group" aria-label={words.label} data-req="008-typescript-playground-FR-016 008-typescript-playground-FR-062">
      <span>{fill(words.position, cursor)}</span>
      <span>{fill(words.spaces, { n: INDENT })}</span>
      {checking ? (
        <span className="check">{words.checking}</span>
      ) : errors === 0 ? (
        <span className="check">{words.noErrors}</span>
      ) : (
        <span className="check is-error">{fill(counted(words.errors, errors), { n: errors })}</span>
      )}
      {tabMovesFocus && <span className="chip">{words.tabMovesFocus}</span>}
      <span className="status-gap" />
      <span className="ts-version" data-req="008-typescript-playground-FR-012">
        {fill(words.version, { version })}
      </span>
    </div>
  );
}
