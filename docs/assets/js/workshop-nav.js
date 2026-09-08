/*
 * workshop-nav.js: the shared step-nav component (lab-aware).
 *
 * One step menu, two presentations, plus the sticky step-bar. At
 * 900px and up the .step-sheet is docked as the schedule rail on the
 * left of the frame (CSS does the layout, applyMode() below does the
 * semantics); below 900px the same markup is the bottom-sheet dialog
 * behind the .sheet-trigger. The step registry is DATA-DRIVEN instead
 * of a hardcoded array, so it works for any lab without edits:
 *
 *   - On a step page, the step list is read from the .step-sheet__list
 *     in the DOM (each <a.step-sheet__item href data-step> + .step-sheet__t).
 *   - On the index, each lab's list is read from its .lab-toc.
 *   - The lab id comes from <body data-lab="NN">. Pages that predate this
 *     attribute (the original Lab 01) default to "01", so their stored
 *     progress (workshop:lab-01:*) is preserved exactly.
 *
 * Progress is stored per lab; a single workshop:last pointer drives the
 * index resume banner across every lab.
 *
 * Reads <body data-page="index"> on the index, <body data-step="NN"> on
 * step pages.
 */

(function () {
  'use strict';

  var LAST_KEY = 'workshop:last'; // JSON {lab, slug, n, title}

  // The one breakpoint that decides rail vs dialog. Must match the
  // 940px media query in workshop-nav.css, which is set by the prompt
  // width budget, not by a round number.
  var docked = window.matchMedia('(min-width: 940px)');

  function labOf(el) {
    return (el && el.dataset && el.dataset.lab) ? el.dataset.lab : '01';
  }
  function keysFor(lab) {
    return {
      visited: 'workshop:lab-' + lab + ':visited',
      current: 'workshop:lab-' + lab + ':current'
    };
  }
  function basename(href) {
    if (!href) return '';
    return href.split('/').pop().split('#')[0].split('?')[0];
  }

  /* ─────────── registries (read from the DOM, not hardcoded) ─────────── */
  function stepsFromSheet() {
    var steps = [];
    document.querySelectorAll('.step-sheet__list .step-sheet__item').forEach(function (el) {
      var t = el.querySelector('.step-sheet__t');
      steps.push({
        n: el.dataset.step,
        slug: basename(el.getAttribute('href')),
        title: t ? t.textContent.trim() : ''
      });
    });
    return steps;
  }
  function stepsFromToc(tocEl) {
    var steps = [];
    tocEl.querySelectorAll('a[data-slug]').forEach(function (a) {
      var nEl = a.querySelector('.n');
      var tEl = a.querySelector('.t');
      steps.push({
        n: nEl ? nEl.textContent.trim() : '',
        slug: a.dataset.slug,
        title: tEl ? tEl.textContent.trim() : ''
      });
    });
    return steps;
  }
  function findBySlug(steps, slug) {
    for (var i = 0; i < steps.length; i++) if (steps[i].slug === slug) return { step: steps[i], i: i };
    return null;
  }

  /* ─────────── storage ─────────── */
  function readVisited(keys) {
    try { return new Set((localStorage.getItem(keys.visited) || '').split(',').filter(Boolean)); }
    catch (e) { return new Set(); }
  }
  function writeVisited(keys, set) {
    try { localStorage.setItem(keys.visited, Array.from(set).join(',')); } catch (e) {}
  }
  function readCurrent(keys) { try { return localStorage.getItem(keys.current) || ''; } catch (e) { return ''; } }
  function writeCurrent(keys, slug) { try { localStorage.setItem(keys.current, slug); } catch (e) {} }
  function writeLast(obj) { try { localStorage.setItem(LAST_KEY, JSON.stringify(obj)); } catch (e) {} }
  function readLast() { try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch (e) { return null; } }
  function resetAll() {
    try {
      var kill = [LAST_KEY, 'wcc-setup-done'];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('workshop:') === 0) kill.push(k);
      }
      kill.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  /* ─────────── docked rail vs bottom-sheet dialog ─────────── */
  /* Same markup, two presentations. Docked, the sheet is a static
     sidebar: it must not claim to be a modal dialog, must stay
     visible, and must not leave the body scroll-locked. Switching
     modes only rewrites attributes, so a participant who re-tiles
     the terminal mid-step keeps their scroll position. */
  function applyMode() {
    var sheet = document.getElementById('step-sheet');
    var trigger = document.querySelector('.sheet-trigger');
    if (!sheet) return;

    if (docked.matches) {
      sheet.hidden = false;
      sheet.removeAttribute('role');
      sheet.removeAttribute('aria-modal');
      sheet.removeAttribute('aria-labelledby');
      sheet.setAttribute('aria-label', 'Steps');
      document.body.style.overflow = '';
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    } else {
      sheet.hidden = true;
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-labelledby', 'step-sheet-title');
      sheet.removeAttribute('aria-label');
    }
  }

  /* ─────────── paint the step rows (rail and dialog) + progress label ─────────── */
  function paintSheet(steps, visited, currentNum) {
    document.querySelectorAll('.step-sheet__item').forEach(function (el) {
      var slug = basename(el.getAttribute('href'));
      var n = el.dataset.step;
      el.classList.toggle('is-current', n === currentNum);
      el.classList.toggle('is-done', visited.has(slug) && n !== currentNum);
    });
    var progEl = document.querySelector('.step-sheet__sub [data-progress]');
    if (progEl) {
      // "visited", not "done": we only know the page was opened, and the
      // pass checks (and the sticker board) own completion.
      var done = 0;
      steps.forEach(function (s) { if (visited.has(s.slug)) done++; });
      progEl.textContent = done + ' of ' + steps.length + ' visited';
    }
  }

  /* ─────────── the rail's summary line ─────────── */
  /* Two lines joined with a newline: where you are, and how long this
     step is meant to take. .step-sheet__sum sets white-space:
     pre-line, so the newline renders as a line break. Both lookups
     are optional; a page missing either just gets less text. */
  function paintSummary(steps, currentNum) {
    var sumEl = document.querySelector('.step-sheet__panel [data-sum]');
    if (!sumEl) return;

    var n = 0;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].n === currentNum) { n = i + 1; break; }
    }

    var item = null;
    document.querySelectorAll('.step-sheet__list .step-sheet__item').forEach(function (el) {
      if (el.dataset.step === currentNum) item = el;
    });
    var minutes = item ? item.getAttribute('data-min') : '';

    var lines = [];
    if (n) lines.push('you are here: ' + n + ' of ' + steps.length);
    if (minutes) lines.push('~' + minutes + ' min');
    sumEl.textContent = lines.join('\n');
  }

  /* ─────────── bottom-sheet open/close + swipe-down (dialog mode only) ─────────── */
  function wireSheet() {
    var trigger = document.querySelector('.sheet-trigger');
    var sheet = document.getElementById('step-sheet');
    if (!trigger || !sheet) return;

    var panel = sheet.querySelector('.step-sheet__panel');
    var lastFocus = null;

    function open() {
      if (docked.matches) return;   // the rail is always open; nothing to toggle
      lastFocus = document.activeElement;
      sheet.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var first = sheet.querySelector('.step-sheet__item');
      if (first) setTimeout(function () { first.focus(); }, 50);
    }
    function close() {
      if (docked.matches) return;   // closing the rail would hide the schedule
      sheet.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      sheet.hidden ? open() : close();
    });

    sheet.addEventListener('click', function (e) {
      if (e.target.matches('[data-close]') || e.target.closest('[data-close]')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (docked.matches) return;   // Escape has nothing to dismiss on the rail
      if (e.key === 'Escape' && !sheet.hidden) { close(); trigger.focus(); }
    });

    sheet.addEventListener('keydown', function (e) {
      // offsetParent excludes any row the rail is not showing: focus
      // cannot go to a display:none row, and stepping onto one stalls.
      var items = Array.from(sheet.querySelectorAll('.step-sheet__item'))
        .filter(function (el) { return el.offsetParent !== null; });
      var idx = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        var next = items[(idx + 1) % items.length];
        if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = items[(idx - 1 + items.length) % items.length];
        if (prev) prev.focus();
      }
    });

    var startY = null;
    var swipeArea = panel && panel.querySelector('.step-sheet__handle');
    if (swipeArea) {
      swipeArea.addEventListener('touchstart', function (e) { startY = e.touches[0].clientY; }, { passive: true });
      swipeArea.addEventListener('touchmove', function (e) {
        if (startY === null) return;
        var dy = e.touches[0].clientY - startY;
        if (dy > 60) { close(); startY = null; }
      }, { passive: true });
      swipeArea.addEventListener('touchend', function () { startY = null; }, { passive: true });
    }
  }

  /* ─────────── ←/→ keyboard nav between steps ─────────── */
  function wireKeyboardNav(steps, currentSlug) {
    var found = findBySlug(steps, currentSlug);
    if (!found) return;
    var i = found.i;
    wireArrows(i > 0 ? steps[i - 1].slug : null,
               i < steps.length - 1 ? steps[i + 1].slug : null);
  }

  /* The arrows themselves. Split out of wireKeyboardNav so a stop that
     is not in the numbered list (break.html) can take its two targets
     from its own step-bar instead of from the step registry. */
  function wireArrows(prev, next) {
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      // Only an OPEN dialog swallows the arrows. The docked rail is
      // never hidden, so testing .hidden alone would kill step nav at
      // 900px and up, which is where most of the workshop happens.
      var sheet = document.getElementById('step-sheet');
      if (!docked.matches && sheet && !sheet.hidden) return;
      if (e.key === 'ArrowLeft' && prev) window.location.href = prev;
      else if (e.key === 'ArrowRight' && next) window.location.href = next;
    });
  }
  function hrefOf(sel) {
    var el = document.querySelector(sel);
    return el ? el.getAttribute('href') : null;
  }

  /* ─────────── step page init ─────────── */
  /* Also runs the break, which carries data-step="break": a stop that
     owns a row in the sheet but no number in it. It gets the rail, the
     menu and the arrows, and writes no progress. Counting it would put
     a visit on a page where nothing was built, and the early return
     this replaces left that page with an unwired dialog. */
  function initStepPage() {
    var num = document.body.dataset.step;
    if (!num) return;
    var lab = labOf(document.body);
    var keys = keysFor(lab);
    var steps = stepsFromSheet();
    var found = findByNum(steps, num);
    var visited = readVisited(keys);

    if (found) {
      var slug = found.step.slug;
      visited.add(slug);
      writeVisited(keys, visited);
      writeCurrent(keys, slug);
      writeLast({ lab: lab, slug: slug, n: found.step.n, title: found.step.title });
    }

    paintSheet(steps, visited, found ? num : '');
    paintSummary(steps, found ? num : '');
    wireSheet();
    applyMode();
    docked.addEventListener('change', applyMode);
    if (found) wireKeyboardNav(steps, found.step.slug);
    else wireArrows(hrefOf('.step-bar__btn--prev'), hrefOf('.step-bar__btn--next'));
  }
  function findByNum(steps, n) {
    for (var i = 0; i < steps.length; i++) if (steps[i].n === n) return { step: steps[i], i: i };
    return null;
  }

  /* ─────────── index init (handles every lab card) ─────────── */
  function initIndex() {
    // Per-lab cards: paint the TOC rows, and the progress counter and
    // start/resume CTA where they exist. On the live index only the
    // rows are painted: the run sheet carries progress in the rows
    // themselves, so it has no .lab-card__progress and no
    // .lab-card__cta-btn, and those two branches no-op there by
    // design. They still fire on archive/index-two-labs.html, which
    // has both and loads this file. A missing CTA on index.html is
    // not a bug; do not add one to satisfy this code.
    document.querySelectorAll('.lab-card[data-lab]').forEach(function (card) {
      var lab = card.dataset.lab;
      var keys = keysFor(lab);
      var toc = card.querySelector('.lab-toc');
      var steps = toc ? stepsFromToc(toc) : [];
      var visited = readVisited(keys);
      var current = readCurrent(keys);

      if (toc) {
        toc.querySelectorAll('a[data-slug]').forEach(function (a) {
          var slug = a.dataset.slug;
          a.classList.toggle('is-current', slug === current);
          a.classList.toggle('is-done', visited.has(slug) && slug !== current);
        });
      }

      // Archived two-lab index only; see the note at the top of initIndex.
      var progressEl = card.querySelector('.lab-card__progress');
      if (progressEl && steps.length) {
        var done = 0;
        steps.forEach(function (s) { if (visited.has(s.slug)) done++; });
        progressEl.textContent = done + ' of ' + steps.length + ' visited';
      }

      // Archived two-lab index only; see the note at the top of initIndex.
      var cta = card.querySelector('.lab-card__cta-btn[data-cta="start"]');
      if (cta && current && visited.size > 0) {
        var step = findBySlug(steps, current);
        if (step) {
          cta.setAttribute('href', current);
          cta.classList.add('is-resume');
          var labelEl = cta.querySelector('.label');
          if (labelEl) labelEl.textContent = 'Resume at ' + step.step.n;
        }
      }
    });

    paintReset();

    // Global resume banner: the retired index component, still live on
    // the archived two-lab page. The run bar replaced it here.
    var bar = document.querySelector('.resume-bar');
    var last = readLast();
    if (bar && last && last.slug) {
      bar.hidden = false;
      var link = bar.querySelector('.resume-bar__link');
      if (link) {
        link.setAttribute('href', last.slug);
        var n = link.querySelector('.n');
        var t = link.querySelector('.t');
        if (n) n.textContent = last.n || '';
        if (t) t.textContent = last.title || '';
      }
    }

    var resetBtn = document.querySelector('.resume-bar__clear');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () { resetAll(); location.reload(); });
    }
  }

  /* ─────────── the index reset ───────────
     The index paints progress into the rows themselves (a tick when a
     step is done, the blue row for the current one), so the only
     control it needs is the one the rows cannot carry: wiping that
     progress. It stays hidden until there is progress to wipe. */
  function paintReset() {
    var wrap = document.querySelector('[data-reset]');
    var toc = document.querySelector('.lab-toc');
    if (!wrap || !toc) return;
    var card = toc.parentNode;
    while (card && !(card.classList && card.classList.contains('lab-card'))) card = card.parentNode;
    var visited = readVisited(keysFor(card && card.dataset.lab ? card.dataset.lab : '01'));
    if (!visited.size) return;
    wrap.hidden = false;
    var btn = wrap.querySelector('[data-run-clear]');
    if (btn) btn.addEventListener('click', function () { resetAll(); location.reload(); });
  }

  /* ─────────── prompt-card copy buttons (any page) ─────────── */
  /* One shared handler instead of a per-page inline script. Binds to
     every .prompt-card that has a .copy-btn and a [data-prompt] body. */
  function wireCopyButtons() {
    document.querySelectorAll('.prompt-card').forEach(function (card) {
      var btn = card.querySelector('.copy-btn');
      var body = card.querySelector('[data-prompt]');
      var count = card.querySelector('[data-count]');
      if (!btn || !body) return;
      var text = body.textContent;
      if (count) {
        count.textContent = text.split('\n').length + ' lines · ' + text.length + ' chars';
      }
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(text).catch(function () {
          var ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta);
        });
        btn.classList.add('copied');
        var labelEl = btn.querySelector('.label');
        var original = labelEl ? labelEl.textContent : '';
        if (labelEl) labelEl.textContent = 'Copied to clipboard';
        setTimeout(function () {
          btn.classList.remove('copied');
          if (labelEl) labelEl.textContent = original;
        }, 2200);
      });
    });
  }

  /* ─────────── boot ─────────── */
  function tryInit() {
    var page = document.body.dataset.page;
    if (page === 'index' && document.querySelector('.lab-toc')) { initIndex(); return true; }
    if (document.body.dataset.step && document.querySelector('.sheet-trigger')) { initStepPage(); return true; }
    return false;
  }
  function boot() {
    wireCopyButtons();
    if (tryInit()) return;
    var obs = new MutationObserver(function () { if (tryInit()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 5000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
