# Workshop: project conventions

HTML pages for "Working with Claude Code", an in-person workshop.

The site lives in `docs/`, which is the served root. Pages sit flat there
and link each other by bare filename (`href="step-02.html"`), because
`workshop-nav.js` resolves prev, next and progress by basename. Shared
stylesheets and the nav script sit under `docs/assets/css/` and
`docs/assets/js/`, and pages link them as `href="assets/css/workshop.css"`.
The repo root holds only the README, this file and the tooling.

Before editing or creating any page or stylesheet, load the `author-page`
skill (typography, colour, figures, voice, and what "done" means). It does
not load on its own when a file is opened with `cat` or written fresh.

When a task is finished, and before saying so, load the `verify-page`
skill and run one rendered pass over every page the task touched. Once per
task, not once per edit: the pass is batched by design, and the Stop hook
already runs the mechanical checks on each changed page as you go.

skills for this repository are available in .claude/skills
agents are available in .claude/agents
hooks are available in .claude/hooks
