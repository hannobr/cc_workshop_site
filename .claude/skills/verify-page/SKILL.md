---
name: verify-page
description: >-
  Render and visually verify a workshop HTML page against design-system.html
  with playwright-cli screenshots at 960, 1440 and 390px, then report
  findings. Required after any edit to a page in this repo.
when_to_use: >-
  Every time any page in docs/ (step-*.html, break.html, index.html,
  cheat-sheet.html, harness-*.html, opening.html, design-system.html,
  _template.html) was edited or created, before saying the work is done. Also
  when the user asks to verify, check, QA or "look at" a page. Do not skip it
  for small edits.
---

# Verify a workshop page

Written rules did not catch the two bugs that motivated this skill; rendering
the page did. The failure mode both times was scope: the author looked only at
the thing just edited. The `.term` collision sat in a glossary directly above
an element-scoped screenshot and still shipped. So the core rule is: verify
whole pages, every page you touched, with your own eyes on real pixels.

## 1. Decide what to verify

Verify every page modified in this session plus anything `git status` shows as
a modified or new `.html` file. Every page sits flat in `docs/`, so
`ls docs/*.html` is the live page list; read it there rather than trusting any
list written down here, which is how this skill went stale once already.
Ignore `archive/`, and ignore `fixture-verify-01.html` (and every other
`fixture-verify-*.html`) unless it is the explicit target: it is this skill's
own regression fixture and its bugs are planted on purpose; never fix or
delete it. When the user names a page ("verify page 2"), page numbers match
filenames: page 2 is `step-02.html`.

What a page is checked against comes from what the page carries, not from
its name. Read the page's own markup and apply the matching contracts:

- **Carries `body[data-step]` and a `.sheet-trigger`** (`workshop-nav.js`
  only runs `initStepPage()` when both exist): the rail, mode-switch and
  progress checks in section 4 apply.
- **`data-step` is a number**: a step page in the numbered sequence.
  `step-01` to `step-03` are concept pages; `step-04` is the afternoon page
  (a hero, the `.spine` figure, then under a hairline the loop section with
  the `.circuit` figure).
- **`data-step="break"`**: see the paragraph below.
- **No `data-step`**: a page outside the step sequence with no step nav.
  Today that is `index.html`, `cheat-sheet.html`, the six
  `harness-*.html` reference pages and `design-system.html`. Skip the rail,
  mode-switch and progress checks; every other section 4 check still applies.
- **`opening.html`** is a projector slide: topbar only, and it deliberately
  loads neither `workshop-nav.js` nor `mobile-overrides.css`. Never report
  those two as missing assets here.
- **`_template.html`** is the chrome every new page is copied from, so a
  missing shared stylesheet or a missing `workshop-nav.js` in it is a
  finding that will propagate.

`break.html` is in scope and is easy to forget, because it is in the nav
sequence without being a step: no number, no meta-chip, `data-step="break"`,
handled by name in `workshop-nav.js`, and it writes no progress. The rail,
type, mode-switch, readability and mobile checks in section 4 all apply to
it, with the break row itself lit in the rail and no row ticked by it. It
sets no task, so never flag it for carrying no figure and no task.

If you were editing pages yourself, run this before reporting the work done,
and fix what you find in place, then re-verify. If the user asked you to
verify a page you did not edit, report findings and stop; do not fix until
asked.

## 2. Delegate the pass to a subagent

When you edited pages yourself, run the verification pass (sections 3 through
7) in a read-only subagent by default instead of in your own context. By
then the Stop hook (`.claude/hooks/page-checks.py`, section 5) has already
run the mechanical greps on every changed page and blocked the turn until
they were clean; the subagent's job is the rendered pass the hook cannot do. Two
reasons, both grounded in how this skill fails: full-page screenshots are the
heaviest tokens in an edit-verify-fix cycle, and they pile up in the session
that still has fixing to do; and both shipped bugs got past an author
verifying their own edit through their own expectations. A verifier that never
saw the edits has no idea which parts are "safe", so it actually reads the
whole page.

Mechanics:

