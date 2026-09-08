# Working with Claude Code

The pages for an in-person, one-day workshop on Claude Code. Static HTML
and CSS, no build step and no dependencies. Participants read them on a
room screen beside a terminal.

## Run it locally

```bash
python3 -m http.server 8000 --directory docs
# then open http://localhost:8000/
```

Open `docs/` over HTTP rather than with `file://`: the pages link their
stylesheets relatively and a browser page opened from the filesystem
renders them, but the verification tooling blocks `file://`.

## Layout

| Path | What it holds |
|---|---|
| `docs/` | The served site. Pages sit flat, so they link each other by filename. |
| `docs/assets/css/` | `workshop.css` (tokens and every primitive) plus the nav, mobile and topic sheets. |
| `docs/assets/js/` | `workshop-nav.js`: the step rail, prev and next, progress in `localStorage`. |
| `docs/design-system.html` | The live inventory of every token, primitive and figure. Read it before adding one. |
| `docs/_template.html` | The canonical page chrome. Copy it to start a page. |
| `.claude/` | The skills, agent and hook that author and verify the pages. |

`docs/fixture-verify-01.html` is a page with defects planted on purpose.
It is the regression fixture for the checks in `.claude/`, is excluded
from them by name, and is never fixed or deleted.

## The pages

`index.html` is the route map. `opening.html` and the four `step-NN.html`
pages run the day, `break.html` sits between them, and `cheat-sheet.html`
is the take-home. The `harness-*.html` pages cover one harness feature
each: rules, memory, skills, subagents, hooks and MCP.

## Working on a page

Two checks stand between an edit and done, and both are wired up in
`.claude/`:

1. A Stop hook (`.claude/hooks/page-checks.py`) runs the mechanical
   checks on every changed page when a turn ends: fonts, class collisions
   against the shared sheets, voice, required assets.
2. The `verify-page` skill renders the page at 960, 1440 and 390px and
   reports what it sees.

Run the hook yourself at any time:

```bash
python3 .claude/hooks/page-checks.py            # every changed page
python3 .claude/hooks/page-checks.py step-01.html
```

Conventions for the pages themselves are in `AGENTS.md` and the
`author-page` skill.

## Publishing

`.github/workflows/pages.yml` publishes `docs/` to GitHub Pages on every
push to the default branch. Enable it once under Settings, Pages, Source:
GitHub Actions.
