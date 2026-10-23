# Contract: The Site's Fonts

## Files

```text
packages/web/src/fonts/
├── README.md                      # source address, download date and SHA-256 of every file
├── fonts.json                     # the description below
├── space-grotesk/
│   ├── OFL.txt                    # the family's license, from its upstream repository
│   ├── latin.woff2
│   ├── latin-ext.woff2
│   └── …                          # every other subset the family has
├── schibsted-grotesk/
│   └── …
└── jetbrains-mono/
    └── …
```

Every font file has its family's license in the same directory (FR-045). A file is committed as
downloaded and never edited.

## `fonts.json`

```json
{
  "families": [
    {
      "family": "Space Grotesk",
      "token": "font.family.display",
      "license": "space-grotesk/OFL.txt",
      "files": [
        {
          "file": "space-grotesk/latin.woff2",
          "subset": "latin",
          "weight": "300 700",
          "style": "normal",
          "unicodeRange": "U+0000-00FF, U+0131, U+0152-0153, …"
        }
      ]
    }
  ]
}
```

`token` is the font token's name in the export, set in Penpot (the example name is illustrative).

## What the build generates

The Vite plugin (`packages/web/scripts/fonts-plugin.ts`) serves `virtual:cv-fonts.css`, imported
first by the global style sheet. For each file:

```css
@font-face {
  font-family: "Space Grotesk";
  src: url("/src/fonts/space-grotesk/latin.woff2") format("woff2");
  font-weight: 300 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, …;
}
```

Vite rewrites each `url()` to the hashed asset. This CSS exists only in the build output, never in
the repository, so the token check never reads a family name in a style sheet (research R5).

The build fails, naming the token or file, when:

- a `fontFamilies` token the site reads has no entry whose `family` equals the token's first value;
- an entry's `token` doesn't exist, or its first value isn't the entry's `family`;
- a listed file or license is missing.

## What a page loads

- The style sheet uses the families only through the font tokens, so the token's fallback family
  shows while a face loads.
- The `latin` file of each family is preloaded. Other subsets load when the page's characters fall
  in their `unicode-range`.
- The service worker stores every file, every subset included, so any character drawn online is
  drawn offline too.

## Changing a font

1. Change the family in Penpot and export (003's process).
2. Add the new family's files, license and `fonts.json` entry, and record them in the README.
3. Remove the old family's directory and entry.
4. `npm run token-output`, then `npm run site-check`. The `fonts` part fails if any character on
   the page isn't drawn by a served face.
