/* SupeRR Selector site: shared state, router, helpers. */
(function () {
  'use strict';
  const App = window.App = {};
  App.C = {
    navy: '#072B5C', navy2: '#0D3A78', navy3: '#041B3B', pink: '#EA1A85', pinkD: '#B5106A', pinkL: '#F7A8CF', pinkBg: '#FCE8F2',
    blue: '#2F6BD8', blueL: '#9DB8EC', orange: '#E0662E', gold: '#F2B035', ink: '#0B1B33', ink2: '#46556B', mute: '#5B6880',
    line: '#E1E0EA', grey: '#B8BFCC', track: '#ECEBF2', good: '#1F8A5B', bad: '#C2354A', mid: '#EEEDF3'
  };
  App.DB = {};
  App.state = {};
  App.SIDE = { bat: { one: 'Batter', many: 'Batters', val: 'Runs vs par', short: 'bat' }, bowl: { one: 'Bowler', many: 'Bowlers', val: 'Runs saved vs par', short: 'bowl' } };

  /* ---------- formatting ---------- */
  App.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  App.f = (v, d = 1) => (v == null || isNaN(v)) ? '–' : Number(v).toFixed(d);
  App.sg = (v, d = 1) => (v == null || isNaN(v)) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  App.int = v => d3.format(',')(Math.round(v));
  App.ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  App.team = t => t ? t : 'No IPL side';
  App.first = name => name.split(' ').slice(-1)[0];
  App.where = p => [App.team(p.team), p.country].filter(Boolean).join(' · ');

  /* ---------- tooltip ---------- */
  const tipEl = () => document.getElementById('tip');
  App.tipShow = (ev, html) => { const t = tipEl(); t.innerHTML = html; t.hidden = false; App.tipMove(ev); };
  App.tipMove = ev => {
    const t = tipEl(); if (t.hidden) return;
    const pad = 14, r = t.getBoundingClientRect();
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - pad;
    t.style.left = Math.max(8, x) + 'px'; t.style.top = Math.max(8, y) + 'px';
  };
  App.tipHide = () => { const t = tipEl(); if (t) t.hidden = true; };
  App.hover = (sel, html) => sel
    .on('pointerenter pointermove', function (ev, d) { App.tipShow(ev, html(d, this)); })
    .on('pointerleave', App.tipHide);
  window.addEventListener('scroll', () => App.tipHide(), { passive: true });

  /* ---------- lifecycle ---------- */
  const pages = {};
  let cleanups = [], resizers = [], lastW = 0, current = null;
  App.page = (name, fn) => { pages[name] = fn; };
  App.onCleanup = fn => cleanups.push(fn);
  App.onResize = fn => resizers.push(fn);
  window.addEventListener('resize', (() => {
    let t; return () => { clearTimeout(t); t = setTimeout(() => { const w = innerWidth; if (Math.abs(w - lastW) < 8) return; lastW = w; resizers.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }, 160); };
  })());

  /* a chart = a container that redraws itself at its own width */
  App.chart = (el, draw) => {
    const go = () => { el.innerHTML = ''; const w = Math.max(260, Math.floor(el.getBoundingClientRect().width)); draw(el, w); };
    go(); App.onResize(go); return go;
  };
  App.svg = (el, w, h, label) => d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h).attr('role', 'img').attr('aria-label', label || '');

  App.reveal = root => {
    const els = root.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -30px 0px', threshold: 0.01 });
    els.forEach(e => io.observe(e));
    App.onCleanup(() => io.disconnect());
  };
  App.reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  App.countUp = (el, to, dec = 0, dur = 1300, fmt) => {
    const f = fmt || (v => d3.format(',.' + dec + 'f')(v));
    if (App.reduced()) { el.textContent = f(to); return; }
    const t0 = performance.now(); let raf;
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = f(to * e); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    App.onCleanup(() => { cancelAnimationFrame(raf); });
  };
  App.countWhenSeen = (root) => {
    const els = root.querySelectorAll('[data-count]');
    const run = e => App.countUp(e, +e.dataset.count, +(e.dataset.dec || 0), 1400);
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { run(x.target); io.unobserve(x.target); } }), { threshold: 0.2 });
    els.forEach(e => io.observe(e));
    App.onCleanup(() => io.disconnect());
  };

  /* ---------- routing (plain #names only: letters, digits, hyphens) ---------- */
  function parse(h) {
    h = (h || '').replace(/^#/, '') || 'home';
    let m;
    if ((m = h.match(/^player-(bat|bowl)-(\d+)$/))) return { page: 'player', side: m[1], id: +m[2], nav: 'rankings' };
    if ((m = h.match(/^compare-(bat|bowl)-(\d+)-(\d+)$/))) return { page: 'compare', side: m[1], a: +m[2], b: +m[3], nav: 'compare' };
    if ((m = h.match(/^war-room-(bat|bowl)-(\d+)$/))) return { page: 'war-room', side: m[1], id: +m[2], nav: 'war-room' };
    if ((m = h.match(/^rankings-(bat|bowl)$/))) return { page: 'rankings', side: m[1], nav: 'rankings' };
    if (pages[h]) return { page: h, nav: h };
    return { page: 'home', nav: 'home' };
  }
  App.go = hash => { if (location.hash === '#' + hash) route(); else location.hash = hash; };
  App.soft = hash => { App._soft = true; location.hash = hash; };
  function route() {
    const r = parse(location.hash);
    const keep = App._soft && current && current.page === r.page; App._soft = false;
    cleanups.forEach(f => { try { f(); } catch (e) { } }); cleanups = []; resizers = [];
    App.tipHide();
    const main = document.getElementById('app');
    const y = window.scrollY;
    main.innerHTML = '';
    document.querySelectorAll('.nav-links a').forEach(a => {
      const on = a.dataset.route === r.nav; a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    try { pages[r.page](main, r); }
    catch (e) { console.error(e); main.innerHTML = '<div class="wrap section"><h2 class="h2">Something went wrong</h2><p class="lede">This view failed to draw. <a href="#home">Back to home</a>.</p></div>'; }
    lastW = innerWidth;
    App.reveal(main); App.countWhenSeen(main);
    if (keep) window.scrollTo(0, y);
    else { window.scrollTo(0, 0); if (current) main.focus({ preventScroll: true }); }
    current = r;
  }

  /* ---------- data ---------- */
  App.get = (side, id) => App.idx[side].get(id);
  App.byName = (side, name) => App.names[side].get(name);
  App.link = (side, p) => `#player-${side}-${p.id}`;
  App.start = async function () {
    try {
      const names = ['players', 'lab', 'warroom', 'method', 'meta', 'simbase'];
      const got = await Promise.all(names.map(n => fetch('data/' + n + '.json').then(r => { if (!r.ok) throw new Error(n + ' ' + r.status); return r.json(); })));
      names.forEach((n, i) => { App.DB[n] = got[i]; });
    } catch (e) {
      console.error(e);
      document.getElementById('app').innerHTML = '<div class="wrap section"><h2 class="h2">Data did not load</h2><p class="lede">Open this page from its web address (not as a local file) so the data files can load.</p></div>';
      return;
    }
    App.idx = {}; App.names = {};
    ['bat', 'bowl'].forEach(s => {
      App.idx[s] = new Map(App.DB.players[s].map(p => [p.id, p]));
      App.names[s] = new Map(App.DB.players[s].map(p => [p.name, p]));
    });
    window.addEventListener('hashchange', route);
    route();
  };

  /* ---------- small shared widgets ---------- */
  App.seg = (opts, val, onChange, label) => {
    const wrap = document.createElement('div'); wrap.className = 'seg'; wrap.setAttribute('role', 'group'); if (label) wrap.setAttribute('aria-label', label);
    opts.forEach(([v, txt]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.setAttribute('aria-pressed', String(v === val));
      b.addEventListener('click', () => { wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); onChange(v); });
      wrap.appendChild(b);
    });
    return wrap;
  };
  App.playerOptions = (side, sel) => App.DB.players[side].map(p => `<option value="${p.id}"${p.id === sel ? ' selected' : ''}>#${p.rank} ${App.esc(p.name)}${p.team ? ' · ' + App.esc(p.team) : ''}</option>`).join('');
  App.minibar = (v, max = 100) => `<span class="minibar" aria-hidden="true"><i style="width:${Math.max(2, Math.min(100, 100 * v / max))}%"></i></span>`;
})();
