# Fixture CVs for the page tests

Each file is a JSON Resume 1.3.1 document that is valid for 002's schema. They seed the edge
cases of the spec (research R21, spec Edge Cases). Their text is made up on purpose, and no check
searches this directory. Some break 002's CV rules on purpose (such as `three-projects.json`,
which isn't newest first), as the page must still render them as written.

| File | What it seeds |
|------|---------------|
| `every-field.json` | Every shown field of the Key Entities table, each with a distinct value: `basics.url`, a region, a profile with no username, a work entry with `location` and `url`, a project with `entity`, `type`, `roles`, `url` and `keywords`, an education entry with `url`, `score` and `courses`, a skill with `level`, and an interest with keywords |
| `three-projects.json` | Three projects in a non-chronological order, which the page keeps |
| `no-name.json` | No `basics.name`: the `h1` and the title fall back to the site heading |
| `no-summary.json` | No `basics.summary` |
| `nothing-optional.json` | No email, location, summary or profiles: no contact rows |
| `empty-sections.json` | `"interests": []` and no `languages`: neither section is shown |
| `partial-dates.json` | One work entry per row of data-model.md's Date range table, plus `2018` to `2018-07`, `2018` to `2019-03`, `2018-07-29` alone (start and end equal) and a day-precision start only |
| `no-url-no-dates.json` | A project with no URL and no dates, a role with no highlights, a skill with no keywords, an education entry with no courses, and a profile with no URL |
| `entry-without-heading.json` | Work entries with neither position nor name (falling back to the date), named only by the organization, and one holding nothing shown, which isn't rendered; an education entry with neither study type nor area |
| `long-words.json` | A 120-character word as a project name and a 200-character address in the summary |
| `non-ascii.json` | Names and places with `ș`, `ț`, `ă`, `é`, `ü` and `ß` |
