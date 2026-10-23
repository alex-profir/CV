# The Site's Fonts

The three font families of the approved /cv design (`specs/004-cv-page/design/review.md`), served by the site itself (004 FR-045, research R5, `specs/004-cv-page/contracts/fonts.md`).

- Every file is committed exactly as downloaded and is never edited.
- `fonts.json` describes the files. The build generates `@font-face` from it (`packages/web/scripts/fonts-plugin.ts`), so no style sheet in the repository names a family.
- Each family's license, the SIL Open Font License 1.1, is `OFL.txt` in the family's directory, from the family's upstream repository.

Downloaded on 2026-10-23. The WOFF2 files are the variable subsets Google Fonts serves for the web, from the CSS2 API requested with a current Chrome user agent. Each file's `unicode-range` in `fonts.json` is copied from the same CSS. Hashes are `shasum -a 256`.

## Space Grotesk

- Token: `font.family.display`
- CSS: <https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap>
- License: `space-grotesk/OFL.txt`, SIL Open Font License 1.1, from <https://raw.githubusercontent.com/floriankarsten/space-grotesk/master/OFL.txt>

| File | Source | SHA-256 |
|------|--------|---------|
| `space-grotesk/vietnamese.woff2` | <https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPb54C_k3HqUtEw.woff2> | `d699664b145bfeeccc66a4cce7fa55e14eb63efd7ec6b0b2ec52e25dd98f3917` |
| `space-grotesk/latin-ext.woff2` | <https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPb94C_k3HqUtEw.woff2> | `054c266fbb441ee059365dba0885d206f67ca05b375de869b88e02ebfccc9b9d` |
| `space-grotesk/latin.woff2` | <https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPbF4C_k3HqU.woff2> | `a0d054c4af557de20afd6ca59f47ab353bcaec49c63ff04b6c9d39d0f8910557` |
| `space-grotesk/OFL.txt` | <https://raw.githubusercontent.com/floriankarsten/space-grotesk/master/OFL.txt> | `564ce565c371c5e5bbf286006565a7c9aa55a9f56e7ca58d56e05d649dd61a72` |

## Schibsted Grotesk

- Token: `font.family.body`
- CSS: <https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..900&display=swap>
- License: `schibsted-grotesk/OFL.txt`, SIL Open Font License 1.1, from <https://raw.githubusercontent.com/schibsted/schibsted-grotesk/main/OFL.txt>

| File | Source | SHA-256 |
|------|--------|---------|
| `schibsted-grotesk/latin-ext.woff2` | <https://fonts.gstatic.com/s/schibstedgrotesk/v7/Jqz55SSPQuCQF3t8uOwiUL-taUTtap9IayojdSFOd1I.woff2> | `f5df746dbc2eccec6d22fdaaa2d253cd6915a30ce9f6ba86138bb6151c7254db` |
| `schibsted-grotesk/latin.woff2` | <https://fonts.gstatic.com/s/schibstedgrotesk/v7/Jqz55SSPQuCQF3t8uOwiUL-taUTtap9GayojdSFO.woff2> | `e3b56e90510a84ac0ed465b822e112983eaf58e37436bf769681c31f77b1f3a7` |
| `schibsted-grotesk/OFL.txt` | <https://raw.githubusercontent.com/schibsted/schibsted-grotesk/main/OFL.txt> | `3b4f3063b6ac7c1e403e2c4a5e8ef3a58190ff83ed7b15af66511858699139ce` |

## JetBrains Mono

- Token: `font.family.mono`
- CSS: <https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100..800&display=swap>
- License: `jetbrains-mono/OFL.txt`, SIL Open Font License 1.1, from <https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/OFL.txt>

| File | Source | SHA-256 |
|------|--------|---------|
| `jetbrains-mono/cyrillic-ext.woff2` | <https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbV2o-flEEny0FZhsfKu5WU4xD2OwGtT0rU3BE.woff2> | `992eea2f70210457ddd1196de4df3240919ffe068ad188c79d985fba4565d3bf` |
| `jetbrains-mono/cyrillic.woff2` | <https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbV2o-flEEny0FZhsfKu5WU4xD_OwGtT0rU3BE.woff2> | `af7486955880be1c2b972e9c766acffb776768d669b6576ed9a0919ce72e7ca6` |
| `jetbrains-mono/greek.woff2` | <https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbV2o-flEEny0FZhsfKu5WU4xD4OwGtT0rU3BE.woff2> | `3edf363dbf9d5fa0cdc784ae2b431a8a4152f4055a8a8858028c0bd668808273` |
| `jetbrains-mono/vietnamese.woff2` | <https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbV2o-flEEny0FZhsfKu5WU4xD0OwGtT0rU3BE.woff2> | `1390e86cc2823e759358918c01c4fcc1b6e4f01bca915bdbeb6d68eb5c244405` |
| `jetbrains-mono/latin-ext.woff2` | <https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbV2o-flEEny0FZhsfKu5WU4xD1OwGtT0rU3BE.woff2> | `7db7affbce1fdee69c1ffc2641bbca289b049867f524c9d861fe35ab6670bf29` |
| `jetbrains-mono/latin.woff2` | <https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbV2o-flEEny0FZhsfKu5WU4xD7OwGtT0rU.woff2> | `1e06740a02a443fb7f3eeda8fcaa685a0f6c620e3f01e6666e847295469ce3ad` |
| `jetbrains-mono/OFL.txt` | <https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/OFL.txt> | `a76abf002c49097d146e86740a3105a5d00450b1592e820a1109a8c5680cd697` |

## Changing a font

Follow `specs/004-cv-page/contracts/fonts.md`, "Changing a font": add the new family's files, license and `fonts.json` entry, record them here, and remove the old family's directory and entry.
