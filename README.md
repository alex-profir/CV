# CV

Alex Profir's public CV, presented as a browser operating system.

**Live site: [alexprofir.vercel.app](https://alexprofir.vercel.app)** · Plain CV page:
[alexprofir.vercel.app/cv](https://alexprofir.vercel.app/cv)

On desktop the site is a macOS-style desktop with windows, a dock and a menu bar. On phones it is
an iOS-style home screen with full-screen apps. The interaction is inspired by both, and the look
is original. The CV is one click or tap from first load, and `/cv` is a plain page that reads in
full without JavaScript.

## What's in it

| Part | What it does |
|------|--------------|
| **CV** | The CV as an app, with the same content as `/cv` |
| **Terminal** | Explore the CV and the site through commands, and write and run JavaScript and TypeScript with `node` and `ts-node` in a sandbox, where Ctrl+C stops a runaway program |
| **TypeScript playground** | Write and run TypeScript in a sandbox, with live type errors and the compiled output. Desktop only |
| **Requirement inspector** | Each app's "Show specs" control lists the requirements it implements, each linked to its spec in this repository |

More apps are planned. [docs/vision.md](docs/vision.md) has the full picture and the order.

## How it's built

Every feature starts as a written spec, and every requirement can be traced through the UI to a
test. The rules for how features are built are in
[the constitution](.specify/memory/constitution.md).

| Feature | Spec |
|---------|------|
| Requirement traceability check | [specs/001](specs/001-requirement-traceability/spec.md) |
| CV content source | [specs/002](specs/002-cv-content/spec.md) |
| Design tokens source | [specs/003](specs/003-design-tokens/spec.md) |
| The `/cv` page | [specs/004](specs/004-cv-page/spec.md) |
| The OS shell | [specs/005](specs/005-os-shell/spec.md) |
| The Terminal | [specs/006](specs/006-terminal/spec.md) |
| The Requirement Inspector | [specs/007](specs/007-requirement-inspector/spec.md) |
| The TypeScript playground | [specs/008](specs/008-typescript-playground/spec.md) |
| Node in the Terminal | [specs/009](specs/009-terminal-node/spec.md) |

## Repository layout

| Path | What it holds |
|------|---------------|
| `packages/content` | The CV and site content |
| `packages/tokens` | The design tokens, the only place code reads design values from ([README](packages/tokens/README.md)) |
| `packages/os-core` | The OS logic behind the shells |
| `packages/web` | The site: the pages, the two shells and the apps |
| `tools` | The project's own checks, and the [speckit-auto](tools/speckit-auto/README.md) runner |
| `specs` | Each feature's spec, plan and tasks |
| `docs` | The vision and the backlog |

## Running it locally

The project needs Node 26, as set in `.nvmrc`.

```bash
nvm use
npm ci
npm run build
npm run serve   # http://127.0.0.1:4173, or set PORT
```

## Checks

| Command | What it checks |
|---------|----------------|
| `npm run traceability` | Requirements trace from spec to UI to test |
| `npm run content-check` | The CV content and where its facts may appear |
| `npm run token-check` | The generated tokens match their sources |
| `npm run typecheck` | The TypeScript types |
| `npm run test:fast` | The fast test suite |
| `npm run site-check` | Builds the site and checks it in a browser, including accessibility and Lighthouse |
| `npm test` | The full test suite |
| `npm run verify` | The quick checks and the tests of the areas a change touches. Add `-- --failed` to rerun only what failed |
| `npm run verify:feature` | A new feature's run before its pull request merges: every check and test but the site check's |
| `npm run signoff` | Signs off the commit a passing `verify:feature` ended on |

`npm run site-check` and `npm test` need Chromium: run `npx playwright install chromium` first.

Pull requests run the checks above `npm test` in CI, and green CI is what merges them. `npm test`
runs nightly on `main` when it has new commits, and always when started by hand. The few tests that
hold only on the owner's Mac run in `npm run verify:feature` instead. Pushes to `main` deploy to
production on Vercel.
