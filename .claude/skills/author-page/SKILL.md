---
name: author-page
description: >-
  Conventions for writing or editing a workshop page or stylesheet in this
  repo: head and faces, tokens and colour roles, figures, chips, the callout,
  layout limits, voice, and the two checks that make an edit done. Markup is
  copied from the design-system.html specimens, never retyped.
when_to_use: >-
  Before any edit to a page (step-*.html, index.html, break.html,
  cheat-sheet.html, harness-*.html, opening.html) or to workshop.css and the
  other shared sheets, and before creating a new page, whichever tool touches
  the file. Also when asked to reword, restructure, add a figure, a chip, a
  callout or a prompt card, to fix the voice, or to work out why one of these
  pages wraps, overflows or reads badly at 960, 1440 or 390px. Not for files
  that are not workshop pages or their stylesheets, such as generating
  documents or reports from data.
---

# Author a workshop page

`design-system.html` is the live inventory of every token and primitive.
`_template.html` is the canonical page chrome, `step-01.html` the
canonical concept page, `step-04.html` the afternoon page. Copy
markup from the specimen; never retype it from memory. Where an older
file contradicts the system, the system wins.

## Head

Pages sit flat in `docs/` and link the shared sheets under
`docs/assets/css/`. Every page links `workshop.css` and loads the three
faces:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Public+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="assets/css/workshop.css" />
```

Step pages also link `workshop-nav.css` and `mobile-overrides.css`, and
load `workshop-nav.js` before `</body>`. Never redefine tokens inline.
Page-local `<style>` holds layout only.

## Typography

| Role | Face | Size / weight |
|---|---|---|
| Body, hints, chips | Public Sans | 17px / 400, line-height 1.55 |
| Instructional copy (`.hint`, `.lede`) | Public Sans | 17 to 18px on `--ink-2` |
| H1 | Archivo | clamp(34px, 4vw, 50px) / 800, tracking -0.02em |
| H2 | Archivo | 22px / 800 |
| H3 (`.blk__title`) | Archivo | 18px / 800 |
| Eyebrow | Public Sans | 14px / 600, sentence case |
| Times, counts, prompt-head labels | JetBrains Mono | 12 to 13px / 500 |
| Prompt body, commands, terminal mocks | JetBrains Mono | 13px / 400, line-height 1.7 |

- Text is Public Sans, headings Archivo, code and commands JetBrains Mono.
  **Never a system mono.** Any component that can contain `<code>` needs
  its own `code` rule, or the glyphs fall back.
- Body is 17px for the 24-inch room screens. Never smaller for body copy.
- Prompt bodies are 13px, not 13.5: at 960px the column leaves 588px and a
  72-character line needs 562px. Raise it and every prompt line wraps.
- Tighten letter-spacing only on headlines, never past -0.02em.
- Anything load-bearing in a terminal mock renders in `--term-fg`, never
  dim, whatever its lightness.

## Colour

- `--ink-2` is instructional copy. `--ink-3` is decorative only: under
  about 14px it fails AA.
- `--accent` green = DONE / PASS. `--accent-2` blue = NOW / CURRENT /
  ACTIONS. `--warn` amber = the break and nothing else. `--accent-3`
  magenta = `.callout--key` and nothing else.
- The three accents sit on the terminal's own hues, so the page and the
  prompt card are one palette and an eye moving between the browser and
  the terminal is not re-adapting. Never move a page hue off its
  `--term-*` partner.
- `--bg` is pure white. Tint belongs to the rail and panels (`--bg-2`), so
  the reading column stays the brightest surface. The checklist card
  (`.brief`) is a paper card with an ink border, a hard offset shadow
  and a dark head band, and reads as the one heavy object on a build
  step; the prompt card on a concept page is the dark object there.
- No new accent colours. A further semantic state goes in `workshop.css`.

## Reference bands

A band is reference that sits beside a build, never a task of its own.
It is a section with an H2 title, one sub line under it, and then
whatever the reference needs: a run of hairline rows (a `--rule`
border-top per row), a pair of examples, or nothing more than a second
sentence. No card, no accent colour. Green is PASS and blue is NOW, and
a band means neither. A band that has shrunk to two sentences is still a
band; it does not get promoted back into rows to look substantial.

A band earns its place when the reader is working and needs something to
hand. What separates it from a figure is that a band holds prose the
reader reads, not an argument drawn in boxes, so the figure rules do not
apply to it. A number on a row means a real sequence and nothing else.

Bands are page-local by design. Their CSS sits in the page's own
`<style>` and the comment above it says why: `step-04.html` is the only
page that carries them, so promoting them to `workshop.css` would ship an
unused component to every page. Prefix the names (`.modes`,
`.selfcheck`, `.tactics`) so they clear the shared and archived ones:
`mobile-overrides.css` still styles the archived `.flow`, `.phase` and
`.ba-*`, and every live page links it. The Stop hook checks that
collision for you.

Examples inside a band are examples. A quoted source, a command in an
`.input-chip`, a line worth typing: all of it is fine, because a band is
read while the participant works on an idea of their own and none of it
is the task. What a band never does is set one.

A band may quote an outside source, in the shared `.source-quote`
primitive (specimen in `design-system.html`, live on `step-01.html` and
`step-04.html`), never in a page-local blockquote. Quote a named person
verbatim or not at all: exact words, `[...]` for anything trimmed, and
the attribution footer links the page the words are actually on. Check
the wording against that page before shipping, and again whenever the
band is edited.

## The afternoon page

`step-04.html` is a hero (eyebrow, H1, lede, no meta-chip), one
`.callout--key` hint, and three reference bands: which mode to start in,
the self-check habit, and two moves worth knowing. Then the `.sources`
aside and the footer.

The page sets no task. The participant builds an idea of their own, so
the page hands over one move (ask Claude to interview you about your
idea, one question at a time) and everything under it is reference for
while the build runs. The lede says so out loud: take what helps and
leave the rest.

**One rule survives from every rejected draft: no simulated session.** No
terminal mock, no transcript, no invented question from Claude. The page
never shows a screen.

Two rules stood here until 2026-09-09 and are gone. "No prompt on the
page, ever" and "no order" described a page that was a hero and four
`.pointers` hints. The page now carries a quotation and two lines a
participant can type, because on this page an example is reference beside
a build and not a script for it. Do not restore either rule from
an older draft of this file, and do not read them back in from
`verify-page`, which was changed with it.

Every claim in a band carries a bracketed number resolving to the
`.sources` aside: grounded in Anthropic's own documentation, never in
workshop folklore. Re-check the claims against the live docs and move the
checked date when you touch them.

`.pointers`, `.spine` and `.circuit` are design-system inventory. Any of
them can serve a page that needs it; none of them is the afternoon page
any more.

The build-step template (the `.step-io` band, `.blocks` with three
`.blk`, the `.brief` checklist card, the `.spar` prompt round, the
plan-mode chips, the musts and their why lines, the pass check as
block 2) was retired on 2026-09-04 with the guided route. It lives in
`archive/two-route-fork/` and as design-system specimens only. Never
put any of it on a live page.

Where a concept page carries a prompt card, prompts are written for
Claude, not the reader: wrap at about 72 characters, escape `<` as
`&lt;`, and use at most one angle-bracket placeholder, named in the
`.pc-foot` as the line to replace.

## Figures

A figure earns its place by carrying an argument prose carries badly:
things that differ along one axis, a boundary, or a sequence of who acts
on what. There is no quota and no page needs one. A picture added to a
block that already reads fine is decoration.

Every rule below came from a real finding:

- **CSS boxes holding real DOM text, never inline SVG.** SVG `<text>` will
  not wrap, ignores text-only zoom, and needs a second drawing for the
  stacked form.
- **No accent colour.** Green is PASS and blue is NOW. Emphasis is weight.
- **No `<p>` anywhere inside.** `.blk p` is 0,1,1 and outranks every 0,1,0
  rule in a figure component.
- **No `role="img"` and no `aria-label` on the `<figure>`.** Either makes
  the subtree presentational. The `figcaption` is the text alternative, so
  it is never decorative and never dropped.
- **A container query keyed to the figure's own width**, not a viewport
  media query: the rail undocks at 940, so a 939px viewport hands a figure
  a *wider* column than 960 does.
- **No position words in the caption.** Left and right stop being true
  when the figure stacks at 390.
- **No numbers on the rows** of a figure inside the numbered blocks.
- **Grep `archive/` before claiming a class name is free.** Archive pages
  link `workshop.css`.

A new figure is a `workshop.css` primitive with a specimen in
`design-system.html`. One that lives only in a page's `<style>` is a bug.

## Chips

Things the participant types or presses use `.input-chip`: a caret span
(`$` shell, `›` in-Claude via `.input-chip--claude`), the `cmd` span, then
the `then Return ↵` divider. Keyboard-only chips put `<kbd>` keys joined
by `<span class="plus">+</span>` directly in the chip. A chip is one line;
a command that wraps at 960 is a content bug, so split it into two rather
than shrinking the type. `.cmd-out` is dim one-line output below a chip.
Live reference: `step-02.html`.

## The callout

Max one `.callout--key` per page, for the one moment the participant must
look up. A **frame** organises everything below it and sits under the
hero; a **verdict** depends on the reasoning above it and ends a section.
Where the next step is a page to open rather than a command to type, the
action column takes `a.callout__go`, never `.btn`: a dark button above
block 0 would take the glance a build step reserves for its checklist
card.

## Layout and measurement

- The reading column caps at 820px. Prose inside a block stays near 62ch,
  the lede near 60ch.
- Inline `<code>` inside a `.blk` stays under about 35 characters.
  `.blk p code` is `white-space: nowrap`, and below 560px the block's grid
  track is `1fr`, so a longer token gives the whole page a horizontal
  scrollbar at 390. A 41-character command shipped once and pushed
  `documentElement.scrollWidth` to 419.
- **Verify at 960px first**, then 1440, then 390. 960 is half a 1920x1080
  room screen with the terminal beside it, and it is where participants
  read the page.
- The rail's breakpoint is 940, not 900: the reading column has to hold a
  72-character prompt line at 13px mono, which needs a 936px viewport once
  the rail and block paddings are subtracted. `workshop-nav.js` reads the
  same number in its `matchMedia`; change both together.
- Wide content scrolls inside its own container; the page body never
  scrolls sideways.
- Persist step progress to `localStorage` keyed by step id.
- Always a "Stuck? Raise a hand" escape hatch in the footer.

## Done means verified

Page work is not done on unrendered HTML. Two checks stand between an
edit and "done", and neither waits for a person to remember it:

- When a turn ends, the Stop hook (`.claude/hooks/page-checks.py`,
  registered in `.claude/settings.json`) runs the mechanical greps on
  every changed page and stylesheet in docs/ (em dashes, Geist, class
  collisions against the shared sheets, missing faces and assets, the
  accent hue partners) and blocks the turn with its findings. Fix them.
- Then run `/verify-page` yourself. It delegates the rendered pass to the
  read-only `page-verifier` agent, pinned to Sonnet (full-page screenshots at 960, 1440 and
  390, the rail, the spine, prompt wrap, readability) and returns findings
  with screenshots. Fix, re-verify, and only then report the work done,
  quoting the verifier's verdict.

`fixture-verify-01.html` is the regression fixture for both. Its bugs are
planted on purpose; never fix or delete it. After changing the skill, the
hook or a shared stylesheet, run the skill's section 8 fixture check.

## Nav

Copy `_template.html`; never hand-type the topbar. The brand strip is the
only home affordance: always `<a class="brand" href="index.html">` with
the `.brand-icon` SVG. `workshop-nav.js` reads the step list from the
page's own step-sheet markup and resolves prev/next by basename, so every
page stays flat in `docs/` and every page's step-sheet list carries
the same steps in the same order as `index.html`. Adding or renaming a
step means updating that list and the step-bar counts on every page.

Sources go in a page-foot `.sources` aside: numbered refs, publisher,
checked date, and the numbers anchored somewhere in the body.

## Accessibility

- All instructional text meets WCAG AA at its rendered size.
- Respect `prefers-reduced-motion`; `workshop.css` already handles it.
- Every interactive element keeps a visible `:focus-visible` state.

## Voice

One professional engineer talking to another. Plain language, no
marketing tone.

**Never use an em dash** in user-visible text, `<title>` included. Use a
period and a new sentence, a comma, a colon before a definition, or
parentheses. The only exception is the box-drawing `─` in CSS comments.

Avoid: `X isn't a Y, it's a Z` constructions; `Just X` / `Simply X`;
marketing adjectives (robust, powerful, seamless, intuitive,
frictionless); three-item rhetorical lists where two would do;
throat-clearing openers (`Let's`, `First, let me`, `So,`, `Now,`); bold
for emphasis rather than definition; `Think of it as`.

