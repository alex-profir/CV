# Wireframes: CV PDF Download

One new element: the download row, the last row of the intro's contact block on `/cv`. Everything else
on the page is unchanged. The OS shell's CV app and the Terminal show no link (FR-005).

## Desktop (1440)

```
Senior Full-Stack Engineer
Alex Profir

Summary …                         ┌──────────────────────────────────┐
                                  │ Based in       Timișoara, Romania│
                                  │ Email                  address   │
                                  │ GitHub                 profile ↗ │
                                  │ LinkedIn               profile ↗ │
                                  │ CV                Download PDF ↓ │  ← new row, site element
                                  └──────────────────────────────────┘
```

## Phone (375, 320)

```
Senior Full-Stack Engineer
Alex Profir
Summary …
─────────────────────────────
Based in   Timișoara, Romania
Email                address
GitHub             profile ↗
LinkedIn           profile ↗
CV            Download PDF ↓   ← new row
─────────────────────────────
```

## States

| State | What shows |
|---|---|
| Default | The row as above; the link has the site's link underline |
| Focused | The site's focus ring around the link (keyboard) |
| Print, and the PDF itself | The row is left out (FR-004) |

## Site text

| Key | Text |
|---|---|
| Row label | `CV` |
| Link label (accessible name) | `Download PDF` |
| File name suffix | `-CV.pdf`, giving `Alex-Profir-CV.pdf` |
| Fallback file name | `CV.pdf` |

The arrow is a new kind in the site's own arrow set (↓, `M5 1v8M1.5 5.5 5 9l3.5-3.5`), drawn like the
existing ↗ and →.
