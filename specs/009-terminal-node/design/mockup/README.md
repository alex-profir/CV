# Interim local mockup: Node in the Terminal

One static page per state of [../wireframes.md](../wireframes.md), under the constitution's interim provision on
local mockups. `build.mjs` opens the real built site, runs a real line for its markup, fills in each state and saves
the page with no scripts, beside `assets/` (the site's own style sheet and fonts). `mockup.css` holds the one thing
this feature adds, the Stop key, in site tokens.

To rebuild: `npm run build`, then `PORT=4191 npm run serve`, then
`PORT=4191 node specs/009-terminal-node/design/mockup/build.mjs`.

Exports: `desktop-*-1440.png`, `phone-*-375.png`, `phone-*-320.png`.
