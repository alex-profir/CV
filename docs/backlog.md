# Backlog

Small adjustments to shipped features (Constitution, Principle II): where what ships differs from
the signed design. The next design work on a screen takes its entries in.

| Date | Feature | What changed | Why |
|------|---------|--------------|-----|
| 2026-11-02 | 008-typescript-playground | The Keys list gains Insert Line Below, `Cmd+K Enter` or `Ctrl+K Enter`, with the note "Not VS Code's key: Run takes {key}." `desktop-39` doesn't show the row | Monaco's key for it is Run's (FR-083), so pressing it never inserted a line while the palette still showed it (FR-084) |
| 2026-11-02 | 006-terminal | `help` lists `jq [filter] [path]`, "Filter JSON", in place of `jq [path]`, "Pretty-print JSON". The signed design shows the old words | `jq` takes filters since the amendment of 2026-10-31 (FR-056) |
