# Contract: Shared Links

The link format of FR-052 to FR-060 (research R16). Written and read by
`packages/web/src/apps/playground/share.ts`, which runs in the `os` script, so the mobile screen
reads and passes on links without the engine.

## Form

```text
https://<site>/#playground=1.<payload>.<check>
https://<site>/#playground
```

- The link is the site root with a fragment. A fragment is never sent to a server, so sharing sends
  nothing anywhere and the server sees only `/` (FR-054). The service worker answers `/` offline
  as it does today, so a link opens offline as FR-008 and FR-011 allow.
- `#playground` alone opens the Playground with what it holds, the starting example in a browser
  that never opened it (FR-059). The mobile screen's Share link and Copy link give this form when
  the Playground holds no code of the visitor's.
- `1` is the format. Any other value is a broken link (FR-056).

## Payload

1. `SharedContent` (data-model.md): `{ "c": <code> }`, plus `"o": <ChangedOptions>` when an
   option differs from its default. Keys in that order; options in the table's order. With `strict`
   off, a strict check that is on is written too, though on is its default: one left out reads as off
   (data-model.md Compiler options).
2. `JSON.stringify`, then UTF-8.
3. `CompressionStream('deflate-raw')`.
4. base64url (RFC 4648 §5), with no padding.

`<check>` is the first 11 characters of the base64url of SHA-256 (`crypto.subtle.digest`) over the
ASCII bytes of `<payload>`: 64 bits, so a cut-off or hand-altered payload is caught before it is
decompressed, and a garbled one can't be read as other code (FR-056).

## Making a link (FR-052, FR-055)

- Built from the current code and `ChangedOptions`. The full link, origin included, MUST be at most
  8,000 characters. When it isn't, no link is made: the message of FR-055 shows with the length
  the link would have had, and its action copies the code itself.
- Copy with `navigator.clipboard.writeText`. When it rejects or is missing, the message shows the
  link in a read-only field, selected (FR-052).
- `Share with…` shows only where `navigator.share` exists and `navigator.canShare({ url })` is true.
  It passes `{ url }` and nothing else.

## Reading a link

On hydration, before the first render of the shell's windows (contracts/shell.md):

| Address | Result |
|---------|--------|
| no `#playground` | `{ kind: 'none' }` |
| `#playground` | `{ kind: 'app' }` |
| `#playground=1.<p>.<c>` with a matching check, a payload that inflates, JSON with a string `c` and, if present, an object `o` | `{ kind: 'code', … }`; options not in the table, or of the wrong kind, go to `unknown` and are left out |
| anything else after `#playground=` | `{ kind: 'broken' }` |

Reading never throws and never runs anything. It stops inflating at what a link of the longest length can hold, 6,000 bytes at deflate's most of 1,032 times (about 6.2 MB), and calls
the link broken, so a crafted link can't exhaust memory.

## Opening a link

- **Desktop** (FR-053, FR-056, FR-057): the shell opens with the CV window as on first load and the
  Playground in front, focused. `code`: once the editor is ready, the shared code replaces what the
  editor holds as one undoable edit, the options are set, and the message `sharedOpened` (with
  `sharedReplaced` when the visitor had code of their own) shows with Undo and Run. `broken`: the
  starting example, the default options and the message `brokenLink`, with Undo where the visitor
  had code of their own, bringing back the code and options until the first edit (T238); the
  visitor's kept code isn't touched until that edit. Unknown options: the message `unknownOptions` follows. Then
  `history.replaceState(history.state, '', '/')`, so the address carries no code and a reload shows
  the kept code (FR-053). Nothing runs: no code path from reading a link reaches the runner
  (R16, checked by FR-075's test).
- **Mobile** (FR-060): the Playground's full-screen view shows the shared-link screen. The address
  keeps the fragment. Share link and Copy link pass `href` on unchanged (FR-059). The engine isn't
  loaded and the code isn't decoded beyond the check.
- **Shell switch** (FR-061): a link read on mobile and not yet opened stays pending in the session;
  widening into the desktop shell opens it as on desktop.
- **Offline, TypeScript not stored**: the link stays pending through the offline state of FR-011
  and opens when the download finishes.