- Spawn the `page-verifier` agent (`.claude/agents/page-verifier.md`). It
  has Read and Bash for the server, playwright-cli and screenshots, and no
  Edit or Write, which turns "report, do not fix" and "never fix the
  fixture" from instructions into guarantees. Its frontmatter pins the
  model (Sonnet: the job is reading pixels against a checklist and
  measuring the DOM, not designing). Change that model only after the
  section 8 fixture run shows the new one still finds both planted visual
  bugs.
- The subagent knows nothing about this session, so its prompt must carry
  everything: the explicit page list from section 1 (it cannot know what you
  edited), the path of `docs/`, what changed on each page, and the scratchpad
  directory for screenshots. Its own definition already tells it to follow
  sections 3 through 7 and to return the section 6 report with screenshot
  paths.
- Several changed pages may fan out to one verifier per page, spawned in
  parallel; the random port and unique playwright session name in section 3
  exist so parallel verifiers never collide.
- Findings come back to you. Fix them in place (section 1), then spawn a
  fresh verifier to re-verify: a finding is fixed when a verifier says so,
  not when the edit lands. Use the returned screenshot paths as the evidence
  your own report attaches.

Run inline instead when the user conversationally asked you to look at one
page and the screenshot belongs in the conversation, or when you are zooming
into a single already-reported finding. Inline still means the full sections
3 through 7; delegation changes who looks, never what gets checked.

## 3. Serve and screenshot

playwright-cli blocks `file://`, so serve `docs/` over HTTP. `docs/` is the
site root: pages sit flat there and link their stylesheets as
`assets/css/...`, so a server rooted anywhere else renders every page
unstyled. Pick a random high
port so parallel agents and stale servers never collide, and use a unique
playwright session name for the same reason:

```bash
PORT=$((20000 + RANDOM % 20000))
python3 -m http.server $PORT --directory /path/to/repo/docs   # SITE ROOT
S=verify-$PORT
playwright-cli -s=$S open "http://localhost:$PORT/<page>.html"
# the design system inventory: .../design-system.html
```

An unstyled page (bare Times New Roman, no layout) means the asset paths are
wrong, not that the page is broken. Check the stylesheet paths first.

Take FULL-PAGE screenshots, not element screenshots. Element shots are how the
glossary bug survived a "verification". Three widths, in this order:

**960 is the PRIMARY width.** It is half of a 1920x1080 screen, the width a
participant actually reads at, with the terminal beside the browser. Every
check in section 4 happens here first; 1440 and 390 confirm the design holds
at the edges. A finding at 960 outranks a page that looks fine at 1440.

For each page:

1. Ask the page how tall it is: `playwright-cli -s=$S eval "document.body.scrollHeight"`.
2. Resize the viewport to cover it at the primary width:
   `playwright-cli -s=$S resize 960 <height>`.
3. Screenshot to your scratchpad directory, then run the section 4 checks here.
4. Repeat at desktop width: re-measure the height, `resize 1440 <height>`,
   screenshot. The reading column is capped at 820px here.
5. Repeat at mobile width: re-measure the height, `resize 390 <height>`,
   screenshot (mobile-overrides.css kicks in below 720px; this is where the
   rail disappears, grids stack, and font overrides apply).

Re-measure `document.body.scrollHeight` after every resize: the page reflows
and a height taken at one width crops or pads the next. If a page is taller
than ~8000px, screenshot it in overlapping sections instead of one giant image.

Then actually read every screenshot top to bottom, including the parts you did
not touch. A page is one document; your edit's blast radius is the whole file
plus every shared stylesheet it links.

Element screenshots are still useful for zooming into a finding you already
spotted; they are never the primary pass.

## 4. Visual checklist

Look for these specifically. A screenshot only surfaces what you look for.
Run them at 960 first, then confirm at 1440 and 390. The pages are the
state since 2026-09-04: one track of four steps, one afternoon page with
one figure, no build-step chrome anywhere live.

- **Canon match.** Any component you added or changed must match its specimen
  in `design-system.html` (the full inventory per CLAUDE.md). Open the
  specimen and compare side by side: same colors, same emphasis, same
  structure. A treatment with no specimen is a finding in itself; the fix is
  usually to use the existing primitive, not to invent.
