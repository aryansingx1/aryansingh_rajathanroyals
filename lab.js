/* Pressure Lab: state definitions, leverage, chase heatmap, league effects, wicket value. */
(function () {
  'use strict';
  const { esc, f, sg } = App;
  const DEF = [
    ['B_crisis', 'Crisis recovery', 'Bat', '2+ down in the powerplay, or 3+ down for under 50.'],
    ['B_highrrr', 'Steep chase', 'Bat', 'Chasing with under 60 balls left and the rate above 10.5, or 2+ an over above venue par.'],
    ['S_closedeath', 'Close death', 'Both', 'Overs 16–20 with chase win chance 30–70%, or a first-innings total projected within 15 of venue par.'],
    ['B_highstakes', 'High stakes', 'Both', 'Knockouts, finals, Super 4s, series deciders and IPL must-win games, while the result is still open (10–90%).'],
    ['W_death', 'Death defence', 'Bowl', 'Overs 16–20 defending a rate of 12 or less, or bowling to a set batter on 30+.'],
    ['W_partner', 'Partnership breaker', 'Bowl', 'A stand of 40+ going at more than 9.5 an over.'],
    ['W_subpar', 'Sub-par defence', 'Bowl', 'Second innings, defending a total at least 10 below venue par.']
  ];

  function leverage(el, w) {
    const C = App.C, S = App.DB.lab.states;
    const rows = DEF.map(d => ({ key: d[0], name: d[1], who: d[2], LI: S[d[0]].LI, LI2: S[d[0]].LI_inn2, share: S[d[0]].share })).sort((a, b) => b.LI - a.LI);
    const rowH = 34, m = { l: Math.min(150, w * 0.36), r: 50, t: 22, b: 30 }, h = m.t + m.b + rows.length * rowH;
    const svg = App.svg(el, w, h, 'Leverage index by pressure state');
    const x = d3.scaleLinear([0, 1.8], [m.l, w - m.r]);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(w < 520 ? 4 : 6).tickSize(-(h - m.t - m.b)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(w < 520 ? 4 : 6).tickFormat(d => d + '×')).select('.domain').remove();
    rows.forEach((r, i) => {
      const y = m.t + i * rowH;
      svg.append('text').attr('class', 'lbl').attr('x', m.l - 10).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'end').text(r.name);
      const b = svg.append('rect').datum(r).attr('x', m.l).attr('y', y + 8).attr('height', rowH - 16).attr('rx', 3).attr('fill', r.who === 'Bat' ? C.blue : r.who === 'Bowl' ? C.navy : C.pink).attr('width', 0);
      if (App.reduced()) b.attr('width', x(r.LI) - m.l); else b.transition().duration(700).delay(i * 50).attr('width', x(r.LI) - m.l);
      svg.append('text').attr('class', 'lbl').style('font-weight', 600).attr('x', x(r.LI) + 6).attr('y', y + rowH / 2 + 4).text(f(r.LI, 2) + '×');
      App.hover(b, d => `<b>${d.name} (${d.who})</b><span>${f(d.share)}% of all balls</span><span>A ball here moves the result ${f(d.LI, 2)}× as much as an average ball${d.LI2 ? ` (${f(d.LI2, 2)}× in second innings)` : ''}</span>`);
    });
    svg.append('line').attr('class', 'ref').attr('x1', x(1)).attr('x2', x(1)).attr('y1', m.t).attr('y2', h - m.b);
    svg.append('text').attr('class', 'lbl-m').attr('x', x(1)).attr('y', 12).attr('text-anchor', 'middle').text('average ball = 1×');
  }

  function heatmap(el, w, grp, metric) {
    const C = App.C, cells = App.DB.lab.heat.filter(d => d.w === grp);
    const maxN = Math.max(8, d3.max(cells, d => d.n));
    const m = { l: 64, r: 8, t: 8, b: 40 };
    const cw = Math.max(12, (w - m.l - m.r) / 20), ch = Math.min(26, Math.max(14, cw * 0.62));
    const W = m.l + m.r + cw * 20, h = m.t + m.b + ch * (maxN + 1);
    const svg = App.svg(el, W, h, `Chase heatmap with ${grp} wickets in hand`);
    const x = o => m.l + (20 - o) * cw, y = n => m.t + (maxN - n) * ch;
    const wpCol = d3.scaleDiverging([0, 0.5, 1], d3.interpolateRgbBasis([C.navy, '#6F92D6', '#F1F0F5', '#F39AC6', C.pinkD]));
    const levMax = d3.quantile(App.DB.lab.heat.map(d => d.lev).sort(d3.ascending), 0.98);
    const levCol = d3.scaleSequentialSqrt([0, levMax], d3.interpolateRgb('#FBEAF3', '#7E0A49')).clamp(true);
    const col = d => metric === 'wp' ? wpCol(d.wp) : levCol(d.lev);
    svg.append('g').selectAll('rect').data(cells).join('rect')
      .attr('x', d => x(d.o) + 1).attr('y', d => y(d.n) + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 2.5)
      .attr('fill', col)
      .call(s => App.hover(s, d => `<b>Need ${d.n * 10}–${d.n * 10 + 9}, ${d.o} over${d.o > 1 ? 's' : ''} left, ${grp} wkts in hand</b><span>Chasing side wins ${Math.round(d.wp * 100)}%</span><span>Leverage ${f(d.lev, 2)} · ${App.int(d.c)} balls in the data</span>`));
    // scenario marker: 40-49 needed off 4 overs
    const sc = cells.find(d => d.o === 4 && d.n === 4);
    if (sc) {
      svg.append('rect').attr('x', x(4) - 0.5).attr('y', y(4) - 0.5).attr('width', cw + 1).attr('height', ch + 1).attr('rx', 3).attr('fill', 'none').attr('stroke', C.ink).attr('stroke-width', 2.5);
      const lx = x(4) - 8;
      svg.append('text').attr('class', 'lbl').style('font-weight', 600).attr('x', lx).attr('y', y(4) - 6 < 12 ? y(4) + ch + 14 : y(4) - 6).attr('text-anchor', 'end').attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 3).text('War Room scenario');
    }
    for (let o = 20; o >= 1; o--) if (o % (cw < 22 ? 4 : 2) === 0 || o === 1) svg.append('text').attr('class', 'lbl-m').attr('x', x(o) + cw / 2).attr('y', h - m.b + 15).attr('text-anchor', 'middle').text(o);
    svg.append('text').attr('class', 'lbl-m').attr('x', m.l + cw * 10).attr('y', h - 6).attr('text-anchor', 'middle').text('Overs left in the chase');
    for (let n = 0; n <= maxN; n += (ch < 18 ? 2 : 1)) svg.append('text').attr('class', 'lbl-m').attr('x', m.l - 6).attr('y', y(n) + ch / 2 + 4).attr('text-anchor', 'end').text(`${n * 10}–${n * 10 + 9}`);
    svg.append('text').attr('class', 'lbl-m').attr('transform', `translate(11,${m.t + ch * (maxN + 1) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Runs needed');
    return { wpCol, levCol, levMax };
  }

  App.page('lab', (main) => {
    const L = App.DB.lab, S = L.states, lb = L.league_bat, lw = L.league_bowl, wv = L.wkt_value;
    const st = App.state.lab = App.state.lab || { grp: '6-7', metric: 'wp' };
    const pair = (lab, a, b, d, better, note) => `<div class="tile reveal"><p class="lab">${lab}</p><p class="val num">${f(a, d)} <span class="arrow" aria-hidden="true">→</span> <span style="color:${App.C.pinkD}">${f(b, d)}</span></p><p class="sub">normal → pressure${note ? ' · ' + note : ''}</p></div>`;
    main.innerHTML = `
<section class="dark section-tight"><div class="wrap" style="padding-top:18px;padding-bottom:30px">
  <p class="kicker">Pressure Lab</p><h1 class="h2">What pressure is, and what it does</h1>
  <p class="lede">Pressure is defined from the match state, never from the outcome: a ball counts as pressure because of the situation it was bowled in, not because it went well or badly.</p>
</div></section>
<section class="section-tight"><div class="wrap">
  <div class="grid g2">
    <div class="reveal">
      <h2 class="h3">Seven states</h2>
      <p class="note mt-8">Tagged per delivery from the rebuilt score, wickets, target, rate and partnership. Every state also needs the result to be live: win probability between 3% and 97%.</p>
      <div class="defs mt-16">${DEF.map(d => `<div class="def"><span class="pill ${d[2] === 'Bat' ? 'blue' : d[2] === 'Bowl' ? 'grey' : ''}">${d[2]}</span><div><b>${d[1]}</b> <span class="note">${f(S[d[0]].share)}% of balls</span><p class="note">${d[3]}</p></div></div>`).join('')}</div>
    </div>
    <div class="card reveal sticky"><h3>How much each state matters</h3><p class="note">Leverage index: how far one ball moves the win probability, relative to an average ball (1×).</p>
      <div class="legend"><span><i style="background:${App.C.blue}"></i>Batting</span><span><i style="background:${App.C.navy}"></i>Bowling</span><span><i style="background:${App.C.pink}"></i>Both</span></div>
      <div class="chart" id="lev"></div></div>
  </div>
</div></section>
<section class="section-tight"><div class="wrap">
  <div class="card reveal">
    <div class="split"><div><h3>The chase map</h3><p class="note">Every second-innings state in the data. Win chance comes from the chase model (match-grouped cross-validation: Brier 0.150, AUC 0.875).</p></div></div>
    <div class="controls" id="hctl"></div>
    <div class="heat-wrap"><div class="chart" id="heat"></div></div>
    <div class="scale" id="hscale"></div>
  </div>
</div></section>
<section class="section-tight"><div class="wrap">
  <div class="reveal"><h2 class="h3">What pressure does to the whole league</h2><p class="note mt-8">League averages across the same data. Under pressure, runs come a little faster and wickets fall sooner: batters take more risk, bowlers concede more.</p></div>
  <div class="tiles pairs" style="margin-top:16px">
    ${pair('Batting strike rate', lb.normal.SR, lb.pressure.SR, 1)}
    ${pair('Balls per dismissal', lb.normal.BPD, lb.pressure.BPD, 1)}
    ${pair('Bowling economy', lw.normal.econ, lw.pressure.econ, 2)}
    ${pair('Balls per wicket', lw.normal.BSR, lw.pressure.BSR, 1)}
    ${pair('Dot-ball % (bowling)', lw.normal.dot, lw.pressure.dot, 1)}
  </div>
</div></section>
<section class="section-tight"><div class="wrap grid g2">
  <div class="card reveal"><h3>What a wicket is worth</h3><p class="note">Runs a wicket takes off the batting side's expected total, by phase. Used to put bowlers' wickets and runs on one scale.</p><div class="chart mt-16" id="wv"></div></div>
  <div class="card reveal"><h3>Why the index looks like this</h3>
    <ul class="clean mt-8">
      <li><b>Par is state-specific.</b> A strike rate of 150 is poor chasing 13 an over and excellent in a collapse.</li>
      <li><b>Opponent-adjusted.</b> Each ball is credited against the quality of the bowler or batter faced.</li>
      <li><b>Leverage defines pressure but does not weight it.</b> Weighting by leverage halved how well bowling value repeated, so it was dropped.</li>
      <li><b>Death wickets are cheap.</b> At ${f(wv.Death)} runs a death wicket is worth about a third of a powerplay wicket (${f(wv.Powerplay)}), so death bowlers are judged mostly on runs.</li>
    </ul>
    <p class="mt-16"><a class="btn btn-line btn-sm" href="#method">Full method →</a></p>
  </div>
</div></section>`;

    App.chart(main.querySelector('#lev'), leverage);
    const hctl = main.querySelector('#hctl');
    const lbl = document.createElement('span'); lbl.className = 'note'; lbl.textContent = 'Wickets in hand';
    hctl.appendChild(lbl);
    hctl.appendChild(App.seg([['1-3', '1–3'], ['4-5', '4–5'], ['6-7', '6–7'], ['8-10', '8–10']], st.grp, v => { st.grp = v; hgo(); }, 'Wickets in hand'));
    hctl.appendChild(App.seg([['wp', 'Win chance'], ['lev', 'Leverage']], st.metric, v => { st.metric = v; hgo(); }, 'Colour by'));
    const scaleEl = main.querySelector('#hscale');
    const hgo = App.chart(main.querySelector('#heat'), (el, w) => {
      const sc = heatmap(el, w, st.grp, st.metric);
      const stops = d3.range(0, 1.0001, 0.1).map(t => st.metric === 'wp' ? sc.wpCol(t) : sc.levCol(t * sc.levMax));
      scaleEl.innerHTML = st.metric === 'wp'
        ? `<span>Chasing side loses</span><span class="bar" style="background:linear-gradient(90deg,${stops.join(',')})"></span><span>wins</span><span class="note">· 50% is grey</span>`
        : `<span>Low leverage</span><span class="bar" style="background:linear-gradient(90deg,${stops.join(',')})"></span><span>High (one ball swings ${f(sc.levMax, 1)}× more)</span>`;
    });
    App.chart(main.querySelector('#wv'), (el, w) => {
      const C = App.C, rows = [['Powerplay', wv.Powerplay], ['Middle overs', wv.Middle], ['Death', wv.Death]];
      const h = 150, m = { l: 100, r: 60, t: 6, b: 6 }, rowH = (h - m.t - m.b) / 3;
      const svg = App.svg(el, w, h, 'Runs a wicket is worth by phase');
      const x = d3.scaleLinear([0, 11], [m.l, w - m.r]);
      rows.forEach(([n, v], i) => {
        const y = m.t + i * rowH;
        svg.append('text').attr('class', 'lbl').attr('x', m.l - 10).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'end').text(n);
        svg.append('rect').attr('x', m.l).attr('y', y + 10).attr('height', rowH - 20).attr('rx', 4).attr('fill', i === 2 ? C.pink : C.navy).attr('width', x(v) - m.l);
        svg.append('text').attr('class', 'lbl').style('font-weight', 700).attr('x', x(v) + 8).attr('y', y + rowH / 2 + 4).text(f(v) + ' runs');
      });
    });
  });
})();
