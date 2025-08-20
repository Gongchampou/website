/* Shared JS for Education Website */
(function () {
  const LS_KEYS = {
    theme: 'edu_theme',
    textSize: 'edu_text_size',
    bgColor: 'edu_bg_color',
    textColor: 'edu_text_color',
    sidebarCollapsed: 'edu_sidebar_collapsed',
    
    iconSize: 'edu_icon_size',
    hideImages: 'edu_hide_images',
    compactHeader: 'edu_compact_header',
    noStickyHeader: 'edu_no_sticky_header',
    flatCards: 'edu_flat_cards',
    reduceMotion: 'edu_reduce_motion',
    hideSearch: 'edu_hide_search',
    denseUI: 'edu_dense_ui',
    cardsPerRow: 'edu_cards_per_row',
    thumbSize: 'edu_thumb_size',
    cardRadius: 'edu_card_radius',
    sectionGap: 'edu_section_gap',
    // Stopwatch persistence
    swStart: 'edu_sw_start',      // epoch ms when current run started
    swElapsed: 'edu_sw_elapsed',  // accumulated ms from previous sessions
    swRunning: 'edu_sw_running'   // 'true' if currently running
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function loadPreferences() {
    return {
      theme: localStorage.getItem(LS_KEYS.theme) || 'day',
      textSize: parseFloat(localStorage.getItem(LS_KEYS.textSize) || '1'),
      bgColor: localStorage.getItem(LS_KEYS.bgColor) || '',
      textColor: localStorage.getItem(LS_KEYS.textColor) || 'default',
      sidebarCollapsed: localStorage.getItem(LS_KEYS.sidebarCollapsed) === 'true',
      iconSize: parseInt(localStorage.getItem(LS_KEYS.iconSize) || '22', 10),
      hideImages: localStorage.getItem(LS_KEYS.hideImages) === 'true',
      compactHeader: localStorage.getItem(LS_KEYS.compactHeader) === 'true',
      noStickyHeader: localStorage.getItem(LS_KEYS.noStickyHeader) === 'true',
      flatCards: localStorage.getItem(LS_KEYS.flatCards) === 'true',
      reduceMotion: localStorage.getItem(LS_KEYS.reduceMotion) === 'true',
      hideSearch: localStorage.getItem(LS_KEYS.hideSearch) === 'true',
      denseUI: localStorage.getItem(LS_KEYS.denseUI) === 'true',
      cardsPerRow: localStorage.getItem(LS_KEYS.cardsPerRow) || '5',
      thumbSize: localStorage.getItem(LS_KEYS.thumbSize) || 'normal',
      cardRadius: parseInt(localStorage.getItem(LS_KEYS.cardRadius) || '12', 10),
      sectionGap: parseInt(localStorage.getItem(LS_KEYS.sectionGap) || '12', 10),
      pagePadding: parseInt(localStorage.getItem(LS_KEYS.pagePadding) || '16', 10)
    };
  }

  // Apply sidebar icon size to CSS variables
  function applyIconSize(px) {
    const clamped = Math.max(16, Math.min(34, Number(px) || 22));
    const root = document.documentElement;
    root.style.setProperty('--icon-size', clamped + 'px');
  }

  // Sidebar dropdowns (Book, Question)
  function initSidebarDropdowns() {
    const menus = $$('.nav .menu');
    if (!menus.length) return;
    menus.forEach(menu => {
      const toggle = menu.querySelector('.menu-toggle');
      if (!toggle) return;
      // Derive a stable storage key from button title or label
      const keyBase = (toggle.getAttribute('title') || toggle.querySelector('.label')?.textContent || 'menu')
        .trim().toLowerCase();
      const storeKey = 'edu_menu_open_' + keyBase;

      // Restore saved state
      const savedOpen = localStorage.getItem(storeKey) === 'true';
      if (savedOpen) {
        menu.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      } else {
        toggle.setAttribute('aria-expanded', 'false');
      }

      // Toggle and persist state (do not auto-close others)
      toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
        try { localStorage.setItem(storeKey, String(open)); } catch (_) {}
      });
    });
  }

  // Persistent Stopwatch (continues across refresh until stopped)
  function initStopwatch() {
    const wrap = $('#dashboard-stopwatch');
    if (!wrap) return;
    const timeEl = wrap.querySelector('.sw-time');
    const btnStart = wrap.querySelector('.sw-start');
    const btnStop = wrap.querySelector('.sw-stop');
    const btnReset = wrap.querySelector('.sw-reset');

    const getNow = () => Date.now();
    const readState = () => ({
      start: parseInt(localStorage.getItem(LS_KEYS.swStart) || '0', 10) || 0,
      elapsed: parseInt(localStorage.getItem(LS_KEYS.swElapsed) || '0', 10) || 0,
      running: localStorage.getItem(LS_KEYS.swRunning) === 'true'
    });
    const writeState = (s) => {
      localStorage.setItem(LS_KEYS.swStart, String(s.start || 0));
      localStorage.setItem(LS_KEYS.swElapsed, String(s.elapsed || 0));
      localStorage.setItem(LS_KEYS.swRunning, String(!!s.running));
    };
    const fmt = (ms) => {
      const total = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    let state = readState();
    let rafId = 0;

    const updateButtons = () => {
      if (!btnStart || !btnStop) return;
      if (state.running) {
        btnStart.disabled = true;
        btnStop.disabled = false;
      } else {
        btnStart.disabled = false;
        btnStop.disabled = true;
      }
    };

    const render = () => {
      const base = state.elapsed;
      const extra = state.running && state.start ? (getNow() - state.start) : 0;
      const total = base + extra;
      if (timeEl) timeEl.textContent = fmt(total);
    };

    const tick = () => {
      render();
      if (state.running) rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (state.running) return;
      state.start = getNow();
      state.running = true;
      writeState(state);
      updateButtons();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!state.running) return;
      const now = getNow();
      state.elapsed = state.elapsed + (now - (state.start || now));
      state.start = 0;
      state.running = false;
      writeState(state);
      updateButtons();
      cancelAnimationFrame(rafId);
      render();
    };
    const reset = () => {
      state.elapsed = 0;
      // If running, keep running from now
      if (state.running) state.start = getNow();
      writeState(state);
      render();
    };

    // Wire events
    if (btnStart) btnStart.addEventListener('click', start);
    if (btnStop) btnStop.addEventListener('click', stop);
    if (btnReset) btnReset.addEventListener('click', reset);

    // Initial paint and resume loop
    updateButtons();
    render();
    if (state.running) rafId = requestAnimationFrame(tick);
  }

  // Dashboard digital clock (robot/monospace style in CSS)
  function initDashboardClock() {
    const el = $('#dashboard-clock');
    if (!el) return;
    const pad = (n) => String(n).padStart(2, '0');
    const update = () => {
      const now = new Date();
      const hr24 = now.getHours();
      const h12 = hr24 % 12 || 12;
      const ampm = hr24 >= 12 ? 'PM' : 'AM';
      const h = pad(h12);
      const m = pad(now.getMinutes());
      const s = pad(now.getSeconds());
      el.textContent = `${h}:${m}:${s} ${ampm}`;
      el.setAttribute('title', now.toLocaleString());
    };
    update();
    setInterval(update, 1000);
  }

  function savePreference(key, value) {
    localStorage.setItem(key, String(value));
  }

  function applyTheme(theme) {
    const html = document.documentElement;
    html.classList.remove('theme-dark', 'theme-cb');
    if (theme === 'night') html.classList.add('theme-dark');
    if (theme === 'cb') html.classList.add('theme-cb');
    // Update toggle state
    $$('.theme-toggle button').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
  }

  function applyTextSize(scale) {
    document.documentElement.style.setProperty('font-size', (16 * scale) + 'px');
  }

  function applyBackground(color) {
    if (color) document.body.style.background = color; else document.body.style.removeProperty('background');
  }

  function applyTextColor(val) {
    // Map predefined solid colors
    const map = {
      default: '',
      black: '#000000',
      slate: '#0f172a',   // slate-900
      gray: '#111827',    // gray-900
      navy: '#0a1a2b',    // navy
      blue: '#1e3a8a',    // blue-800
      teal: '#0f766e',    // teal-700
      green: '#14532d',   // green-900
      emerald: '#065f46', // emerald-800
      olive: '#3f4f1f',   // custom olive
      red: '#7f1d1d',     // red-900
      maroon: '#4a0e0e',  // maroon
      orange: '#7c2d12',  // orange-900
      brown: '#3e2723',   // deep brown
      purple: '#3b0764',  // purple-900
      indigo: '#312e81'   // indigo-900
    };
    const hex = map[String(val)] ?? '';
    const root = document.documentElement;
    if (hex) {
      root.style.setProperty('--text', hex);
    } else {
      // revert to theme default
      root.style.removeProperty('--text');
    }
  }

  function setSidebarCollapsed(collapsed, persist = true) {
    const sidebar = $('.sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', collapsed);
    document.documentElement.classList.toggle('sidebar-collapsed', !!collapsed);
    if (persist) savePreference(LS_KEYS.sidebarCollapsed, collapsed);
  }

  function applyClass(toggle, className) {
    document.documentElement.classList.toggle(className, !!toggle);
  }

  function applyCardsPerRow(val) {
    const html = document.documentElement;
    ['cpr-2','cpr-3','cpr-4','cpr-5'].forEach(c => html.classList.remove(c));
    const allowed = ['2','3','4','5'];
    const v = allowed.includes(String(val)) ? String(val) : '5';
    html.classList.add('cpr-' + v);
  }

  function applyThumbSize(val) {
    const html = document.documentElement;
    html.classList.remove('thumb-sm', 'thumb-lg');
    if (val === 'sm') html.classList.add('thumb-sm');
    if (val === 'lg') html.classList.add('thumb-lg');
  }

  function applyRadius(px) {
    const clamped = Math.max(6, Math.min(22, Number(px) || 12));
    document.documentElement.style.setProperty('--radius', clamped + 'px');
  }

  function applySectionGap(px) {
    const clamped = Math.max(4, Math.min(40, Number(px) || 12));
    document.documentElement.style.setProperty('--section-gap', clamped + 'px');
  }

  

  function applyPagePadding(px) {
    const n = Number(px);
    const clamped = Math.max(0, Math.min(30, Number.isFinite(n) ? n : 16));
    document.documentElement.style.setProperty('--page-padding', clamped + 'px');
  }

  

  function initHamburger() {
    const sidebar = $('.sidebar');
    const btn = $('.hamburger');
    if (!btn || !sidebar) return;
    btn.addEventListener('click', () => setSidebarCollapsed(!sidebar.classList.contains('collapsed')));
  }

  // Tooltips when sidebar is collapsed
  function initSidebarTooltips() {
    const sidebar = $('.sidebar');
    if (!sidebar) return;
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);

    function showTip(e, text) {
      tooltip.textContent = text;
      const rect = e.currentTarget.getBoundingClientRect();
      tooltip.style.top = (rect.top + rect.height / 2 - 16) + 'px';
      tooltip.style.left = (rect.right + 10) + 'px';
      tooltip.classList.add('show');
    }
    function hideTip() { tooltip.classList.remove('show'); }

    $$('.nav a').forEach(a => {
      const label = a.querySelector('.label')?.textContent || a.title || a.getAttribute('aria-label') || '';
      a.addEventListener('mouseenter', (e) => {
        if (sidebar.classList.contains('collapsed') || window.innerWidth <= 820) showTip(e, label);
      });
      a.addEventListener('mouseleave', hideTip);
      a.addEventListener('focus', (e) => { if (sidebar.classList.contains('collapsed')) showTip(e, label); });
      a.addEventListener('blur', hideTip);
    });
  }

  function initActiveNav() {
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('.nav a').forEach(a => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      const hrefFile = href.split('/').pop();
      const isHome = path === '' || path === 'index.html';
      if ((isHome && (hrefFile === '' || hrefFile === 'index.html')) || hrefFile === path) {
        a.classList.add('active');
      }
    });
  }

  function initThemeToggle(preferences) {
    $$('.theme-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.theme;
        savePreference(LS_KEYS.theme, v);
        applyTheme(v);
      });
    });
    // set initial active
    $$('.theme-toggle button').forEach(btn => btn.classList.toggle('active', btn.dataset.theme === preferences.theme));
  }

  function initCards() {
    const grid = $('.card-grid');
    if (!grid) return;
    // If HTML already includes cards, we do nothing. Cards are authored per page.
    // This function intentionally left minimal to avoid auto-generating content.
    return;
  }

  // Dashboard counters: fetch each section page and count its cards
  async function initDashboardCounters() {
    // Only run on dashboard (index.html)
    const isDashboard = (location.pathname.split('/').pop() || 'index.html').toLowerCase() === 'index.html';
    if (!isDashboard) return;
    const stats = $$('.card.stat[data-target]');
    if (!stats.length) return;

    const parseAndCount = (htmlText) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        // Count realistic content cards; exclude stat cards if any
        const cards = doc.querySelectorAll('.card-grid .card:not(.stat)');
        return cards.length || 0;
      } catch (e) {
        return 0;
      }
    };

    stats.forEach(async (node) => {
      const url = node.getAttribute('data-target');
      const countEl = node.querySelector('.stat-count');
      if (!url || !countEl) return;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        const n = parseAndCount(text);
        countEl.textContent = String(n);
      } catch (err) {
        countEl.textContent = '0';
      }
    });
  }

  function initSettingsPage(pref) {
    const form = $('#settings-form');
    if (!form) return;
    const themeSel = $('#setting-theme');
    const textRange = $('#setting-text');
    const bgInput = $('#setting-bg');
    const textColorSel = $('#setting-text-color');
    const sidebarChk = $('#setting-sidebar');
    const hideImages = $('#setting-hide-images');
    const compactHeader = $('#setting-compact-header');
    const noStickyHeader = $('#setting-no-sticky-header');
    const flatCards = $('#setting-flat-cards');
    const reduceMotion = $('#setting-reduce-motion');
    const hideSearch = $('#setting-hide-search');
    const denseUI = $('#setting-dense-ui');
    const cprSel = $('#setting-cpr');
    const thumbSel = $('#setting-thumb');
    const radiusRange = $('#setting-radius');
    const sectionGapRange = $('#setting-section-gap');
    const pagePaddingRange = $('#setting-page-padding');
    const iconSizeRange = $('#setting-icon-size');

    // set initial values
    if (themeSel) themeSel.value = pref.theme;
    if (textRange) textRange.value = pref.textSize;
    if (bgInput) bgInput.value = pref.bgColor || '#ffffff';
    if (textColorSel) textColorSel.value = pref.textColor || 'default';
    if (sidebarChk) sidebarChk.checked = !!pref.sidebarCollapsed;
    if (hideImages) hideImages.checked = !!pref.hideImages;
    if (compactHeader) compactHeader.checked = !!pref.compactHeader;
    if (noStickyHeader) noStickyHeader.checked = !!pref.noStickyHeader;
    if (flatCards) flatCards.checked = !!pref.flatCards;
    if (reduceMotion) reduceMotion.checked = !!pref.reduceMotion;
    if (hideSearch) hideSearch.checked = !!pref.hideSearch;
    if (denseUI) denseUI.checked = !!pref.denseUI;
    if (cprSel) cprSel.value = String(pref.cardsPerRow || '5');
    if (thumbSel) thumbSel.value = pref.thumbSize || 'normal';
    if (radiusRange) radiusRange.value = String(pref.cardRadius || 12);
    if (sectionGapRange) sectionGapRange.value = String(pref.sectionGap || 12);
    if (pagePaddingRange) pagePaddingRange.value = String((pref.pagePadding !== undefined && pref.pagePadding !== null) ? pref.pagePadding : 16);
    if (iconSizeRange) iconSizeRange.value = String(pref.iconSize || 22);

    // Change theme only when the theme selector itself changes
    if (themeSel) {
      themeSel.addEventListener('change', () => {
        const v = themeSel.value;
        savePreference(LS_KEYS.theme, v);
        applyTheme(v);
      });
    }

    form.addEventListener('input', (e) => {
      const ts = parseFloat(textRange.value || '1');
      const bg = bgInput.value;
      const tc = (textColorSel && textColorSel.value) || 'default';
      const sc = sidebarChk.checked;
      const hi = !!(hideImages && hideImages.checked);
      const ch = !!(compactHeader && compactHeader.checked);
      const ns = !!(noStickyHeader && noStickyHeader.checked);
      const fc = !!(flatCards && flatCards.checked);
      const rm = !!(reduceMotion && reduceMotion.checked);
      const hs = !!(hideSearch && hideSearch.checked);
      const du = !!(denseUI && denseUI.checked);
      const cpr = (cprSel && cprSel.value) || '5';
      const th = (thumbSel && thumbSel.value) || 'normal';
      const rad = parseInt((radiusRange && radiusRange.value) || '12', 10);
      const sg = parseInt((sectionGapRange && sectionGapRange.value) || '12', 10);
      const pp = parseInt((pagePaddingRange && pagePaddingRange.value) || '16', 10);
      const isz = parseInt((iconSizeRange && iconSizeRange.value) || '22', 10);
      savePreference(LS_KEYS.textSize, ts);
      savePreference(LS_KEYS.bgColor, bg);
      savePreference(LS_KEYS.textColor, tc);
      savePreference(LS_KEYS.sidebarCollapsed, sc);
      savePreference(LS_KEYS.hideImages, hi);
      savePreference(LS_KEYS.compactHeader, ch);
      savePreference(LS_KEYS.noStickyHeader, ns);
      savePreference(LS_KEYS.flatCards, fc);
      savePreference(LS_KEYS.reduceMotion, rm);
      savePreference(LS_KEYS.hideSearch, hs);
      savePreference(LS_KEYS.denseUI, du);
      savePreference(LS_KEYS.cardsPerRow, cpr);
      savePreference(LS_KEYS.thumbSize, th);
      savePreference(LS_KEYS.cardRadius, rad);
      savePreference(LS_KEYS.sectionGap, sg);
      savePreference(LS_KEYS.pagePadding, pp);
      savePreference(LS_KEYS.iconSize, isz);
      applyTextSize(ts);
      applyBackground(bg);
      applyTextColor(tc);
      setSidebarCollapsed(sc, false);
      applyClass(hi, 'hide-images');
      applyClass(ch, 'compact-header');
      applyClass(ns, 'no-sticky-header');
      applyClass(fc, 'flat-cards');
      applyClass(rm, 'reduce-motion');
      applyClass(hs, 'hide-search');
      applyClass(du, 'dense-ui');
      applyCardsPerRow(cpr);
      applyThumbSize(th);
      applyRadius(rad);
      applySectionGap(sg);
      applyPagePadding(pp);
      applyIconSize(isz);
    });
  }

  function applyPreferences(pref) {
    applyTheme(pref.theme);
    applyTextSize(pref.textSize);
    applyBackground(pref.bgColor);
    applyTextColor(pref.textColor);
    applyIconSize(pref.iconSize);
    setSidebarCollapsed(pref.sidebarCollapsed, false);
    applyClass(pref.hideImages, 'hide-images');
    applyClass(pref.compactHeader, 'compact-header');
    applyClass(pref.noStickyHeader, 'no-sticky-header');
    applyClass(pref.flatCards, 'flat-cards');
    applyClass(pref.reduceMotion, 'reduce-motion');
    applyClass(pref.hideSearch, 'hide-search');
    applyClass(pref.denseUI, 'dense-ui');
    applyCardsPerRow(pref.cardsPerRow);
    applyThumbSize(pref.thumbSize);
    applyRadius(pref.cardRadius);
    applySectionGap(pref.sectionGap);
    applyPagePadding(pref.pagePadding);
  }

  function init() {
    const pref = loadPreferences();
    applyPreferences(pref);
    initHamburger();
    initSidebarTooltips();
    initActiveNav();
    initThemeToggle(pref);
    initCards();
    initDashboardCounters();
    initDashboardClock();
    initStopwatch();
    initSettingsPage(pref);
    initSidebarDropdowns();
    initAntiInspect();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

// Anti-inspect and deterrents
function initAntiInspect() {
  // Shared throttle for alerts
  let lastAlert = 0;

  // Block context menu and alert (throttled)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastAlert > 2000) { // at most every 2s
      lastAlert = now;
      backToWorkAlert();
    }
  });

  // Block common shortcuts (best-effort only)
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const sh = e.shiftKey;
    // F12, Ctrl+Shift+I/J/C, Ctrl+U
    if (k === 'f12' || (ctrl && sh && ['i','j','c'].includes(k)) || (ctrl && k === 'u')) {
      e.preventDefault(); e.stopPropagation();
      backToWorkAlert();
    }
  }, true);

  // Detect devtools open by viewport deltas (heuristic)
  const check = () => {
    const wDelta = Math.abs(window.outerWidth - window.innerWidth);
    const hDelta = Math.abs(window.outerHeight - window.innerHeight);
    const open = wDelta > 160 || hDelta > 160;
    document.documentElement.classList.toggle('devtools-open', open);
    const now = Date.now();
    if (open && now - lastAlert > 5000) { // warn at most every 5s
      lastAlert = now;
      backToWorkAlert();
    }
  };
  setInterval(check, 800);
}

function backToWorkAlert() {
  try { alert('What are you doing? Focus on your work and your career 🙂🙂'); } catch (_) {}
}