If a sentence could open a SaaS landing page, rewrite it.

Plain words, always. A participant reads these pages at speed with a
terminal beside them. One idea per sentence. Prefer the everyday word:
"decide" over "rule on", "push back" over "attack", "thing you asked
for" over "promise", "where it ended up" over "placement". A term of
art (acceptance criteria, verdict) is defined in one plain
sentence on its first use on the page and then used consistently.

Write to instruct, never to perform. A sentence must land on first
read, with nothing to decode:

- **No personified files.** A file does not act: not "spec.md makes
  the calls", "the skill carries it", "intent.md lands". Name the
  actor: Claude writes spec.md; the skill holds the convention.
  Mechanics stay: a skill "loads", a file "is read".
- **No riddle titles.** A heading states what happens, never a
  paradox the reader must decode first ("Review the spec you didn't
  write", "The first file that gets to choose").
- **No fragment questions in prose.** "Restated? Cut it." is
  telegram style. Write the sentence out: "If the spec repeats a
  convention, ask Claude to cut the line." The bolded case labels in
  pass-check lists ("Not in the slash list?") are the one exception,
  kept on purpose.
- **No vague metaphors for mechanics.** "Comes out somewhere",
  "lands", "makes the calls" hide what happens. Name the action:
  built, rejected, listed, loaded.
