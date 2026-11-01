# Wireframes: The /cv Page

Direction: **C, Technical timeline**. These wireframes show structure and order only. The Penpot
mockup sets the visual design, and its exports sit next to this file.

Text in `[brackets]` comes from the CV document. Everything else is site text, set by the design
(FR-006). Every section is left out when the CV document has nothing for it (FR-004).

## /cv, desktop (1440 px)

Content is one centered column, 1068 px wide. Each section has its heading on the left and its
content on the right.

```
+------------------------------------------------------------------------------------+
|                                                                                    |
|   [label]                                                    <- role, mono, accent |
|   [name]                                                     <- h1, very large     |
|                                                                                    |
|   [summary ..................]        ----------------------------------------    |
|   [.........................]         Based in        [city], [country name]      |
|   [.........................]         ----------------------------------------    |
|   [.........................]         Email                   [email] (link)      |
|                                       ----------------------------------------    |
|                                       [network]             [username] ↗ (link)   |
|                                       ----------------------------------------    |
|   ================================================================================ |
|   01              | o [start] – [end]                                              |
|   Experience      | | [position]                                    <- h3        |
|                   | | [company]                                     <- accent    |
|                   | | [summary ...................................]              |
|                   | | → [highlight]                                              |
|                   | | → [highlight]                                              |
|   ================================================================================ |
|   02              | [skill name]          [LEVEL] | [skill name]          [LEVEL]  |
|   Skills          | ----------------------------- | -----------------------------  |
|                   | (kw) (kw) (kw) (kw)           | (kw) (kw) (kw)                 |
|                   | ... two columns, in CV order                                   |
|   ================================================================================ |
|   03              | o [start] – Present                                            |
|   Projects        | | [project name]                                <- h3        |
|                   | | [description ...............................]              |
|                   | | → [highlight]                                              |
|                   | o [start] – [end]                                              |
|                   | | [project name]  ... one entry per project, in CV order     |
|   ================================================================================ |
|   04              | o [start] – [end]                                              |
|   Education       | | [study type], [area]                          <- h3        |
|                   | | [institution]                                 <- accent    |
|                   | | (course) (course) (course)                                 |
|   ================================================================================ |
|   05              | [language]                                        [fluency]    |
|   Languages       | ---------------------------------------------------------------|
|                   | [language]                                        [fluency]    |
|   ================================================================================ |
|   06              | [interest name]               | [interest name]                |
|   Interests       | [keyword, keyword]            | [keyword]                      |
|                                                                                    |
+------------------------------------------------------------------------------------+
| ---------------------------------------------------------------------------------- |
|   How this page was built ↗                       <- site element, outside <main>  |
+------------------------------------------------------------------------------------+
```

- `o` is a timeline dot, `|` the timeline line, `(kw)` a keyword chip, `→` a list marker.
- `====` is a full-width rule in the text color, `----` a light rule.
- Dates use the CV document's precision: `Jul 2018`, `2018`, or `12 Jul 2018` (FR-009). An
  entry with no end date reads `[start] – Present`. A screen reader hears "July 2018 to
  October 2026" (FR-011).
- The section numbers (`01` to `06`) are decoration and hidden from screen readers. Each
  section's heading is its name.

## /cv, phone (375 px)

One column, 20 px side margins. Section headings sit above their content.

```
+-----------------------------------+
| [label]                           |
| [name]                            |
| [name, wraps if long]             |
|                                   |
| [summary .......................] |
| [...............................] |
|                                   |
| --------------------------------- |
| Based in   [city], [country name] |
| --------------------------------- |
| Email              [email] (link) |
| --------------------------------- |
| [network]     [username] ↗ (link) |
| --------------------------------- |
| ================================= |
| 01                                |
| Experience                        |
|                                   |
| o [start] – [end]                 |
| | [position]                      |
| | [company]                       |
| | [summary ...................]   |
| | → [highlight .................] |
| ================================= |
| 02                                |
| Skills                            |
| [skill name]              [LEVEL] |
| --------------------------------- |
| (kw) (kw) (kw)                    |
| ... one per row                   |
| ================================= |
| 03                                |
| Projects                          |
| o ...  one entry per project      |
| ================================= |
| 04  Education  (timeline, as 01)  |
| 05  Languages  (rows)             |
| 06  Interests  (one per row)      |
| --------------------------------- |
| How this page was built ↗         |
+-----------------------------------+
```

- Long words and addresses wrap inside the column (FR-022). Nothing scrolls sideways at 320 px.
- At 200% text size and 400% zoom, the desktop layout falls back to this one column (FR-021).

## /cv, print (A4 and US Letter)

The phone's single column at print sizes, in black on white, with no site elements.

```
+--------------------------------------------+
| [label]                                    |
| [name]                                     |
| [summary ................................] |
| Based in  [city], [country name]           |
| Email     [email]                          |  <- text is the address: printed once
| [network] [username] (https://[url])       |  <- address added after the link text
| ========================================== |
| Experience                                 |  <- heading stays with the first entry
| o [start] – [end]                          |
| | [position]                               |
| | [company]                                |
| | → [highlight]                            |
| ========================================== |
| Skills, as on screen                       |
| ========================================== |
| Projects                                   |
| o [start] – Present                        |
| | [project name]                           |  <- entry heading never ends a page
| | ...                                      |
| ...  Education, Languages, Interests,      |
|      as on screen                          |
+--------------------------------------------+
```

- Left out of print: the "How this page was built" link and any other site element (FR-032).
- The page adds no header, footer or page number. The browser's own are the visitor's choice.
- No information relies on a background color. Chips keep their border, rules and timeline
  lines stay, and the accent color prints as dark text (FR-035).
- A section or entry heading never ends a page. It moves to the next page with what it
  introduces (FR-034).

## Not-found page, desktop (1440 px)

```
+------------------------------------------------------------------------------------+
|                                                                                    |
|   404 · Not found                                       <- mono, accent            |
|   This page doesn't                                     <- h1                      |
|   exist.                                                                           |
|                                                                                    |
|   The address may be mistyped, or the page may have moved.                         |
|                                                                                    |
|   Go to the CV →                                        <- link to /cv             |
|                                                                                    |
| ---------------------------------------------------------------------------------- |
|   How this page was built ↗                                                        |
+------------------------------------------------------------------------------------+
```

## Not-found page, phone (375 px)

```
+-----------------------------------+
| 404 · Not found                   |
| This page                         |
| doesn't exist.                    |
|                                   |
| The address may be mistyped, or   |
| the page may have moved.          |
|                                   |
| Go to the CV →                    |
|                                   |
| --------------------------------- |
| How this page was built ↗         |
+-----------------------------------+
```

- The not-found page holds no CV facts, so it shows no name (FR-006).