- **The rail.** At 960 and 1440 the step sheet is docked as a 200px left rail
  (one markup, two presentations; there is never a second list). It holds
  four step rows (01 How Claude works, 02 Setup, 03 Context window, 04
  Build), the break row between 03 and 04, and the closing bookend row
  ("Demos and wrap-up"). Exactly one row is current and lit blue
  (`--accent-2`), done rows are ticked green, the break row is amber, the
  bookend is present and inert (no link, no `data-step`, no tick), the
  `[data-sum]` summary line is filled ("you are here" plus the minutes when
  that step has an estimate), the minutes render at 12px on `--ink-2`, and
  Build intentionally leaves its minute value blank. `.sheet-trigger` is
  hidden. The reading column beside it is about 688px at 960. At 390 there
  is no rail: the trigger shows, activating it opens the sheet with the
  four step rows plus the break row and the bookend, and
  `document.documentElement.scrollWidth === 390`.
- **The afternoon page.** `step-04.html` is a hero (eyebrow, H1, lede, no
  meta-chip), the `.spine` figure directly under it, then under a hairline
  the loop section (an H2, one lede line, the `.circuit` figure), then the
  footer. Compare the spine with `design-system.html#spine`: four moves on
  one hairline above 620px of figure width (Interview, Plan in the repo,
  Critique, the Verify ring), names above the line in Archivo, one plain
  sentence below each, the ring the only bold element, the tick in
  `--accent` green the only hue, the figcaption at 16px, and the copy
  identical to the specimen word for word. Below 620px the line turns
  downward and nothing overlaps. Compare the circuit with
  `design-system.html#circuit`: four stations on one closed line (interview
  in plan mode, critique the plan yourself, set the finish line then look
  at the proof, commit and clear for the next work item), the one-sentence
  shortcut as a dashed branch into station 3, each station with a title, one plain
  sentence and its key caps or command chips, stations 1 and 3 each carrying
  a `.prompt-card` with its copy button wired, the figcaption at 16px, and
  the copy identical to the specimen. The closed line is drawn by grid
  line, not by content: `.circuit__loop`'s `grid-row` end is the station
  count plus one (row 1 is the rule). Whenever the figure gains or loses a
  station, measure that the back edge still lands on the last station's top
  and that the dashed branch still rejoins at 3; a stale number overshoots
  or falls short and no other check catches it. Any `.step-io`, `.blocks`, `.blk`,
  `.brief`, `.spar`, plan-mode chip or pass check on this page is a
  finding: the build-step template was retired on 2026-09-04 and lives only
  in `archive/two-route-fork/` and as design-system specimens.
- **Prompt wrap, measured at 960 on every page that carries a
  `.prompt-card`.** Measure every `.pc-body` the page has, wherever it sits:
  `step-03.html`, stations 1 and 3 of the circuit on `step-04.html`, the
  `harness-*.html` reference pages and the `design-system.html` specimens
  all carry one or more. A `.prompt-card` is a shared primitive with a
  specimen, so its presence is never itself a finding; only a wrap
  mismatch is. Do not eyeball this. In the page, run (for each `.pc-body`
  on the page):

  ```js
  (() => {
    const pre = document.querySelector('.pc-body');
    const r = document.createRange(); r.selectNodeContents(pre);
    const tops = new Set(Array.from(r.getClientRects()).map(b => Math.round(b.top)));
    return { visualLines: tops.size, sourceLines: pre.textContent.split('\n').length };
  })()
  ```

  `visualLines` and `sourceLines` must be equal: one rendered line box per
  source line. Two details matter and both have bitten this check before.
  The Range is required, because the `.pc-body` element itself always reports
  one rect, so measuring the element hides every wrap. And you must count
  DISTINCT rect tops, not `getClientRects().length`: Chromium emits an extra
  zero-width rect for each line break, so a fourteen-line prompt that wraps
  nowhere reports twenty-six rects. Counting raw rects fails a page that is
  fine. A real mismatch means a 72-character prompt line no longer fits the
  width budget (rail width, block padding, numeral column, `.pc-body` padding,
  mono size); fix the budget, not the prompt.
