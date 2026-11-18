/* Player profile and head-to-head compare. */
(function () {
  'use strict';
  const { esc, f, sg } = App;
  const SHORT = { 'Crisis recovery': 'Crisis', 'High-RRR chase': 'Steep chase', 'Close death': 'Close death', 'High stakes': 'High stakes', 'Death defence': 'Death defence', 'Partnership breaker': 'Breaker', 'Defending sub-par': 'Sub-par defence' };

  function gauge(el, p, n) {
    const C = App.C, w = 220, h = 140, r = 92, cx = w / 2, cy = 112;
    const svg = App.svg(el, w, h, `PRI ${f(p.pri)} out of 100`);
    const defs = svg.append('defs').append('linearGradient').attr('id', 'gg').attr('x1', '0').attr('x2', '1');
    defs.append('stop').attr('offset', '0').attr('stop-color', C.pinkL); defs.append('stop').attr('offset', '1').attr('stop-color', C.pink);
    const arc = d3.arc().innerRadius(r - 16).outerRadius(r).cornerRadius(8).startAngle(-Math.PI / 2);
    svg.append('path').attr('transform', `translate(${cx},${cy})`).attr('d', arc({ endAngle: Math.PI / 2 })).attr('fill', 'rgba(255,255,255,.14)');
    const fg = svg.append('path').attr('transform', `translate(${cx},${cy})`).attr('fill', 'url(#gg)');
    const end = -Math.PI / 2 + Math.PI * p.pri / 100;
    if (App.reduced()) fg.attr('d', arc({ endAngle: end }));
    else fg.transition().duration(1200).ease(d3.easeCubicOut).attrTween('d', () => t => arc({ endAngle: -Math.PI / 2 + (end + Math.PI / 2) * t }));
    const v = svg.append('text').attr('x', cx).attr('y', cy - 14).attr('text-anchor', 'middle').attr('fill', '#fff').style('font-size', '44px').style('font-weight', 700).text('0');
    App.countUp(v.node(), p.pri, 1, 1200);
    svg.append('text').attr('x', cx).attr('y', cy + 16).attr('text-anchor', 'middle').attr('fill', '#C9D6EA').style('font-size', '13px').text(`PRI · rank ${p.rank} of ${n}`);
  }

  function stateBars(el, w, side, p, q) {
    const C = App.C, rows = p.states, two = !!q;
    const narrow = w < 520, rowH = two ? 46 : 34, m = { l: Math.min(150, w * 0.3), r: two || narrow ? 54 : 64, t: 8, b: 26 };
    const h = m.t + m.b + rows.length * rowH;
    const svg = App.svg(el, w, h, 'Value vs par per 100 balls in each pressure state');
    const qs = st => two ? q.states.find(x => x.state === st.state) : null;
    const all = rows.flatMap(s => [s.v, two ? (qs(s) || {}).v || 0 : 0]);
    const ext = Math.max(10, d3.max(all, Math.abs) * 1.08);
    const x = d3.scaleLinear([-ext, ext], [m.l + 40, w - m.r]).nice();
    svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(narrow ? 3 : 5).tickSize(-(h - m.t - m.b)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(narrow ? 3 : 5).tickFormat(d => (d > 0 ? '+' : '') + d)).select('.domain').remove();
    svg.append('line').attr('stroke', '#7A8597').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t).attr('y2', h - m.b);
    rows.forEach((s, i) => {
      const y0 = m.t + i * rowH;
      svg.append('text').attr('class', 'lbl').attr('x', m.l - 10).attr('y', y0 + rowH / 2 + 4).attr('text-anchor', 'end').text(SHORT[s.state] || s.state);
      const series = two ? [[p, s, C.pink], [q, qs(s), C.blue]] : [[p, s, null]];
      series.forEach(([pl, d, col], j) => {
        const bh = two ? 14 : 16, yy = y0 + (two ? 8 + j * (bh + 2) : (rowH - bh) / 2);
        if (!d || d.v == null) { svg.append('text').attr('class', 'lbl-m').attr('x', x(0) + 6).attr('y', yy + bh / 2 + 4).text(two ? `no balls (${App.first(pl.name)})` : 'no balls in this state'); return; }
        const fill = col || (d.v >= 0 ? C.pink : C.blue);
        const x0 = x(Math.min(0, d.v)), wd = Math.max(1.5, Math.abs(x(d.v) - x(0)));
        const rect = svg.append('rect').attr('x', d.v >= 0 ? x(0) : x(0)).attr('y', yy).attr('height', bh).attr('rx', 3).attr('fill', fill).attr('width', 0);
        rect.datum(d);
        if (App.reduced()) rect.attr('x', x0).attr('width', wd); else rect.transition().duration(700).delay(i * 60).attr('x', x0).attr('width', wd);
        svg.append('text').attr('class', 'lbl').attr('x', d.v >= 0 ? Math.max(x(d.v), x(0)) + 6 : Math.min(x(d.v), x(0)) - 6).attr('y', yy + bh / 2 + 4).attr('text-anchor', d.v >= 0 ? 'start' : 'end').style('font-weight', 600).text(sg(d.v));
        App.hover(rect, dd => `<b>${esc(pl.name)} · ${esc(s.state)}</b><span>${sg(dd.v)} vs par per 100 balls</span><span>${side === 'bat' ? `SR ${f(dd.sr)} vs par ${f(dd.xsr)}` : `Econ ${f(dd.econ, 2)} vs par ${f(dd.xecon, 2)}`}</span><span>${App.int(dd.balls)} balls</span>`);
      });
      if (!two && !narrow) svg.append('text').attr('class', 'lbl-m').attr('x', w - 4).attr('y', y0 + rowH / 2 + 4).attr('text-anchor', 'end').text(App.int(s.balls) + ' b');
    });
  }

  function seasonBars(el, w, p) {
    const C = App.C, rows = p.seasons, h = 220, m = { l: 40, r: 8, t: 18, b: 44 };
    const svg = App.svg(el, w, h, 'Pressure value by season');
    const solid = rows.filter(r => r.balls >= 30);
    const ext = Math.max(20, d3.max(solid.length ? solid : rows, r => Math.abs(r.v)) * 1.1);
    const y = d3.scaleLinear([-ext, ext], [h - m.b, m.t]).nice();
    const x = d3.scaleBand(rows.map(r => r.year), [m.l, w - m.r]).padding(0.35);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d => (d > 0 ? '+' : '') + d)).select('.domain').remove();
    svg.append('line').attr('stroke', '#7A8597').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0)).attr('y2', y(0));
    rows.forEach(r => {
      const v = Math.max(y.domain()[0], Math.min(y.domain()[1], r.v)), clipped = v !== r.v, small = r.balls < 30;
      const bar = svg.append('rect').datum(r).attr('x', x(r.year)).attr('width', x.bandwidth()).attr('rx', 3)
        .attr('y', y(Math.max(0, v))).attr('height', Math.max(1.5, Math.abs(y(v) - y(0))))
        .attr('fill', small ? 'none' : (r.v >= 0 ? C.pink : C.blue)).attr('stroke', small ? C.grey : 'none').attr('stroke-dasharray', small ? '3 2' : null).attr('stroke-width', 1.5);
      svg.append('text').attr('class', 'lbl').attr('x', x(r.year) + x.bandwidth() / 2).attr('y', r.v >= 0 ? y(v) - 5 : y(v) + 13).attr('text-anchor', 'middle').style('font-weight', 600).text(sg(r.v, 0) + (clipped ? '↑' : ''));
      svg.append('text').attr('class', 'lbl').attr('x', x(r.year) + x.bandwidth() / 2).attr('y', h - m.b + 16).attr('text-anchor', 'middle').text(r.year);
      svg.append('text').attr('class', 'lbl-m').attr('x', x(r.year) + x.bandwidth() / 2).attr('y', h - m.b + 31).attr('text-anchor', 'middle').text(r.balls + ' b');
      App.hover(bar, d => `<b>${d.year}</b><span>${sg(d.v)} vs par per 100 pressure balls</span><span>${d.balls} balls${d.balls < 30 ? ' · too few to read much into' : ''}</span>`);
    });
  }

  function band(el, w, p, n) {
    const C = App.C, h = 64, m = { l: 12, r: 12 };
    const hiR = Math.max(15, p.band[2] + 3);
    const x = d3.scaleLinear([1, hiR], [m.l, w - m.r]);
    const svg = App.svg(el, w, h, `Bootstrap rank range ${p.band[0]} to ${p.band[2]}`);
    svg.append('rect').attr('x', x(1)).attr('width', x(10.5) - x(1)).attr('y', 18).attr('height', 22).attr('rx', 6).attr('fill', C.pinkBg);
    svg.append('text').attr('class', 'lbl-m').attr('x', x(1) + 6).attr('y', 14).text('top 10');
    svg.append('line').attr('x1', x(p.band[0])).attr('x2', x(p.band[2])).attr('y1', 29).attr('y2', 29).attr('stroke', C.navy).attr('stroke-width', 4).attr('stroke-linecap', 'round');
    svg.append('circle').attr('cx', x(p.band[1])).attr('cy', 29).attr('r', 7).attr('fill', C.pink).attr('stroke', '#fff').attr('stroke-width', 2);
    svg.append('g').attr('class', 'axis').attr('transform', 'translate(0,44)').call(d3.axisBottom(x).tickValues(w < 520 ? [1, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90].filter(v => v <= hiR) : d3.range(1, hiR + 1).filter(v => hiR <= 16 || v === 1 || v % 5 === 0)).tickFormat(d => '#' + d)).select('.domain').remove();
  }

  App.page('player', (main, r) => {
    const side = r.side, p = App.get(side, r.id);
    if (!p) { main.innerHTML = '<div class="wrap section"><h2 class="h2">Player not found</h2><p class="lede"><a href="#rankings">Back to rankings</a></p></div>'; return; }
    const list = App.DB.players[side], n = list.length, prev = list.find(x => x.rank === p.rank - 1), next = list.find(x => x.rank === p.rank + 1);
    const bat = side === 'bat', P = p.p, N = p.n;
    const other = list.find(x => x.rank === (p.rank === 1 ? 2 : 1));
    const vs = bat ? [
      ['Strike rate', f(P.sr), f(P.xsr), f(N.sr), f(N.xsr)],
      ['Balls per dismissal', f(P.bpd), f(P.xbpd), f(N.bpd), f(N.xbpd)],
      ['Boundary %', f(P.bnd), '', '', ''],
      ['Dot-ball %', f(P.dot), '', '', '']
    ] : [
      ['Economy', f(P.econ, 2), f(P.xecon, 2), f(N.econ, 2), f(N.xecon, 2)],
      ['Balls per wicket', f(P.bsr), f(P.xbsr), f(N.bsr), f(N.xbsr)],
      ['Dot-ball %', f(P.dot), '', '', ''],
      ['Boundary %', f(P.bnd), '', '', '']
    ];
    const role = [p.role, p.hand, p.type].filter(Boolean).join(' · ');
    main.innerHTML = `
<section class="dark ph"><div class="wrap">
  <div class="crumbs"><a href="#rankings-${side}">Rankings</a><span aria-hidden="true">/</span><span>${App.SIDE[side].many}</span></div>
  <div class="ph-grid">
    <div>
      <p class="kicker">${p.rank <= 10 ? 'Official top 10 · ' : ''}${App.SIDE[side].one} #${p.rank}</p>
      <h1>${esc(p.name)}</h1>
      <div class="meta"><span class="pill dark">${esc(App.team(p.team))}</span>${p.country ? `<span class="pill dark">${esc(p.country)}</span>` : ''}${role ? `<span class="pill dark">${esc(role)}</span>` : ''}<span class="pill dark">${p.inns} pressure ${bat ? 'innings' : 'spells'}</span></div>
      <div class="pn">
        <a class="btn btn-pink btn-sm" href="#compare-${side}-${p.id}-${other.id}">Compare</a>
        <a class="btn btn-ghost btn-sm" href="#war-room-${side}-${p.id}">Simulate a finish</a>
        ${prev ? `<a class="btn btn-ghost btn-sm" href="${App.link(side, prev)}" aria-label="Previous: ${esc(prev.name)}">← #${prev.rank}</a>` : ''}
        ${next ? `<a class="btn btn-ghost btn-sm" href="${App.link(side, next)}" aria-label="Next: ${esc(next.name)}">#${next.rank} →</a>` : ''}
      </div>
    </div>
    <div class="gauge" id="gauge"></div>
  </div>
</div></section>
<section class="section-tight" style="padding-top:0"><div class="wrap">
  <div class="tiles">
    <div class="tile reveal"><p class="lab">Pressure value</p><p class="val num">${sg(p.impact)}</p><p class="sub">${bat ? 'runs vs par' : 'runs saved vs par'} per 100 pressure balls</p><div class="pctbar" title="Percentile among ranked ${App.SIDE[side].many.toLowerCase()}"><i style="width:${p.pct.impact}%"></i></div><p class="sub mt-8">${App.ord(Math.round(p.pct.impact))} percentile · 60% of PRI</p></div>
    <div class="tile reveal"><p class="lab">Consistency</p><p class="val num">${Math.round(p.consistency)}%</p><p class="sub">of pressure ${bat ? 'innings' : 'spells'} beat par</p><div class="pctbar"><i style="width:${p.pct.consistency}%"></i></div><p class="sub mt-8">${App.ord(Math.round(p.pct.consistency))} percentile · 25% of PRI</p></div>
    <div class="tile reveal"><p class="lab">Robustness</p><p class="val num">${App.int(p.wballs)}</p><p class="sub">weighted pressure balls</p><div class="pctbar"><i style="width:${p.pct.robust}%"></i></div><p class="sub mt-8">${App.ord(Math.round(p.pct.robust))} percentile · 15% of PRI</p></div>
    <div class="tile reveal"><p class="lab">Top-10 odds</p><p class="val num">${Math.round(p.top10)}%</p><p class="sub">of 300 bootstrap resamples</p><div class="pctbar"><i style="width:${p.top10}%;background:${App.C.pink}"></i></div><p class="sub mt-8">80% of resamples: rank ${p.band[0]}–${p.band[2]}</p></div>
  </div>
</div></section>
<section class="section-tight"><div class="wrap grid g2">
  <div class="card reveal"><h3>Under pressure vs normal</h3><p class="note">Par = what an average ${bat ? 'batter' : 'bowler'} does in the same states against the same quality of opposition.</p>
    <div class="vs mt-16" role="table">
      <div class="hd" role="columnheader">Measure</div><div class="hd" role="columnheader">Pressure</div><div class="hd" role="columnheader">Normal</div><div class="hd" role="columnheader">Clutch gap</div>
      ${vs.map(v => `<div role="cell">${v[0]}</div><div role="cell"><b>${v[1]}</b>${v[2] ? `<br><span class="note">par ${v[2]}</span>` : ''}</div><div role="cell">${v[3] ? `<b>${v[3]}</b><br><span class="note">par ${v[4]}</span>` : '<span class="note">–</span>'}</div><div role="cell"></div>`).join('')}
      <div><b>Value /100 balls</b></div><div><b class="${p.impact >= 0 ? 'pos' : 'neg'}">${sg(p.impact)}</b></div><div><b class="${p.normal >= 0 ? 'pos' : 'neg'}">${sg(p.normal)}</b></div><div><b>${sg(p.delta)}</b><br><span class="note">not scored</span></div>
    </div>
    <p class="note mt-16">${bat ? `${App.int(P.runs)} runs off ${App.int(P.balls)} pressure balls, out ${P.outs} times.` : `${P.wkts} wickets in ${App.int(P.balls)} pressure balls.`} The clutch gap is shown for interest only: it did not repeat between halves of the data, so PRI does not reward it.</p>
  </div>
  <div class="card reveal"><h3>By pressure state</h3><p class="note">${bat ? 'Runs' : 'Runs saved'} vs par per 100 balls in each state. A ball can sit in more than one state.</p><div class="chart mt-16" id="states"></div></div>
</div></section>
<section class="section-tight"><div class="wrap grid g2">
  <div class="card reveal"><h3>Season by season</h3><p class="note">Pressure value per 100 balls each year (not shrunk). Dashed = under 30 balls.</p><div class="chart mt-16" id="seasons"></div></div>
  <div class="card reveal"><h3>How stable is the rank?</h3><p class="note">300 bootstrap resamples of matches (seed 2027). Line = 10th–90th percentile rank, dot = median.</p><div class="chart mt-24" id="band"></div>
    <p class="mt-16">${p.top10 >= 80 ? `A secure top-10 pick: in the top 10 in ${Math.round(p.top10)}% of resamples.` : p.top10 >= 50 ? `More likely than not a top-10 player (${Math.round(p.top10)}% of resamples), but the edge is thin.` : `Outside the top 10 in most resamples (${Math.round(100 - p.top10)}%).`}</p>
    <p class="note mt-8">Model inputs for the War Room: ${bat ? 'runs per ball' : 'runs conceded per ball'} ${sg(p.sim.dr, 3)}, ${bat ? 'dismissal' : 'wicket'} rate ${sg(p.sim.dw * 100, 2)} pts vs par.</p>
  </div>
</div></section>`;
    gauge(main.querySelector('#gauge'), p, n);
    App.chart(main.querySelector('#states'), (el, w) => stateBars(el, w, side, p));
    App.chart(main.querySelector('#seasons'), (el, w) => seasonBars(el, w, p));
    App.chart(main.querySelector('#band'), (el, w) => band(el, w, p, n));
    document.title = `${p.name} · SupeRR Selector`;
    App.onCleanup(() => { document.title = 'SupeRR Selector · Pressure Reliability Index'; });
  });

  /* ---------- compare ---------- */
  function tug(el, w, side, a, b) {
    const C = App.C, bat = side === 'bat';
    const rows = [
      ['PRI', a.pri, b.pri, v => f(v), true],
      ['Pressure value /100', a.impact, b.impact, v => sg(v), true],
      ['Normal value /100', a.normal, b.normal, v => sg(v), true],
      ['Consistency %', a.consistency, b.consistency, v => Math.round(v) + '%', true],
      ['Top-10 odds %', a.top10, b.top10, v => Math.round(v) + '%', true],
      ['Pressure balls', a.wballs, b.wballs, v => App.int(v), true],
      bat ? ['Pressure strike rate', a.p.sr, b.p.sr, v => f(v), true] : ['Pressure economy', a.p.econ, b.p.econ, v => f(v, 2), false],
      bat ? ['Balls per dismissal', a.p.bpd, b.p.bpd, v => f(v), true] : ['Balls per wicket', a.p.bsr, b.p.bsr, v => f(v), false]
    ];
    const rowH = 44, h = rows.length * rowH + 6, mid = w / 2, half = mid - 70;
    const svg = App.svg(el, w, h, `Head to head: ${a.name} vs ${b.name}`);
    rows.forEach(([lab, va, vb, fm, hiGood], i) => {
      const y0 = i * rowH, mx = Math.max(Math.abs(va), Math.abs(vb)) || 1;
      const wa = half * Math.abs(va) / mx, wb = half * Math.abs(vb) / mx;
      const aw = hiGood ? va > vb : va < vb, bw = hiGood ? vb > va : vb < va;
      svg.append('text').attr('class', 'lbl-m').attr('x', mid).attr('y', y0 + 13).attr('text-anchor', 'middle').text(lab);
      svg.append('rect').attr('x', mid - 4 - wa).attr('y', y0 + 20).attr('width', wa).attr('height', 12).attr('rx', 3).attr('fill', C.pink).attr('opacity', aw ? 1 : 0.45);
      svg.append('rect').attr('x', mid + 4).attr('y', y0 + 20).attr('width', wb).attr('height', 12).attr('rx', 3).attr('fill', C.blue).attr('opacity', bw ? 1 : 0.45);
      svg.append('text').attr('class', 'lbl').attr('x', mid - 10 - wa).attr('y', y0 + 31).attr('text-anchor', 'end').style('font-weight', aw ? 700 : 400).text(fm(va));
      svg.append('text').attr('class', 'lbl').attr('x', mid + 10 + wb).attr('y', y0 + 31).style('font-weight', bw ? 700 : 400).text(fm(vb));
    });
  }
  function seasonLines(el, w, a, b) {
    const C = App.C, h = 240, m = { l: 40, r: 16, t: 14, b: 30 };
    const years = [2022, 2023, 2024, 2025, 2026];
    const svg = App.svg(el, w, h, 'Pressure value by season, both players');
    const vals = [a, b].flatMap(p => p.seasons.filter(s => s.balls >= 30).map(s => s.v));
    const ext = Math.max(20, d3.max(vals.length ? vals : [20], Math.abs) * 1.1);
    const x = d3.scalePoint(years, [m.l + 14, w - m.r - 14]), y = d3.scaleLinear([-ext, ext], [h - m.b, m.t]).nice();
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d => (d > 0 ? '+' : '') + d)).select('.domain').remove();
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickFormat(d => d)).select('.domain').remove();
    svg.append('line').attr('stroke', '#7A8597').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0)).attr('y2', y(0));
    [[a, C.pink], [b, C.blue]].forEach(([p, col]) => {
      const pts = p.seasons.filter(s => s.balls >= 30).map(s => ({ ...s, vv: Math.max(-ext, Math.min(ext, s.v)) }));
      svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 2.5).attr('d', d3.line(d => x(d.year), d => y(d.vv)));
      const dots = svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', d => x(d.year)).attr('cy', d => y(d.vv)).attr('r', 5.5).attr('fill', col).attr('stroke', '#fff').attr('stroke-width', 2);
      App.hover(dots, d => `<b>${esc(p.name)} · ${d.year}</b><span>${sg(d.v)} per 100 pressure balls</span><span>${d.balls} balls</span>`);
    });
  }

  App.page('compare', (main, r) => {
    const st = App.state.cmp = App.state.cmp || { side: 'bat' };
    let side = r.side || st.side, list = App.DB.players[side];
    let a = (r.a && App.get(side, r.a)) || list[0], b = (r.b && App.get(side, r.b)) || list[1];
    st.side = side;
    main.innerHTML = `
<section class="dark section-tight"><div class="wrap" style="padding-top:18px;padding-bottom:30px">
  <p class="kicker">Head to head</p><h1 class="h2">Compare any two players</h1>
  <p class="lede">Same scale, same par, same shrinkage. Pink is the first player, blue the second.</p>
</div></section>
<section class="section-tight"><div class="wrap">
  <div class="controls" id="ctl"></div>
  <div class="grid g2">
    <div class="card reveal"><div class="split"><h3 id="hh"></h3></div><div class="legend" id="lg1"></div><div class="chart mt-8" id="tug"></div></div>
    <div class="card reveal"><h3>By pressure state</h3><p class="note">Value vs par per 100 balls.</p><div class="legend" id="lg2"></div><div class="chart mt-8" id="st"></div></div>
  </div>
  <div class="card mt-24 reveal"><h3>Season by season</h3><p class="note">Seasons with at least 30 pressure balls. Raw (not shrunk) values per 100 balls.</p><div class="legend" id="lg3"></div><div class="chart mt-8" id="sl"></div></div>
</div></section>`;
    const ctl = main.querySelector('#ctl');
    ctl.appendChild(App.seg([['bat', 'Batters'], ['bowl', 'Bowlers']], side, v => { const L = App.DB.players[v]; App.soft(`compare-${v}-${L[0].id}-${L[1].id}`); }, 'List'));
    const sa = document.createElement('select'), sb = document.createElement('select');
    [sa, sb].forEach((s, i) => { s.className = 'select'; s.setAttribute('aria-label', i ? 'Second player' : 'First player'); ctl.appendChild(s); });
    sa.innerHTML = App.playerOptions(side, a.id); sb.innerHTML = App.playerOptions(side, b.id);
    sa.style.borderColor = App.C.pink; sb.style.borderColor = App.C.blue;
    const upd = () => App.soft(`compare-${side}-${sa.value}-${sb.value}`);
    sa.addEventListener('change', upd); sb.addEventListener('change', upd);
    main.querySelector('#hh').innerHTML = `<span style="color:${App.C.pinkD}">${esc(a.name)}</span> <span class="note">vs</span> <span style="color:${App.C.blue}">${esc(b.name)}</span>`;
    const lg = `<span><i style="background:${App.C.pink}"></i>${esc(a.name)}</span><span><i style="background:${App.C.blue}"></i>${esc(b.name)}</span>`;
    ['#lg1', '#lg2', '#lg3'].forEach(s => { main.querySelector(s).innerHTML = lg; });
    App.chart(main.querySelector('#tug'), (el, w) => tug(el, w, side, a, b));
    App.chart(main.querySelector('#st'), (el, w) => stateBars(el, w, side, a, b));
    App.chart(main.querySelector('#sl'), (el, w) => seasonLines(el, w, a, b));
  });
})();
