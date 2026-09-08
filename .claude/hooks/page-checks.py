#!/usr/bin/env python3
"""Stop hook for the workshop pages: the mechanical checks from
.claude/skills/verify-page/SKILL.md section 5, run on every changed page
in docs/ when a turn ends. Findings go to stderr and the script
exits 2, which blocks the turn and hands the list back to Claude.

Usage:
  page-checks.py                 # changed root .html/.css files (git status)
  page-checks.py step-04.html …  # explicit files, e.g. the fixture

Exit 0: nothing to check or nothing found. Exit 2: findings.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# The served site: pages sit flat in docs/, the shared sheets and the nav
# script under docs/assets/. Nothing outside docs/ is a page.
SITE = ROOT / "docs"
CSS = SITE / "assets" / "css"
SHARED_SHEETS = ["workshop.css", "workshop-nav.css", "mobile-overrides.css",
                 "lab02.css", "harness.css"]
# Every fixture-verify-NN.html is a regression fixture for the verify-page
# skill: its bugs are planted on purpose, so the changed-file scan never
# reports them. 01 lives in docs/; the rest are copied in from
# .claude/skills/verify-page/evals/fixtures/ for the length of an eval run.
FIXTURE_PREFIX = "fixture-verify-"
# route-c.html is retired and kept as it is (CLAUDE.md); nothing links to it.
SKIP = {"route-c.html"}

# Page-local class names that override a shared class on purpose, per page.
# Every page carries its own .hero and .lede layout (see _template.html).
# Add a name here only for an intended override; never to silence a finding
# about a generic name such as .term, .card, .hint, .badge or .step.
ALWAYS_ALLOWED = {"hero", "lede"}
BASELINE = {
    "cheat-sheet.html": {"cards", "cmd-card", "section", "section-head"},
    "design-system.html": {"brand", "card--active", "card--done", "footer", "mono", "topbar"},
    "index.html": {"footer"},
    "preview-fork.html": {"is-done"},
    "preview-palettes.html": {"blk", "is-current", "is-done"},
    "step-01.html": {"section-head", "source"},
    "step-02.html": {"is-done", "split", "step", "step-body", "step-num", "steps", "term-col", "term-label", "term-window"},
    "step-03.html": {"prompt-card", "section-head", "term-label", "term-window"},
}

HUE_PARTNERS = [("--accent", "--term-green"), ("--accent-2", "--term-blue"),
                ("--warn", "--term-amber")]


def read_hook_input():
    """Claude Code pipes the hook event as JSON on stdin. A manual run from a
    shell may have an open but silent stdin, so wait at most half a second."""
    try:
        import select
        if sys.stdin.isatty() or not select.select([sys.stdin], [], [], 0.5)[0]:
            return {}
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}


def changed_files():
    args = sys.argv[1:]
    if args:
        # A bare page name means docs/<name>; a path is taken as given.
        return [(SITE / a) if (SITE / a).exists() else (ROOT / a) for a in args]
    try:
        out = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=all"],
            cwd=ROOT, capture_output=True, text=True, check=True).stdout
    except Exception:
        return []
    files = []
    for line in out.splitlines():
        status, path = line[:2], line[3:].strip()
        if "D" in status:
            continue
        if " -> " in path:
            path = path.split(" -> ")[1]
        p = ROOT / path
        if p.suffix == ".html" and p.parent != SITE:
            continue
        if p.suffix == ".css" and p.parent != CSS:
            continue
        if p.suffix not in (".html", ".css"):
            continue
        if p.name in SKIP or p.name.startswith(FIXTURE_PREFIX) or not p.exists():
            continue
        files.append(p)
    return files


def shared_classes():
    names = set()
    for sheet in SHARED_SHEETS:
        f = CSS / sheet
        if f.exists():
            css = re.sub(r"/\*.*?\*/", "", f.read_text(errors="replace"), flags=re.S)
            names |= set(re.findall(r"\.([A-Za-z_][\w-]*)", css))
    return names


def visible_text(html):
    t = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", t, flags=re.S | re.I)
    return re.sub(r"<[^>]+>", " ", t)


def oklch_hue(css, var):
    m = re.search(var + r"\s*:\s*oklch\(\s*[\d.%]+\s+[\d.]+\s+([\d.]+)", css)
    return m.group(1) if m else None


def page_local_classes(html):
    """Class names a page's own <style> defines at the LEFT of a selector.
    `.term{}` and `.term .x{}` count: they restyle every .term on the page.
    `.term-body .dim{}` does not: it only reaches .dim inside .term-body."""
    styles = " ".join(re.findall(r"<style[^>]*>(.*?)</style>", html, flags=re.S))
    styles = re.sub(r"/\*.*?\*/", "", styles, flags=re.S)
    styles = re.sub(r"@media[^{]*\{", " ", styles)
    names = set()
    for rule in re.split(r"\}", styles):
        if "{" not in rule:
            continue
        selector_list = rule.rsplit("{", 1)[0]
        for sel in selector_list.split(","):
            m = re.match(r"\s*([^\s>+~]+)", sel)
            if m:
                names |= set(re.findall(r"\.([A-Za-z_][\w-]*)", m.group(1)))
    return names


def check_html(p, shared, findings):
    text = p.read_text(errors="replace")
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        if "—" in line:
            findings.append(f"{p.name}:{i}: em dash (U+2014). Use a period, a comma, "
                            "a colon or parentheses (author-page skill, Voice).")
        if "geist" in line.lower():
            findings.append(f"{p.name}:{i}: Geist reference. The faces are Archivo, "
                            "Public Sans and JetBrains Mono.")
    vis = visible_text(text)
    for m in re.finditer(r"Lab 0\d", vis):
        findings.append(f"{p.name}: visible text says \"{m.group(0)}\". Participants "
                        "never see the word Lab.")
    head = text.split("</head>")[0] if "</head>" in text else text
    if p.name != "_template.html" and not p.name.startswith("preview-"):
        for face in ("Archivo", "Public+Sans", "JetBrains+Mono"):
            if face not in head:
                findings.append(f"{p.name}: head does not load {face.replace('+', ' ')} "
                                "from Google Fonts (author-page skill, Head).")
    if re.search(r"<body[^>]*data-step=", text):
        for asset in ("workshop.css", "workshop-nav.css", "mobile-overrides.css",
                      "workshop-nav.js"):
            if asset not in text:
                findings.append(f"{p.name}: step page does not load {asset}.")
    local = page_local_classes(text)
    allowed = ALWAYS_ALLOWED | BASELINE.get(p.name, set())
    for name in sorted((local & shared) - allowed):
        findings.append(f"{p.name}: page-local .{name} restyles a class that "
                        "workshop.css or another shared sheet already owns. Use the "
                        "primitive, or add a modifier to workshop.css. An intended "
                        "override is listed in BASELINE in .claude/hooks/page-checks.py.")


def check_css(p, findings):
    css = p.read_text(errors="replace")
    for i, line in enumerate(css.splitlines(), 1):
        if "geist" in line.lower():
            findings.append(f"{p.name}:{i}: Geist reference.")
    if p.name == "workshop.css":
        for a, b in HUE_PARTNERS:
            ha, hb = oklch_hue(css, a), oklch_hue(css, b)
            if ha and hb and ha != hb:
                findings.append(f"workshop.css: hue of {a} ({ha}) no longer matches "
                                f"{b} ({hb}). Whoever moves one moves its partner.")


def main():
    data = read_hook_input()
    if data.get("stop_hook_active") or data.get("agent_id"):
        return 0
    files = changed_files()
    if not files:
        return 0
    shared = shared_classes()
    findings = []
    for p in files:
        if p.suffix == ".html":
            check_html(p, shared, findings)
        else:
            check_css(p, findings)
    if not findings:
        return 0
    sys.stderr.write("page-checks: %d finding(s) on changed pages. Fix them, then "
                     "run /verify-page for the rendered pass.\n" % len(findings))
    for f in findings:
        sys.stderr.write("- " + f + "\n")
    return 2


if __name__ == "__main__":
    sys.exit(main())