- **The cheat sheet.** `cheat-sheet.html` has no step nav. Its cards sit in
  the `.cards` grid, each with a head (name, tag) and a `.desc`, and some
  with a `.try` block. At 960 every `.try` renders each source line as one
  line: a command that wraps mid-line is a content finding (split the
  source line, never shrink the type). The "Seven moves" memo callout
  stays seven chips. Every `[n]` in a card resolves to a link in the
  `.cite-line`.
- **The harness reference pages.** The six `harness-*.html` pages (hooks,
  mcp, memory, rules, skills, subagents) sit outside the step sequence and
  carry no rail, so the rail, mode-switch and progress checks do not apply.
  They style themselves from `harness.css` on top of `workshop.css`: the
  `.dx*` diagram family and `.hx-when`, `.hx-file`, `.hx-flow`,
  `.hx-siblings`, `.hx-list`. Each carries a `.prompt-card` holding a
  configuration file, so the prompt-wrap check above applies to every one of
  them. Their section B comparison lists (`.hx-list li`) are instructional
  prose and sit at the 16px readability floor, not below it.
- **Mode switch without a reload.** At 960, resize the window to 800 and back
  to 960 without reloading the page. Going narrow, the sheet becomes the
  dialog (hidden, `.sheet-trigger` visible); coming back, it is the rail
  again; and `window.scrollY` is unchanged across both. A participant who
  re-tiles the terminal mid-step must not lose their place.
- **Progress.** In one browser context set
  `localStorage['workshop:lab-01:visited']='step-01.html,step-02.html,step-03.html'`
  (a comma-joined list; `workshop-nav.js` reads it that way, so a single
  slug ticks a single row) and
  `localStorage['workshop:lab-01:current']='step-03.html'`, then reload a step
  page: rows 01 to 03 are ticked in the rail. Reload `index.html` in the same
  context: row 03 is current in the run sheet (the run sheet has no resume
  button; that component survives only on the archived two-lab index). Seed
  progress with `step-03.html` only, never with a retired slug such as
  `step-05a.html`.
- **Type.** Check computed `font-family`: Archivo on headings, Public Sans on
  body, JetBrains Mono in the rail, prompt and terminal mocks. A fallback face
  showing up means the fonts link in the head is wrong.
- **Readability floor.** No load-bearing text in `--ink-3` or terminal dim.
  In dark terminal mocks, dim is for ambient decoration only (timestamps,
  parentheticals, sample output); anything the participant must read renders
  in `--term-fg`. Instructional copy is 16px minimum.
- **State signals.** Multi-step pages show exactly one current row or
  `.is-active`; done states use `--accent` green, current and action states
  `--accent-2` blue, the break `--warn` amber, never swapped.
- **Sideways scroll at 390.** For every page, measure
  `document.documentElement.scrollWidth` at a 390 viewport: it must equal
  390 exactly. The usual cause is a long inline `<code>` token in a
  `white-space: nowrap` context (historically `.blk p code` over about 35
  characters). Report the offending token and its character count, and fix
  the content, not the CSS.
- **Mobile integrity.** At 390px: nothing clipped or overlapping, no
  horizontal page scroll, grids stacked, chips and tables wrap or scroll
  inside their own containers, text still readable.

## 5. Mechanical greps

These need no browser, so they run without anyone asking: the Stop hook in
`.claude/settings.json` runs `.claude/hooks/page-checks.py` on every changed
page and stylesheet in docs/ when a turn ends, prints the findings and blocks the
turn (exit 2) until they are fixed. The class-collision baseline (page-local
names that override a shared class on purpose, such as every page's own
`.hero` and `.lede`) lives in that script's `BASELINE` table; an intended
override is added there with the page name, never by silencing the check.
Run the list below by hand when verifying a page you did not edit, a page
the hook does not cover, or after changing the hook itself.

- **Class collisions.** For every class the page defines in its own `<style>`
  block, grep `docs/assets/css/` (`workshop.css`, `lab02.css`,
  `workshop-nav.css`, `mobile-overrides.css`, `harness.css`) for the same
  class name. A page-local definition of a
  name the system already owns restyles the shared primitive on that page
  (this is exactly how `.term` turned glossary terms into black pills).
  Generic names are the hazard: `.term`, `.card`, `.hint`, `.badge`, `.step`.
