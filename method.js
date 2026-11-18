/* Method: pipeline, formula, shrinkage, repeatability, out-of-time test, stability, sensitivity, limits. */
(function () {
  'use strict';
  const { esc, f, sg } = App;

  function shrinkChart(el, w) {
    const C = App.C, S = App.DB.method.shrink, h = 260, m = { l: 44, r: 16, t: 14, b: 40 };
    const lines = [
      ['Batting · scoring', S.bat.p.bc_run_adj.k, C.blue],
      ['Bowling · runs', S.bowl.p.wc_run_adj.k, C.pink],
      ['Bowling · wickets', S.bowl.p.wc_wkt_adj.k, C.navy]
    ];
    const svg = App.svg(el, w, h, 'Trust weight given to a player’s own record by number of pressure balls');
    const x = d3.scaleLinear([0, 2500], [m.l, w - m.r]), y = d3.scaleLinear([0, 1], [h - m.b, m.t]);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%'))).select('.domain').remove();
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(5)).select('.domain').remove();
    svg.append('text').attr('class', 'lbl-m').attr('x', w - m.r).attr('y', h - 6).attr('text-anchor', 'end').text('Weighted pressure balls →');
    svg.append('line').attr('class', 'ref').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0.5)).attr('y2', y(0.5));
    const xs = d3.range(0, 2501, 25);
    lines.forEach(([n, k, col]) => {
      svg.append('path').datum(xs).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 2.5).attr('d', d3.line(b => x(b), b => y(b / (b + k))));
      svg.append('circle').attr('cx', x(k)).attr('cy', y(0.5)).attr('r', 5).attr('fill', col).attr('stroke', '#fff').attr('stroke-width', 2);
      svg.append('text').attr('class', 'lbl').style('font-weight', 600).attr('x', x(k)).attr('y', y(0.5) + (col === C.pink ? 18 : -10)).attr('text-anchor', 'middle').text(App.int(k));
    });
    svg.append('path').attr('d', `M${x(0)},${y(0)}H${x(2500)}`).attr('stroke', C.grey).attr('stroke-width', 2.5).attr('stroke-dasharray', '5 4');
    svg.append('text').attr('class', 'lbl-m').attr('x', w - m.r).attr('y', y(0) - 6).attr('text-anchor', 'end').text(w < 520 ? 'Bat dismissals: held at par' : 'Batting dismissals: no repeatable signal, held at par');
    // crosshair
    const cross = svg.append('g').style('display', 'none'); cross.append('line').attr('y1', m.t).attr('y2', h - m.b).attr('stroke', C.mute);
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b).attr('fill', 'transparent')
      .on('pointermove', ev => {
        const b = Math.round(x.invert(d3.pointer(ev)[0]) / 10) * 10;
        cross.style('display', null).select('line').attr('x1', x(b)).attr('x2', x(b));
        App.tipShow(ev, `<b>${App.int(b)} pressure balls</b>` + lines.map(([n, k]) => `<span>${n}: ${Math.round(100 * b / (b + k))}% own record</span>`).join('') + '<span>Batting dismissals: 0%</span>');
      }).on('pointerleave', () => { cross.style('display', 'none'); App.tipHide(); });
    return lines;
  }

  function hbars(el, w, rows, opt) {
    const C = App.C, rowH = opt.rowH || 30, m = { l: opt.l || Math.min(170, w * 0.4), r: 50, t: 4, b: 28 }, h = m.t + m.b + rows.length * rowH;
    const svg = App.svg(el, w, h, opt.label);
    const x = d3.scaleLinear(opt.domain, [m.l + 44, w - m.r]);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(w < 520 ? 3 : 5).tickSize(-(h - m.t - m.b)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(w < 520 ? 3 : 5).tickFormat(opt.tf || (d => d))).select('.domain').remove();
    svg.append('line').attr('stroke', '#7A8597').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t).attr('y2', h - m.b);
    rows.forEach((r, i) => {
      const y0 = m.t + i * rowH;
      if (r.group) { svg.append('text').attr('class', 'lbl-m').style('font-weight', 700).attr('x', 0).attr('y', y0 + rowH / 2 + 4).text(r.group); return; }
      svg.append('text').attr('class', 'lbl').attr('x', m.l - 10).attr('y', y0 + rowH / 2 + 4).attr('text-anchor', 'end').text(r.n);
      const x0 = x(Math.min(0, r.v)), wd = Math.max(1.5, Math.abs(x(r.v) - x(0)));
      const rect = svg.append('rect').attr('x', x0).attr('y', y0 + 6).attr('width', wd).attr('height', rowH - 12).attr('rx', 3).attr('fill', r.c);
      svg.append('text').attr('class', 'lbl').style('font-weight', 600).attr('x', r.v >= 0 ? x(r.v) + 6 : x(r.v) - 6).attr('y', y0 + rowH / 2 + 4).attr('text-anchor', r.v >= 0 ? 'start' : 'end').text(opt.vf ? opt.vf(r.v) : r.v);
      if (r.tip) App.hover(rect, () => r.tip);
    });
  }

  function bands(el, w, side) {
    const C = App.C, list = App.DB.players[side].slice(0, 15), rowH = 26, m = { l: 150, r: 20, t: 18, b: 28 }, h = m.t + m.b + list.length * rowH;
    const svg = App.svg(el, w, h, 'Bootstrap rank ranges for the top 15');
    const x = d3.scaleLinear([1, Math.max(25, d3.max(list, p => p.band[2]) + 1)], [m.l, w - m.r]);
    svg.append('rect').attr('x', x(1) - 6).attr('width', x(10.5) - x(1) + 6).attr('y', m.t - 4).attr('height', h - m.t - m.b + 8).attr('rx', 6).attr('fill', C.pinkBg);
    svg.append('text').attr('class', 'lbl-m').attr('x', x(1)).attr('y', 11).text('top 10');
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues([1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].filter(v => v <= x.domain()[1])).tickFormat(d => '#' + d)).select('.domain').remove();
    list.forEach((p, i) => {
      const y = m.t + i * rowH + rowH / 2;
      svg.append('a').attr('href', App.link(side, p)).append('text').attr('class', 'lbl').attr('x', m.l - 10).attr('y', y + 4).attr('text-anchor', 'end').text(`${p.rank}. ${p.name}`);
      svg.append('line').attr('x1', x(p.band[0])).attr('x2', x(p.band[2])).attr('y1', y).attr('y2', y).attr('stroke', C.navy).attr('stroke-width', 3.5).attr('stroke-linecap', 'round');
      const d = svg.append('circle').attr('cx', x(p.band[1])).attr('cy', y).attr('r', 6).attr('fill', p.rank <= 10 ? C.pink : '#8C9AB3').attr('stroke', '#fff').attr('stroke-width', 2);
      App.hover(d, () => `<b>${esc(p.name)}</b><span>Official rank ${p.rank}; median ${p.band[1]}, 80% range ${p.band[0]}–${p.band[2]}</span><span>Top 10 in ${Math.round(p.top10)}% of resamples</span>`);
    });
  }

  App.page('method', (main) => {
    const M = App.DB.method, S = M.shrink, n = App.DB.meta.n, C = App.C;
    const oot = M.oot;
    const rc = M.recency;
    const off = (side, nm) => { const p = App.byName(side, nm); return p ? (p.rank <= 10 ? `#${p.rank}` : `#${p.rank} · new`) : 'below sample minimum · new'; };
    main.innerHTML = `
<section class="dark section-tight"><div class="wrap" style="padding-top:18px;padding-bottom:34px">
  <p class="kicker">Method</p><h1 class="h2">How PRI 2.0 is built, and how far to trust it</h1>
  <p class="lede">Everything comes from the supplied ball-by-ball and match files: ${App.int(n.balls)} deliveries, ${App.int(n.matches)} matches, ${n.comps} competitions (IPL ${n.ctype.IPL}, full-member T20Is ${n.ctype['T20I-Full']}, associate T20Is ${n.ctype['T20I-Assoc']}, A-team ${n.ctype['A-Team']}).</p>
</div></section>
<section class="section-tight"><div class="wrap">
  <div class="steps">
    <div class="step reveal"><h4>Match-state engine</h4><p>Score, wickets, balls left, target, required rate, partnership and striker score rebuilt for every ball. 804 of 809 checkable results reconcile.</p></div>
    <div class="step reveal"><h4>Win probability</h4><p>Gradient-boosted models with match-grouped cross-validation. Chase model Brier 0.150, AUC 0.875.</p></div>
    <div class="step reveal"><h4>Pressure tags</h4><p>Seven states from the match state, only while the result is live (3–97%). <a href="#lab">See them</a>.</p></div>
    <div class="step reveal"><h4>Par and opponent</h4><p>Each ball against an average player in that state, adjusted for the quality of the opponent faced. Associate and A-team games weigh 0.5.</p></div>
    <div class="step reveal"><h4>Shrink</h4><p>Each part is pulled toward par by empirical Bayes, by how much it repeats in split-half tests.</p></div>
    <div class="step reveal"><h4>Score and test</h4><p>Blend, map to 0–100, then test out of time, bootstrap 300 times and run 8 sensitivity checks.</p></div>
  </div>
</div></section>
<section class="section-tight"><div class="wrap">
  <div class="card dark reveal" style="border:0">
    <p class="kicker">The score</p>
    <p class="formula mt-8">PRI = 100 · Φ( [ <em>0.60</em>·z(Impact) + <em>0.25</em>·z(Consistency) + <em>0.15</em>·z(Robustness) ] / sd )</p><p class="note mt-8">z = standardised across ranked players; sd rescales the blend to unit spread; Φ maps it to a 0–100 percentile-like score.</p>
    <div class="grid g3 mt-24">
      <div><b>Impact (60%)</b><p class="note">Opponent-adjusted value vs par per 100 pressure balls. Scoring part shrunk with its own weight; batting dismissals shrunk to about zero; bowling wickets shrunk hard and valued by phase.</p></div>
      <div><b>Consistency (25%)</b><p class="note">Share of pressure innings (5+ balls) or spells (6+ balls) where scoring beat par, with an 8-innings prior toward the league rate.</p></div>
      <div><b>Robustness (15%)</b><p class="note">log(1 + weighted pressure balls): more evidence, more trust. Ranked if active in 2026 with 150+ balls and 12 innings (bat) or 180+ and 12 spells (bowl).</p></div>
    </div>
  </div>
</div></section>
<section class="section-tight"><div class="wrap grid g2">
  <div class="card reveal"><h3>What repeats, and what does not</h3><p class="note">Split-half correlation: a player's value in one random half of matches against the other half.</p><div class="chart mt-16" id="rep"></div>
    <p class="note mt-8">Getting out under pressure does not repeat for batters, so it is held at par. The scoring parts repeat, though less than in normal play.</p></div>
  <div class="card reveal"><h3>How much a record is trusted</h3><p class="note">Weight on the player's own pressure record; the rest is par. The dot marks half trust.</p><div class="legend" id="shlg"></div><div class="chart" id="shr"></div></div>
</div></section>
<section class="section-tight"><div class="wrap grid g2">
  <div class="card reveal"><h3>Does it predict the future?</h3><p class="note">Out-of-time test: built on 2022–24 only, then compared with what players did in 2025–26 (Spearman ρ with future pressure scoring).</p><div class="legend"><span><i style="background:${C.grey}"></i>v1 (original PRI)</span><span><i style="background:${C.pink}"></i>PRI 2.0</span></div><div class="chart" id="oot"></div>
    <p class="note mt-8">PRI 2.0 more than doubles the forecast signal for both lists. The signal is real but modest: pressure performance is noisy, which is why the ranks come with ranges.</p></div>
  <div class="card reveal"><div class="split"><h3>How stable are the top 15?</h3><div id="bseg"></div></div><p class="note">300 bootstrap resamples of matches. Line = 10th–90th percentile rank, dot = median.</p><div class="chart mt-8" id="bands"></div></div>
</div></section>
<section class="section-tight"><div class="wrap grid g2">
  <div class="card reveal"><h3>Sensitivity: change a choice, keep the answer?</h3><p class="note">Top-10 overlap with the official lists, and rank correlation over all ranked players.</p>
    <div class="tablewrap mt-16" style="box-shadow:none"><table class="t"><thead><tr><th scope="col">Scenario</th><th class="r" scope="col">Bat top 10</th><th class="r" scope="col">Bowl top 10</th><th class="r" scope="col">Bat ρ</th><th class="r" scope="col">Bowl ρ</th></tr></thead><tbody>
    ${M.sens.map(s => `<tr><td class="wrap">${esc(s.scenario)}</td><td class="r">${s.bat_overlap}/10</td><td class="r">${s.bowl_overlap}/10</td><td class="r">${f(s.bat_rho, 3)}</td><td class="r">${f(s.bowl_rho, 3)}</td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="card reveal"><h3>Recency check</h3><p class="note">If recent seasons count more, who makes the top 10? Official PRI rank alongside each name.</p>
    <div class="grid g2 mt-16">
      <div><b>Batters</b><ol class="clean mt-8">${rc.bat.map(nm => `<li>${esc(nm)} <span class="note">${off('bat', nm)}</span></li>`).join('')}</ol></div>
      <div><b>Bowlers</b><ol class="clean mt-8">${rc.bowl.map(nm => `<li>${esc(nm)} <span class="note">${off('bowl', nm)}</span></li>`).join('')}</ol></div>
    </div>
    <p class="note mt-8">Eight of ten names stay on each list, so the official ranking does not depend on old seasons.</p></div>
</div></section>
<section class="section-tight"><div class="wrap grid g2">
  <div class="card reveal"><h3>Limits</h3><ul class="clean mt-8">
    <li>Some players have thin recent IPL evidence (Nathan Ellis: most of his recent pressure balls are T20Is). Rank ranges show this.</li>
    <li>The first-innings win model is weaker (AUC 0.683), so first-innings close death uses projected total vs venue par instead.</li>
    <li>Fielding, captaincy and match-ups (left/right, pace/spin faced) are not modelled.</li>
    <li>T20I opposition varies a lot; opponent adjustment and the 0.5 weight on associate games only partly correct for it.</li>
    <li>The clutch gap (pressure minus normal) did not repeat, so it is shown but not scored.</li>
    <li>The simulator treats balls as independent and the other side as par. Prices and squad status are public reports as of 14 November 2026 and will change.</li>
  </ul></div>
  <div class="card reveal"><h3>Reproduce it</h3><p class="note">Python 3.13, scikit-learn 1.9, fixed seeds throughout.</p>
    <ol class="clean mt-8 code-list"><li><code>engine.py</code> match state</li><li><code>model.py</code> win probability</li><li><code>adjust.py</code> par and opponent effects</li><li><code>pri2.py</code> + <code>pricore.py</code> PRI 2.0</li><li><code>validate.py</code>, <code>validate2.py</code> split-half and out of time</li><li><code>stability2.py</code> bootstrap (seed 2027)</li><li><code>details.py</code> profiles</li><li><code>sim.py</code> finish model</li><li><code>charts.py</code> figures</li></ol></div>
</div></section>`;

    App.chart(main.querySelector('#rep'), (el, w) => hbars(el, w, [
      { group: 'Batters, under pressure' },
      { n: 'Scoring vs par', v: S.bat.p.bc_run_adj.r, c: C.blue, tip: `<b>Batting scoring, pressure</b><span>Split-half r ${f(S.bat.p.bc_run_adj.r, 3)}</span>` },
      { n: 'Dismissals vs par', v: S.bat.p.bc_out_adj.r, c: C.grey, tip: `<b>Batting dismissals, pressure</b><span>Split-half r ${f(S.bat.p.bc_out_adj.r, 3)}: no signal</span>` },
      { group: 'Bowlers, under pressure' },
      { n: 'Runs vs par', v: S.bowl.p.wc_run_adj.r, c: C.pink, tip: `<b>Bowling runs, pressure</b><span>Split-half r ${f(S.bowl.p.wc_run_adj.r, 3)}</span>` },
      { n: 'Wickets vs par', v: S.bowl.p.wc_wkt_adj.r, c: C.navy, tip: `<b>Bowling wickets, pressure</b><span>Split-half r ${f(S.bowl.p.wc_wkt_adj.r, 3)}</span>` },
      { group: 'For reference, normal play' },
      { n: 'Batting scoring', v: S.bat.n.bc_run_adj.r, c: '#8C9AB3' },
      { n: 'Bowling runs', v: S.bowl.n.wc_run_adj.r, c: '#8C9AB3' }
    ], { domain: [-0.15, 0.5], vf: v => sg(v, 2), label: 'Split-half repeatability by component', rowH: 28 }));
    App.chart(main.querySelector('#shr'), (el, w) => {
      const ls = shrinkChart(el, w);
      main.querySelector('#shlg').innerHTML = ls.map(([n, k, c]) => `<span><i style="background:${c}"></i>${n} (half trust at ${App.int(k)})</span>`).join('');
    });
    App.chart(main.querySelector('#oot'), (el, w) => {
      const C2 = App.C, rows = [['Batters', 'bat'], ['Bowlers', 'bowl']], h = 230, m = { l: 40, r: 10, t: 16, b: 46 };
      const svg = App.svg(el, w, h, 'Out-of-time rank correlation, v1 vs PRI 2.0');
      const x0 = d3.scaleBand(rows.map(r => r[0]), [m.l, w - m.r]).padding(0.3), x1 = d3.scaleBand(['v1', 'v2'], [0, x0.bandwidth()]).padding(0.12);
      const y = d3.scaleLinear([0, 0.3], [h - m.b, m.t]);
      svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(3).tickSize(-(w - m.l - m.r)).tickFormat(''));
      svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(3).tickFormat(d3.format('.1f'))).select('.domain').remove();
      rows.forEach(([lab, s]) => {
        const v1 = oot.find(o => o.side === s && o.model.startsWith('v1')), v2 = oot.find(o => o.side === s && o.model.startsWith('v2'));
        [['v1', v1, C2.grey], ['v2', v2, C2.pink]].forEach(([k, o, col]) => {
          const xx = x0(lab) + x1(k), v = o.rho_PRI_scoring;
          const r = svg.append('rect').attr('x', xx).attr('width', x1.bandwidth()).attr('y', y(v)).attr('height', y(0) - y(v)).attr('rx', 4).attr('fill', col);
          svg.append('text').attr('class', 'lbl').style('font-weight', 700).attr('x', xx + x1.bandwidth() / 2).attr('y', y(v) - 6).attr('text-anchor', 'middle').text('ρ ' + f(v, 2));
          App.hover(r, () => `<b>${lab} · ${o.model}</b><span>ρ with future pressure scoring ${f(o.rho_PRI_scoring, 3)}</span><span>ρ with future total value ${f(o.rho_PRI_total, 3)}</span><span>${o.n} players in both periods</span>`);
        });
        svg.append('text').attr('class', 'lbl').attr('x', x0(lab) + x0.bandwidth() / 2).attr('y', h - m.b + 18).attr('text-anchor', 'middle').style('font-weight', 600).text(lab);
      });
      svg.append('line').attr('stroke', '#7A8597').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0)).attr('y2', y(0));
    });
    let bside = 'bat';
    const bgo = App.chart(main.querySelector('#bands'), (el, w) => bands(el, w, bside));
    main.querySelector('#bseg').appendChild(App.seg([['bat', 'Batters'], ['bowl', 'Bowlers']], bside, v => { bside = v; bgo(); }, 'List'));
  });
})();
