# Agent skill options

Principle X of [the constitution](../.specify/memory/constitution.md) says no agent skill is
added unless a plan gives a written reason. The skills below were installed before the
constitution was ratified, with no such reason, so they were removed (issue #4). They are kept
here as options for later plans.

| Skill | Source | What it does | Likely first use |
|-------|--------|--------------|------------------|
| `frontend-design` | `anthropics/skills`, `skills/frontend-design/SKILL.md` | Guidance on aesthetic direction and typography, so a UI doesn't read as a template. Not tied to a stack. | The `/cv` page design and the first token set |
| `web-design-guidelines` | `vercel-labs/agent-skills`, `skills/web-design-guidelines/SKILL.md` | Reviews UI code against Vercel's Web Interface Guidelines, accessibility included. Not tied to a stack. | Review of the first UI feature |
| `shadcn` | `shadcn/ui`, `skills/shadcn/SKILL.md` | Adds, composes and styles shadcn/ui components. Assumes React. | Only if a plan chooses React and shadcn/ui |
| `vercel-react-best-practices` | `vercel-labs/agent-skills`, `skills/react-best-practices/SKILL.md` | React and Next.js performance guidance. Assumes React, possibly Next.js. | Only if a plan chooses React |

## Adding one back

1. The plan that needs the skill lists it in its "Dependencies, Skills & Abstractions" table,
   with the reason and the simpler alternative it rejected.
2. Restore the exact version that was removed, or install the current one from its source and
   review the changes:

   ```sh
   git checkout 555b1cf -- .claude/skills/<skill> skills-lock.json
   ```

   Restoring `skills-lock.json` this way brings back all four entries. Keep only the one the
   plan names.
3. Remove the skill from the table above.