- **Page hues still match the terminal's.** The three status accents are the
  `--term-*` palette's own hues, darkened to read on white; that is what makes
  the dark prompt card look native to the page beside a terminal. In
  `workshop.css` `:root` the hue (third oklch value) of `--accent` must equal
  `--term-green`'s, `--accent-2` must equal `--term-blue`'s, and `--warn` must
  equal `--term-amber`'s:

  ```bash
  grep -E -- "--(accent|accent-2|warn|term-green|term-blue|term-amber):" docs/assets/css/workshop.css
  # accent / term-green 150 · accent-2 / term-blue 240 · warn / term-amber 80
  ```

  A mismatch is a finding even when the page looks fine. Whoever moves one
  moves its partner.
- **Em dashes.** `grep -n "—" <page>` must return nothing in user-visible
  text (the box-drawing `─` U+2500 in CSS comments is fine, `—` U+2014 is
  not; see the Voice section of the `author-page` skill).
- **Required head.** The page loads Archivo, Public Sans and JetBrains Mono
  from Google Fonts in one link. Geist is gone: `grep -rin "geist"` over the
  page and the four stylesheets must return nothing.
- **Required assets.** Every step page links `workshop.css`,
  `workshop-nav.css` and `mobile-overrides.css`, and loads `workshop-nav.js`.
  A missing `workshop-nav.js` is silent in a screenshot: the rail still
  renders, but nothing paints done or current and no copy button works.
- **No "Lab" in visible text.** `grep -n "Lab 0" <page>` must return nothing.
  Class names and the `workshop:lab-01:*` localStorage keys keep the word on
  purpose; participants never see it.
- **No instructions in captions.** `.fig-cite` is 11.5px decorative; grep
  its contents and confirm nothing load-bearing (a pass check, a command)
  lives there.

## 6. Report

Per page, one verdict line (pass, or fail with count), then each finding as:
where (file and line), what you saw, which rule it breaks, and the concrete
fix. Attach or send the screenshot that shows each visual finding; a claim
about pixels needs pixels as evidence. If everything passes, say so plainly
and note what you checked; do not invent findings to seem thorough.

## 7. Clean up

Close the browser session (`playwright-cli -s=$S close`) and kill the HTTP
server. Leave no background processes running; on the workshop machines a
leaked server on a random port is confusing to debug later.

## 8. The fixture is the eval

`fixture-verify-01.html` is a page with bugs planted on purpose. It is never
fixed and never deleted, and it is excluded from the hook's changed-file
scan (as is every other `fixture-verify-*.html`). Run it after any change to
this skill, to the hook, or to the shared stylesheets, so a regression in the
checker shows up before a regression in a page does.

1. `python3 .claude/hooks/page-checks.py fixture-verify-01.html` must exit 2
   and report exactly these five: the Geist font link in the head (line 9),
   the em dash in the lede (line 35), the head loading neither Archivo nor
   Public Sans (two lines, the same head), and the page-local `.term` that
   restyles the shared glossary class. The fixture's `.term-body .dim` is
   not reported: a descendant-scoped override does not reach the shared
   primitive. Fewer means the hook regressed; more means a rule was added
   and this list needs the new line.
2. Verify the fixture with sections 3 through 7, delegated to `page-verifier`
   as in section 2, so the run exercises the agent and its pinned model.
   The rendered pass must add, at 960: the glossary term rendered as a dark
   pill by the page-local `.term`, and the instruction "run /log-check to
   confirm the file exists" rendered in terminal dim although the
   participant must read it (readability floor). A run that misses either
   has lost the two bugs this skill was written for.
3. Report the fixture run as a pass or fail of the checker, not of the page.

The quick run above is one fixture and it is open book: everything wrong with
it is written down two paragraphs up, so a checker can name the defects
without ever rendering the page. The full set is `evals/`: three more
fixtures whose defects are written down nowhere the run can reach, one of
them clean, which measures the failure this skill is most likely to have in
practice, findings that are not there. `evals/README.md` says how to run it.
Do that, rather than the quick run, when the change is to how this skill
decides what counts as a finding.

