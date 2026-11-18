/* War Room: RR diagnostics, needs and targets, live finish simulator, Jaipur, squad. */
(function () {
  'use strict';
  const { esc, f, sg } = App;
  const LG = { dr: 0, dw: 0 };
  const DEFAULTS = {
    defend: { need: 48, balls: 24, wkts: 6, a: 'Nathan Ellis', b: 'Jasprit Bumrah' },
    chase: { need: 45, balls: 24, wkts: 6, a: 'Tim David', b: 'Nicholas Pooran' }
  };

  function diagChart(el, w, kind) {
    const C = App.C, D = App.DB.warroom.diag, rows = ['Powerplay', 'Middle', 'Death', 'Pressure', 'Close death'];
    const rowH = 52, m = { l: Math.min(96, w * 0.24), r: 78, t: 6, b: 28 }, h = m.t + m.b + rows.length * rowH;
    const svg = App.svg(el, w, h, `RR ${kind === 'bat' ? 'batting' : 'bowling'} value vs par by phase, 2025 and 2026`);
    const vals = rows.flatMap(r => ['2025', '2026'].map(y => D[r][y][kind].v100));
    const ext = Math.max(20, d3.max(vals, Math.abs) * 1.1);
    const x = d3.scaleLinear([-ext, ext], [m.l + 78, w - m.r]).nice();
    svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(h - m.t - m.b)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => (d > 0 ? '+' : '') + d)).select('.domain').remove();
    svg.append('line').attr('stroke', '#7A8597').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t).attr('y2', h - m.b);
    rows.forEach((r, i) => {
      const y0 = m.t + i * rowH;
      svg.append('text').attr('class', 'lbl').attr('x', m.l - 10).attr('y', y0 + rowH / 2 + 4).attr('text-anchor', 'end').style('font-weight', r === 'Close death' ? 700 : 400).text(r);
      ['2025', '2026'].forEach((yr, j) => {
        const d = D[r][yr][kind], yy = y0 + 8 + j * 18, bh = 15;
        const x0 = x(Math.min(0, d.v100)), wd = Math.max(1.5, Math.abs(x(d.v100) - x(0)));
        const rect = svg.append('rect').attr('x', x0).attr('y', yy).attr('width', wd).attr('height', bh).attr('rx', 3).attr('fill', yr === '2026' ? C.pink : C.blueL);
        svg.append('text').attr('class', 'lbl').attr('x', d.v100 >= 0 ? x(d.v100) + 6 : x(d.v100) - 6).attr('y', yy + bh - 3).attr('text-anchor', d.v100 >= 0 ? 'start' : 'end').text(`${sg(d.v100)} · ${App.ord(d.rank)}`);
        App.hover(rect, () => `<b>RR ${kind === 'bat' ? 'batting' : 'bowling'} · ${r} · ${yr}</b><span>${sg(d.v100)} vs par per 100 balls, ${App.ord(d.rank)} of ${d.teams}</span><span>${kind === 'bat' ? `SR ${f(d.sr)} vs par ${f(d.xsr)}` : `Economy ${f(d.econ, 2)} vs par ${f(d.xecon, 2)}`}</span><span>${App.int(d.n)} balls</span>`);
      });
    });
  }

  function jaipur(el, w) {
    const C = App.C, J = App.DB.warroom.jaipur;
    const rows = ['Powerplay|Pace', 'Powerplay|Spin', 'Middle|Pace', 'Middle|Spin', 'Death|Pace', 'Death|Spin'];
    const rowH = 36, m = { l: 128, r: 20, t: 8, b: 30 }, h = m.t + m.b + rows.length * rowH;
    const svg = App.svg(el, w, h, 'Economy at Jaipur vs all IPL venues by phase and bowling type');
    const x = d3.scaleLinear([7.5, 12], [m.l, w - m.r]);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(h - m.t - m.b)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(5)).select('.domain').remove();
    rows.forEach((k, i) => {
      const y = m.t + i * rowH + rowH / 2, a = J[k].ipl, b = J[k].jaipur, [ph, ty] = k.split('|');
      svg.append('text').attr('class', 'lbl').attr('x', m.l - 10).attr('y', y + 4).attr('text-anchor', 'end').text(`${ph} · ${ty.toLowerCase()}`);
      svg.append('line').attr('x1', x(a.econ)).attr('x2', x(b.econ)).attr('y1', y).attr('y2', y).attr('stroke', C.grey).attr('stroke-width', 3);
      const g = svg.append('g');
      g.append('circle').attr('cx', x(a.econ)).attr('cy', y).attr('r', 6.5).attr('fill', '#8C9AB3').attr('stroke', '#fff').attr('stroke-width', 2);
      g.append('circle').attr('cx', x(b.econ)).attr('cy', y).attr('r', 7.5).attr('fill', C.pink).attr('stroke', '#fff').attr('stroke-width', 2);
      g.append('rect').attr('x', m.l).attr('y', y - rowH / 2).attr('width', w - m.l - m.r).attr('height', rowH).attr('fill', 'transparent');
      App.hover(g, () => `<b>${ph} · ${ty}</b><span>Jaipur ${f(b.econ, 2)} an over (${App.int(b.balls)} balls), a wicket every ${f(b.bsr)} balls</span><span>All IPL ${f(a.econ, 2)} an over, a wicket every ${f(a.bsr)} balls</span>`);
    });
  }

  function curve(el, w, res, mode, need, names) {
    const C = App.C, h = 260, m = { l: 44, r: 16, t: 14, b: 40 };
    const svg = App.svg(el, w, h, 'RR win chance across targets');
    const base = res[0].V, lo0 = [], N = base.length - 1;
    const rrWin = (V, n) => mode === 'defend' ? 1 - V[n] : V[n];
    let a = 1, b = N;
    for (let n = 1; n <= N; n++) { const v = rrWin(base, n); if (mode === 'defend' ? v < 0.03 : v > 0.97) a = n; }
    for (let n = N; n >= 1; n--) { const v = rrWin(base, n); if (mode === 'defend' ? v > 0.97 : v < 0.03) b = n; }
    a = Math.max(1, Math.min(a, need - 4)); b = Math.min(N, Math.max(b, need + 4));
    const x = d3.scaleLinear([a, b], [m.l, w - m.r]), y = d3.scaleLinear([0, 100], [h - m.b, m.t]);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%')).select('.domain').remove();
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(Math.min(10, b - a))).select('.domain').remove();
    svg.append('text').attr('class', 'lbl-m').attr('x', w - m.r).attr('y', h - 6).attr('text-anchor', 'end').text('Runs the batting side needs →');
    svg.append('line').attr('class', 'ref').attr('x1', x(need)).attr('x2', x(need)).attr('y1', m.t).attr('y2', h - m.b);
    svg.append('text').attr('class', 'lbl').style('font-weight', 600).attr('x', x(need) + 5).attr('y', m.t + 10).text(`${need} needed`);
    const cols = [C.ink2, C.pink, C.blue, C.gold];
    const xs = d3.range(a, b + 1);
    res.forEach((r, i) => {
      if (!r.V) return;
      svg.append('path').datum(xs).attr('fill', 'none').attr('stroke', cols[i]).attr('stroke-width', i === 0 ? 2 : 2.5).attr('stroke-dasharray', i === 0 ? '5 4' : null)
        .attr('d', d3.line(n => x(n), n => y(100 * rrWin(r.V, n))));
    });
    // crosshair
    const cross = svg.append('g').style('display', 'none');
    cross.append('line').attr('y1', m.t).attr('y2', h - m.b).attr('stroke', C.mute);
    const dots = res.map((r, i) => cross.append('circle').attr('r', 5).attr('fill', cols[i]).attr('stroke', '#fff').attr('stroke-width', 2));
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b).attr('fill', 'transparent')
      .on('pointermove', ev => {
        const [px] = d3.pointer(ev), n = Math.max(a, Math.min(b, Math.round(x.invert(px))));
        cross.style('display', null).select('line').attr('x1', x(n)).attr('x2', x(n));
        res.forEach((r, i) => dots[i].attr('cx', x(n)).attr('cy', y(100 * rrWin(r.V, n))));
        App.tipShow(ev, `<b>${n} needed</b>` + res.map((r, i) => `<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cols[i]};margin-right:6px"></i>${esc(names[i])}: RR win ${f(100 * rrWin(r.V, n), 1)}%</span>`).join(''));
      })
      .on('pointerleave', () => { cross.style('display', 'none'); App.tipHide(); });
    return cols;
  }

  function waffle(el, base, pick, pickName) {
    const b = Math.round(base * 100), p = Math.round(pick * 100);
    const cells = d3.range(100).map(i => i < Math.min(b, p) ? 'win' : i < Math.max(b, p) ? (p > b ? 'gain' : 'lost') : 'loss');
    el.innerHTML = `<div class="waffle" role="img" aria-label="Out of 100 finishes: ${b} wins for the baseline, ${p} with ${esc(pickName)}">${cells.map((c, i) => `<i class="${c}" style="--d:${i * 7}ms"></i>`).join('')}</div>`;
  }

  function simulator(main, r) {
    const C = App.C, B = App.DB.simbase, W = App.DB.warroom;
    const st = App.state.sim = App.state.sim || { mode: 'defend' };
    if (r.side) st.mode = r.side === 'bowl' ? 'defend' : 'chase';
    const side = () => st.mode === 'defend' ? 'bowl' : 'bat';
    const init = mode => {
      const d = DEFAULTS[mode], s = mode === 'defend' ? 'bowl' : 'bat';
      st[mode] = st[mode] || { need: d.need, balls: d.balls, wkts: d.wkts, a: App.byName(s, d.a).id, b: App.byName(s, d.b).id };
    };
    init('defend'); init('chase');
    if (r.id && App.get(side(), r.id)) st[st.mode].a = r.id;
    const box = main.querySelector('#sim');
    box.innerHTML = `
<div class="card sim-ctl">
  <div class="field"><label>Scenario</label><div id="mode"></div></div>
  <div class="field"><label for="s-need">Runs the batting side needs</label><div class="row"><input id="s-need" type="range" min="6" max="90" step="1"><output id="o-need"></output></div></div>
  <div class="field"><label for="s-balls">Balls left</label><div class="row"><input id="s-balls" type="range" min="12" max="36" step="6"><output id="o-balls"></output></div></div>
  <div class="field"><label for="s-wkts">Batting side's wickets in hand</label><div class="row"><input id="s-wkts" type="range" min="1" max="10" step="1"><output id="o-wkts"></output></div></div>
  <div class="field"><label for="s-a" id="l-a"></label><select class="select" id="s-a"></select></div>
  <div class="field"><label for="s-b" id="l-b"></label><select class="select" id="s-b"></select></div>
  <p class="note" id="s-how"></p>
</div>
<div class="card sim-out" aria-live="polite">
  <div class="split"><div><p class="kicker" id="o-kick"></p><h3 class="h3 mt-8" id="o-head"></h3></div><div class="delta-badge" id="o-delta"></div></div>
  <div id="o-bars"></div>
  <div class="grid g2 mt-16" style="align-items:center"><div id="o-waffle"></div><p class="note" id="o-waf"></p></div>
</div>`;
    const ctl = box.querySelector('.sim-ctl');
    box.querySelector('#mode').appendChild(App.seg([['defend', 'RR defend'], ['chase', 'RR chase']], st.mode, v => { st.mode = v; fill(); run(); }, 'Scenario'));
    const $ = id => box.querySelector(id);
    function fill() {
      const s = st[st.mode], sd = side();
      $('#s-need').value = s.need; $('#s-balls').value = s.balls; $('#s-wkts').value = s.wkts;
      $('#l-a').textContent = st.mode === 'defend' ? 'Signing A bowls every other over, starting now' : 'Signing A is on strike';
      $('#l-b').textContent = st.mode === 'defend' ? 'Signing B (and A + B sharing the overs)' : 'Signing B (and A + B batting together)';
      $('#s-a').innerHTML = App.playerOptions(sd, s.a); $('#s-b').innerHTML = App.playerOptions(sd, s.b);
      $('#s-how').innerHTML = st.mode === 'defend'
        ? 'RR bowl the last overs. The other overs go to RR’s 2026 death attack (its own pressure numbers). Opposition batters are league par.'
        : 'RR bat. The non-striker and every new batter play like RR’s 2026 death batting. Bowlers are league par.';
    }
    ['need', 'balls', 'wkts'].forEach(k => $('#s-' + k).addEventListener('input', e => { st[st.mode][k] = +e.target.value; run(); }));
    $('#s-a').addEventListener('change', e => { st[st.mode].a = +e.target.value; run(); });
    $('#s-b').addEventListener('change', e => { st[st.mode].b = +e.target.value; run(); });
    let raf = 0;
    function run() { cancelAnimationFrame(raf); raf = requestAnimationFrame(compute); }
    App.onCleanup(() => cancelAnimationFrame(raf));
    let lastRes = null;
    function compute() {
      const s = st[st.mode], sd = side(), A = App.get(sd, s.a), Bp = App.get(sd, s.b);
      $('#o-need').textContent = s.need; $('#o-balls').textContent = s.balls; $('#o-wkts').textContent = s.wkts;
      const ov = Math.ceil(s.balls / 6), maxN = 90;
      let runs = [];
      if (st.mode === 'defend') {
        const rrb = B.rr_bowl, base = d3.range(ov).map(() => rrb);
        const pa = d3.range(ov).map(i => i % 2 === 0 ? A.sim : rrb), pb = d3.range(ov).map(i => i % 2 === 0 ? Bp.sim : rrb);
        const ab = d3.range(ov).map(i => i % 2 === 0 ? A.sim : Bp.sim);
        runs = [[`RR 2026 death attack`, base], [`${A.name} (${Math.ceil(ov / 2)} of ${ov} overs)`, pa], [`${Bp.name} (${Math.ceil(ov / 2)} of ${ov})`, pb], [`${App.first(A.name)} + ${App.first(Bp.name)} share all ${ov}`, ab]]
          .map(([n, plan]) => ({ n, V: SimCore.solve(B, maxN, s.balls, s.wkts, plan, [LG, LG, LG]) }));
      } else {
        const bench = B.rr_bat, plan = d3.range(ov).map(() => LG);
        runs = [[`RR 2026 death batting`, [bench, bench, bench]], [`${A.name} at the crease`, [A.sim, bench, bench]], [`${Bp.name} at the crease`, [Bp.sim, bench, bench]], [`${App.first(A.name)} + ${App.first(Bp.name)} together`, [A.sim, Bp.sim, bench]]]
          .map(([n, bats]) => ({ n, V: SimCore.solve(B, maxN, s.balls, s.wkts, plan, bats) }));
      }
      const win = r0 => st.mode === 'defend' ? 1 - r0.V[s.need] : r0.V[s.need];
      const ws = runs.map(win), cols = [C.ink2, C.pink, C.blue, C.gold];
      lastRes = runs;
      const dlt = 100 * (ws[1] - ws[0]);
      $('#o-kick').textContent = st.mode === 'defend' ? `Defending ${s.need} off ${s.balls} balls · they have ${s.wkts} wicket${s.wkts > 1 ? 's' : ''} in hand` : `Chasing ${s.need} off ${s.balls} balls · ${s.wkts} wicket${s.wkts > 1 ? 's' : ''} in hand`;
      $('#o-head').textContent = `${A.name} ${dlt >= 0 ? 'adds' : 'costs'} ${Math.abs(dlt).toFixed(1)} points of win chance`;
      $('#o-delta').innerHTML = `${sg(dlt, 1)}<small>pts with ${esc(App.first(A.name))}</small>`;
      $('#o-bars').innerHTML = runs.map((r0, i) => `<div class="bar-row"><div class="bar-lab"><span>${esc(r0.n)}</span><b class="num">${f(100 * ws[i], 1)}%</b></div><div class="track"><div class="fill" style="background:${cols[i]}${i === 0 ? ';opacity:.55' : ''}" data-w="${(100 * ws[i]).toFixed(2)}"></div></div></div>`).join('');
      requestAnimationFrame(() => $('#o-bars').querySelectorAll('.fill').forEach(e => { e.style.width = e.dataset.w + '%'; }));
      waffle($('#o-waffle'), ws[0], ws[1], A.name);
      const b0 = Math.round(ws[0] * 100), b1 = Math.round(ws[1] * 100);
      $('#o-waf').innerHTML = b1 >= b0
        ? `<b>Out of 100 finishes like this</b>, RR win ${b0} with the 2026 ${st.mode === 'defend' ? 'attack' : 'batting'}. With ${esc(A.name)} they win ${b1}: <span class="sw gain"></span> ${b1 - b0} extra wins.`
        : `<b>Out of 100 finishes like this</b>, RR win ${b0} with the 2026 ${st.mode === 'defend' ? 'attack' : 'batting'} and ${b1} with ${esc(A.name)}: <span class="sw lost"></span> ${b0 - b1} wins lost.`;
      const cv = main.querySelector('#curve');
      curveGo && curveGo();
      if (!curveGo) curveGo = App.chart(cv, (el, w) => { if (!lastRes) return; const cs = curve(el, w, lastRes, st.mode, st[st.mode].need, lastRes.map(x => x.n)); main.querySelector('#curve-lg').innerHTML = lastRes.map((x, i) => `<span><i style="background:${cs[i]}"></i>${esc(x.n)}</span>`).join(''); });
    }
    let curveGo = null;
    fill(); compute();
  }

  App.page('war-room', (main, r) => {
    const W = App.DB.warroom, D = W.diag, J = W.jaipur;
    const cd = D['Close death']['2026'], tf = W.tight['2026'];
    const needs = [
      ['Death pace', `RR's close-death bowling cost ${f(cd.bowl.econ, 2)} an over against a par of ${f(cd.bowl.xecon, 2)} in 2026, ${App.ord(cd.bowl.rank)} of 10.`],
      ['Finisher', `RR's death-overs batting ranked ${App.ord(D.Death['2025'].bat.rank)} in 2025 and ${App.ord(D.Death['2026'].bat.rank)} in 2026, even though overall pressure batting was ${App.ord(D.Pressure['2026'].bat.rank)}.`],
      ['Spin', `Jaipur suits spin: ${f(J.Spin.jaipur.econ, 2)} an over against ${f(J.Pace.jaipur.econ, 2)} for pace at the venue.`],
      ['Moneyball', 'Uncapped players whose pressure numbers sit well above their likely price.']
    ];
    const tg = d3.group(W.targets, t => t.need);
    const squad = W.squad.slice().sort((a, b) => Math.min(a.bat ? a.bat.rank : 999, a.bowl ? a.bowl.rank : 999) - Math.min(b.bat ? b.bat.rank : 999, b.bowl ? b.bowl.rank : 999));
    const pl = (name, list) => { const s = list === 'Batting' ? 'bat' : 'bowl', p = App.byName(s, name); return p ? `<a href="${App.link(s, p)}"><b>${esc(name)}</b></a>` : `<b>${esc(name)}</b>`; };
    const simLink = (name, list) => { const s = list === 'Batting' ? 'bat' : 'bowl', p = App.byName(s, name); return p ? `<a class="note" href="#war-room-${s}-${p.id}">Simulate →</a>` : ''; };
    main.innerHTML = `
<section class="dark section-tight"><div class="wrap" style="padding-top:18px;padding-bottom:34px">
  <p class="kicker">War Room · Rajasthan Royals · IPL 2027</p><h1 class="h2">Fix the last four overs</h1>
  <p class="lede">RR's pressure batting ranked ${App.ord(D.Pressure['2026'].bat.rank)} in IPL 2026. Their bowling in close finishes ranked ${App.ord(cd.bowl.rank)}. In 2026 they defended ${tf.def_won} of ${tf.def_n} close finishes. This room turns the index into signings, and puts a number on each one.</p>
  <div class="hero-ctas"><a class="btn btn-pink" href="#" id="to-sim">Jump to the simulator</a></div>
</div></section>

<section class="section-tight"><div class="wrap grid g2">
  <div class="card reveal"><div class="split"><h3>Where RR win and lose</h3><div id="dseg"></div></div>
    <p class="note">Team value vs par per 100 balls, opponent-adjusted, with RR's rank among 10 teams.</p>
    <div class="legend"><span><i style="background:${App.C.blueL}"></i>2025</span><span><i style="background:${App.C.pink}"></i>2026</span></div>
    <div class="chart" id="diag"></div></div>
  <div class="reveal">
    <h2 class="h3">The four needs</h2>
    <div class="grid mt-16">${needs.map(([n, why], i) => `<div class="card need-card"><p class="n">Need ${i + 1} · ${n}</p><p class="note mt-8">${why}</p></div>`).join('')}</div>
  </div>
</div></section>

<section class="section-tight" id="sim-sec"><div class="wrap">
  <div class="reveal"><p class="kicker">Finish simulator</p><h2 class="h2">What is a signing worth in the last four overs?</h2>
  <p class="lede">Pick a finish and a player. Each ball is drawn from how IPL 2025–26 chases actually went in overs 17–20, shifted by each player's shrunk pressure numbers. The page solves the model exactly; the report's 200,000-run Monte Carlo agrees to within 0.3 points.</p></div>
  <div class="sim mt-24" id="sim"></div>
  <div class="card mt-24 reveal"><h3>Across every target</h3><p class="note">RR's win chance as the runs needed change, with the same balls and wickets. Hover to read the lines.</p><div class="legend" id="curve-lg"></div><div class="chart" id="curve"></div></div>
</div></section>

<section class="section-tight"><div class="wrap">
  <div class="reveal"><p class="kicker">Shortlist</p><h2 class="h2">Targets by need</h2><p class="note mt-8">PRI rank on its list, pressure value per 100 balls, and status and price from public reports (14 Nov 2026).</p></div>
  <div class="grid two mt-24">${needs.map(([n]) => `<div class="card reveal"><h3>${n}</h3><div class="tl">${(tg.get(n) || []).map(t => `
    <div class="tl-row"><div>${pl(t.player, t.list)} <span class="pill ${t.role === 'Lead' ? '' : 'grey'}">${esc(t.role)}</span><p class="note">${esc(t.status_and_price)} · ${esc(t.watch_out)}</p></div>
    <div class="r"><b class="num">#${t.pri_rank}</b><br><span class="note num">${sg(t.value_per_100)}/100</span><br>${n === 'Death pace' || n === 'Finisher' ? simLink(t.player, t.list) : ''}</div></div>`).join('')}</div></div>`).join('')}</div>
</div></section>

<section class="section-tight"><div class="wrap grid g2">
  <div class="card reveal"><h3>Jaipur, Sawai Mansingh Stadium</h3><p class="note">Economy at Jaipur (pink) against all IPL venues (grey), ${J.seasons[0]}–${J.seasons[J.seasons.length - 1]}, ${J.matches} matches.</p>
    <div class="jstats mt-16">
      <div><b class="num">${f(J.first_inns)}</b><span class="note">first-innings average (IPL ${f(J.ipl_first_inns)})</span></div>
      <div><b class="num">${f(J.chase_win_pct)}%</b><span class="note">of matches won chasing</span></div>
      <div><b class="num">${J.rr_home.won}/${J.rr_home.played}</b><span class="note">RR home wins</span></div>
    </div>
    <div class="chart mt-16" id="jp"></div></div>
  <div class="card reveal"><h3>RR's 2026 squad on the index</h3><p class="note">Rank on each list (of ${App.DB.players.bat.length} batters, ${App.DB.players.bowl.length} bowlers). A dash means too few pressure balls to rank.</p>
    <div class="tablewrap mt-16" style="box-shadow:none"><table class="t"><thead><tr><th scope="col">Player</th><th class="r" scope="col">Bat rank</th><th class="r" scope="col">Bat PRI</th><th class="r" scope="col">Bowl rank</th><th class="r" scope="col">Bowl PRI</th></tr></thead><tbody>
    ${squad.filter(s => s.bat || s.bowl).map(s => `<tr><td>${s.bat ? `<a href="#player-bat-${s.id}">${esc(s.name)}</a>` : s.bowl ? `<a href="#player-bowl-${s.id}">${esc(s.name)}</a>` : esc(s.name)}</td><td class="r">${s.bat ? s.bat.rank : '–'}</td><td class="r">${s.bat ? f(s.bat.pri) : '–'}</td><td class="r">${s.bowl ? s.bowl.rank : '–'}</td><td class="r">${s.bowl ? f(s.bowl.pri) : '–'}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="note mt-16"><b>Not ranked</b> (too few pressure balls since 2022): ${squad.filter(s => !s.bat && !s.bowl).map(s => esc(s.name)).join(', ')}.</p></div>
</div></section>`;
    let kind = 'bowl';
    const dgo = App.chart(main.querySelector('#diag'), (el, w) => diagChart(el, w, kind));
    main.querySelector('#dseg').appendChild(App.seg([['bowl', 'Bowling'], ['bat', 'Batting']], kind, v => { kind = v; dgo(); }, 'Diagnostics'));
    App.chart(main.querySelector('#jp'), jaipur);
    simulator(main, r);
    const toSim = main.querySelector('#to-sim');
    toSim.addEventListener('click', e => { e.preventDefault(); main.querySelector('#sim-sec').scrollIntoView({ behavior: App.reduced() ? 'auto' : 'smooth' }); });
    if (r.id) setTimeout(() => main.querySelector('#sim-sec').scrollIntoView(), 60);
  });
})();
