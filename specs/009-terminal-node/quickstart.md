# Quickstart: Validate Node in the Terminal

Run `nvm use`, `npm run build`, then `npm run serve`, and open the site with a desktop window. Requirements are in
[spec.md](./spec.md), formats in [contracts/commands.md](./contracts/commands.md).

| # | In the Terminal | Expect |
|---|-----------------|--------|
| 1 | `vim hello.js`, write `console.log({ a: 1 }, [1, 2])`, `:wq`, `node hello.js` | `{ a: 1 } [ 1, 2 ]`, a prompt, `echo $?` 0 |
| 2 | `node tick.js` with a 1 s `setInterval` cleared after three | Lines one at a time, then a prompt |
| 3 | `node bad.js` with `throw new Error('x')` on line 2 | Error form with the line, `^` and stack, `$?` 1 |
| 4 | `node syn.js` with `let x = ;` | Same form, at the right line, nothing ran |
| 5 | `node -e "while (true) {}"`, then drag a window | The window moves; a still-running line after 5 s |
| 6 | Ctrl+C on 5 | `^C` within a second, prompt, `$?` 130 |
| 7 | `node -e "process.on('SIGINT', () => console.log('no')); setInterval(() => {}, 1000)"`, Ctrl+C twice | `no`, then it ends |
| 8 | `node -e "while (true) console.log('y')"` | Stops at 1 MB with the stopped line; the page stays live |
| 9 | `node -e "fetch('https://example.com').catch(e => console.log(e.message))"` | A readable error, and no request in the network panel |
| 10 | `node -e "console.log(typeof document, typeof localStorage, typeof Worker)"` | `undefined undefined undefined` |
| 11 | A script reading `cv.json` and writing `out.txt`, then `cat out.txt` | The text |
| 12 | `node -e "require('fs').writeFileSync('/home/guest/cv.json', '')"` | `EACCES`, file unchanged |
| 13 | `ts-node app.ts` with a type error, then fixed; and `tsnode app.ts` | The `TS` error with nothing run; then it runs |
| 14 | `node app.ts` with the type error | It runs |
| 15 | First TypeScript run in a fresh profile | Download progress lines, then it runs. Ctrl+C during them gives `$?` 130 |
| 16 | `node a.js \| cat`, `node a.js > f`, `node` | The own-line message; the no-interactive-mode message |
| 17 | Offline after one visit: `node hello.js`; with no TypeScript copy, `ts-node app.ts` | It runs; a message with the size, `$?` 1 |
| 18 | Phone width: run 5, press Stop | As 6, Stop gone afterwards |
| 19 | Close the Terminal during 5 | The frame `#terminal-runners` holds nothing |

Automated: `npx vitest run packages/web/test/terminal/program` and `npm run site-check`.
