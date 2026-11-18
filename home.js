/* Home: hero with the chase pressure map, ticker, top-10 podiums, insights, explore tiles. */
(function () {
  'use strict';
  const { esc, f, sg } = App;

  function pressureMap(el, w) {
    const C = App.C, heat = App.DB.lab.heat;
    const agg = d3.rollups(heat, v => ({ lev: d3.sum(v, d => d.lev * d.c) / d3.sum(v, d => d.c), wp: d3.sum(v, d => d.wp * d.c) / d3.sum(v, d => d.c), c: d3.sum(v, d => d.c) }), d => d.o, d => d.n);
    const cells = [];
    agg.forEach(([o, arr]) => arr.forEach(([n, v]) => cells.push({ o, n, ...v })));
    const m = { l: 34, r: 6, t: 8, b: 30 };
    const cw = (w - m.l - m.r) / 20, chh = Math.min(cw, 18) * 0.92, h = m.t + m.b + 20 * chh;
    const svg = App.svg(el, w, h, 'Chase pressure map: leverage by overs left and runs needed');
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
    const x = o => (20 - o) * cw, y = n => (19 - n) * chh;
    const col = d3.scaleSequentialSqrt([0, 2.2], d3.interpolateRgbBasis(['#173F7A', '#6B3C8F', C.pink, '#FFC2E0'])).clamp(true);
    const delay = App.reduced() ? () => 0 : d => (20 - d.o) * 45 + Math.random() * 160;
    g.selectAll('rect').data(cells).join('rect')
      .attr('x', d => x(d.o) + 1).attr('y', d => y(d.n) + 1)
      .attr('width', Math.max(1, cw - 2)).attr('height', Math.max(1, chh - 2)).attr('rx', 2.5)
      .attr('fill', d => col(d.lev)).attr('opacity', App.reduced() ? 1 : 0)
      .attr('class', d => d.lev > 1.6 ? 'hot' : null)
      .call(s => App.reduced() ? s : s.transition().delay(delay).duration(500).attr('opacity', 1))
      .call(s => App.hover(s, d => `<b>Need ${d.n * 10}–${d.n * 10 + 9} with ${d.o} over${d.o > 1 ? 's' : ''} left</b><span>Chasing side wins ${Math.round(d.wp * 100)}%</span><span>Leverage ${f(d.lev, 2)} · ${App.int(d.c)} balls</span>`));
    const ax = svg.append('g').attr('fill', '#9FB2D3').style('font-size', '11px');
    ax.append('text').attr('x', m.l).attr('y', h - 8).text('20 overs left');
    ax.append('text').attr('x', w - m.r).attr('y', h - 8).attr('text-anchor', 'end').text('1 over left →');
    ax.append('text').attr('transform', `translate(12,${m.t + 20 * chh}) rotate(-90)`).text('runs needed ↑');
  }

  App.page('home', (main) => {
    const D = App.DB, P = D.players, n = D.meta.n, W = D.warroom, M = D.method;
    const cd = W.diag['Close death']['2026'].bowl, cdb = W.diag['Close death']['2026'].bat;
    const r = s => d3.format('.2f')(pearson(P[s].map(p => p.normal), P[s].map(p => p.impact)));
    const both = s => P[s].filter(p => p.rank <= 10 && p.impact > 0 && p.normal > 0).length;
    const sh = M.shrink;
    const top = s => P[s].filter(p => p.rank <= 10);
    const tick = [...top('bat').map(p => `<span><b>${esc(p.name)}</b> strike rate ${f(p.p.sr)} under pressure · par ${f(p.p.xsr)}</span>`),
      ...top('bowl').map(p => `<span><b>${esc(p.name)}</b> economy ${f(p.p.econ, 2)} under pressure · par ${f(p.p.xecon, 2)}</span>`)];
    const ti = d3.shuffle(tick.slice()).join('<i aria-hidden="true">●</i>');

    main.innerHTML = `
<section class="hero dark">
  <div class="wrap hero-grid">
    <div>
      <p class="kicker">Rajasthan Royals · SupeRR Selector · Season 2 · Round 1</p>
      <h1 class="h1 mt-8">Who delivers when the game is <span>on the line?</span></h1>
      <p class="lede">A Pressure Reliability Index built from ${App.int(n.balls)} deliveries of IPL 2022–26 and T20I cricket: tag every pressure moment, measure each player against par, keep only the parts that repeat, and turn it into a plan for RR's 2027 squad.</p>
      <div class="hero-ctas">
        <a class="btn btn-pink" href="#rankings">See the top 10s</a>
        <a class="btn btn-ghost" href="#war-room">Run the finish simulator</a>
      </div>
    </div>
    <figure class="hero-map">
      <div class="chart" id="pmap"></div>
      <figcaption class="note">The chase pressure map: every square is a game state from the data. Brighter = one run or wicket swings the result more.</figcaption>
    </figure>
  </div>
  <div class="wrap">
    <div class="counters">
      <div class="counter"><b data-count="${n.balls}">0</b><span>deliveries analysed</span></div>
      <div class="counter"><b data-count="${n.matches}">0</b><span>matches</span></div>
      <div class="counter"><b data-count="${n.bat_qual + n.bowl_qual}">0</b><span>players ranked</span></div>
      <div class="counter"><b data-count="7">0</b><span>pressure states tagged</span></div>
    </div>
  </div>
</section>
<div class="ticker" aria-label="Top-10 pressure numbers"><div class="ticker-track"><div>${ti}</div><div aria-hidden="true">${ti}</div></div></div>

<section class="section">
  <div class="wrap">
    <div class="split reveal"><div><p class="kicker">The answer</p><h2 class="h2">The two top 10s</h2></div>
    <p class="note">PRI 2.0 on a 0–100 scale. Tap a player for the full profile.</p></div>
    <div class="grid g2 mt-24">
      <div class="reveal">${podium('bat')}</div>
      <div class="reveal">${podium('bowl')}</div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="reveal"><p class="kicker">What the data says</p><h2 class="h2">Three findings that shaped the index</h2></div>
    <div class="grid g3 mt-24">
      <a class="card card-link insight reveal" href="#rankings">
        <p class="pill">Clutch is mostly quality</p>
        <p class="big">r = ${r('bat')} · ${r('bowl')}</p>
        <p>Pressure value tracks normal value for batters and bowlers. ${both('bat')} of the top-10 batters and ${both('bowl')} of the top-10 bowlers beat par in both states.</p>
        <p class="note mt-8">See it on the scatter →</p>
      </a>
      <a class="card card-link insight reveal" href="#method">
        <p class="pill">Dismissals are noise</p>
        <p class="big">${sg(sh.bat.p.bc_out_adj.r, 2)} vs ${sg(sh.bat.p.bc_run_adj.r, 2)}</p>
        <p>Split-half repeatability of pressure dismissals vs pressure scoring. Scoring repeats, getting out does not, so PRI 2.0 shrinks each part by how much it repeats.</p>
        <p class="note mt-8">How the shrinkage works →</p>
      </a>
      <a class="card card-link insight reveal" href="#war-room">
        <p class="pill">RR's gap is overs 16–20</p>
        <p class="big">${f(cd.econ, 2)} vs ${f(cd.xecon, 2)}</p>
        <p>RR's close-death economy against par in IPL 2026, ${App.ord(cd.rank)} of 10. Their close-death batting was ${App.ord(cdb.rank)}. The first call in Goa is a death bowler.</p>
        <p class="note mt-8">Open the War Room →</p>
      </a>
    </div>
  </div>
</section>

<section class="section dark">
  <div class="wrap">
    <div class="reveal"><p class="kicker">PRI 2.0 in 30 seconds</p><h2 class="h2">Tag it. Measure it. Trust only what repeats.</h2></div>
    <div class="grid g3 mt-24 how">
      <div class="reveal"><b>1 · Tag</b><p>Seven pressure states from the rebuilt match state: crisis, steep chases, close death, high stakes, death defence, partnership breaking, defending a sub-par total. Win probability must still be live (3–97%).</p></div>
      <div class="reveal"><b>2 · Measure</b><p>Every ball is compared with what an average player would do in that exact state, then adjusted for the quality of the opponent faced.</p></div>
      <div class="reveal"><b>3 · Shrink and blend</b><p>Small samples are pulled toward par by empirical Bayes. PRI = 60% impact, 25% consistency, 15% robustness, mapped to 0–100.</p></div>
    </div>
    <p class="mt-24 reveal"><a class="btn btn-ghost btn-sm" href="#method">Full method and validation</a></p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="reveal"><p class="kicker">Explore</p><h2 class="h2">Pick a room</h2></div>
    <div class="grid g4 mt-24 tiles-x">
      ${tile('#rankings', 'Rankings', 'All 189 ranked players: sort, filter, and see who beats their own normal.', 'M4 20V10M10 20V4M16 20v-7M22 20H2')}
      ${tile('#compare', 'Head to head', 'Put any two players side by side, state by state and season by season.', 'M7 4v16M17 4v16M3 8h8M13 16h8')}
      ${tile('#lab', 'Pressure Lab', 'The chase heatmap, what pressure does to the league, and what a wicket is worth.', 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z')}
      ${tile('#war-room', 'War Room', 'RR’s gaps, the target list, Jaipur, and a live finish simulator.', 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z')}
      ${tile('#method', 'Method', 'Definitions, shrinkage, out-of-time tests, stability and limits.', 'M4 6h16M4 12h10M4 18h7')}
    </div>
  </div>
</section>`;
    App.chart(main.querySelector('#pmap'), pressureMap);
  });

  function podium(side) {
    const ps = App.DB.players[side].filter(p => p.rank <= 10);
    const card = p => `<a class="pod-card" href="${App.link(side, p)}"><span class="rk">${p.rank}</span><span class="pri"><b>${f(p.pri)}</b><span>PRI</span></span><p class="nm">${esc(p.name)}</p><p class="mt">${esc(App.where(p))}</p></a>`;
    const row = p => `<a class="pod-row" href="${App.link(side, p)}"><span class="r">${p.rank}</span><span><b>${esc(p.name)}</b> <span class="t">${esc(App.team(p.team))}</span></span>${App.minibar(p.pri)}<span class="num"><b>${f(p.pri)}</b></span></a>`;
    return `<div class="podium"><div class="split"><h3 class="h3">${App.SIDE[side].many}</h3><a class="note" href="#rankings-${side}">All ${App.DB.players[side].length} →</a></div>
      <div class="pod-top">${ps.slice(0, 3).map(card).join('')}</div>
      <div class="pod-list">${ps.slice(3).map(row).join('')}</div></div>`;
  }
  function tile(href, title, text, path) {
    return `<a class="card card-link reveal" href="${href}"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="${App.C.pink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg><h3 class="mt-8">${title}</h3><p class="note">${text}</p></a>`;
  }
  function pearson(a, b) {
    const ma = d3.mean(a), mb = d3.mean(b);
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
    return num / Math.sqrt(da * db);
  }
  App.pearson = pearson;
})();
