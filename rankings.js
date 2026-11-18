/* Rankings: pressure-vs-normal scatter + sortable, filterable leaderboard. */
(function () {
  'use strict';
  const { esc, f, sg } = App;

  const COLS = {
    bat: [
      { k: 'rank', t: '#', num: true },
      { k: 'name', t: 'Player' },
      { k: 'pri', t: 'PRI', num: true },
      { k: 'impact', t: 'Pressure /100', num: true, tip: 'Runs vs par per 100 pressure balls (opponent-adjusted, shrunk)' },
      { k: 'normal', t: 'Normal /100', num: true, tip: 'Same measure outside pressure states' },
      { k: 'delta', t: 'Clutch gap', num: true, tip: 'Pressure minus normal. Shown, not scored: it does not repeat' },
      { k: 'sr', t: 'SR (par)', num: true, get: p => p.p.sr },
      { k: 'consistency', t: 'Consistency', num: true, tip: 'Share of pressure innings where scoring beat par (8-innings prior)' },
      { k: 'wballs', t: 'Pressure balls', num: true },
      { k: 'top10', t: 'Top-10 odds', num: true, tip: 'Share of 300 bootstrap resamples with this player in the top 10' },
      { k: 'band', t: 'Rank range', num: true, get: p => p.band[1], tip: '10th–90th percentile rank across resamples' }
    ],
    bowl: [
      { k: 'rank', t: '#', num: true },
      { k: 'name', t: 'Player' },
      { k: 'pri', t: 'PRI', num: true },
      { k: 'impact', t: 'Pressure /100', num: true, tip: 'Runs saved vs par per 100 pressure balls, wickets valued in runs' },
      { k: 'normal', t: 'Normal /100', num: true, tip: 'Same measure outside pressure states' },
      { k: 'delta', t: 'Clutch gap', num: true, tip: 'Pressure minus normal. Shown, not scored: it does not repeat' },
      { k: 'econ', t: 'Econ (par)', num: true, get: p => p.p.econ },
      { k: 'consistency', t: 'Consistency', num: true, tip: 'Share of pressure spells that beat par (8-spell prior)' },
      { k: 'wballs', t: 'Pressure balls', num: true },
      { k: 'top10', t: 'Top-10 odds', num: true, tip: 'Share of 300 bootstrap resamples with this player in the top 10' },
      { k: 'band', t: 'Rank range', num: true, get: p => p.band[1], tip: '10th–90th percentile rank across resamples' }
    ]
  };

  function cell(side, c, p) {
    switch (c.k) {
      case 'rank': return `<td><span class="rkb${p.rank <= 10 ? ' top' : ''}">${p.rank}</span></td>`;
      case 'name': return `<td><a href="${App.link(side, p)}"><b>${esc(p.name)}</b></a><br><span class="note">${esc(App.where(p))}${p.type ? ' · ' + p.type : ''}</span></td>`;
      case 'pri': return `<td><span class="pribar">${App.minibar(p.pri)}<b class="num">${f(p.pri)}</b></span></td>`;
      case 'impact': case 'normal': case 'delta': return `<td class="r ${p[c.k] > 0 ? 'pos' : p[c.k] < 0 ? 'neg' : ''}">${sg(p[c.k])}</td>`;
      case 'sr': return `<td class="r">${f(p.p.sr)} <span class="note">(${f(p.p.xsr)})</span></td>`;
      case 'econ': return `<td class="r">${f(p.p.econ, 2)} <span class="note">(${f(p.p.xecon, 2)})</span></td>`;
      case 'consistency': return `<td class="r">${Math.round(p.consistency)}%</td>`;
      case 'wballs': return `<td class="r">${App.int(p.wballs)}</td>`;
      case 'top10': return `<td class="r">${Math.round(p.top10)}%</td>`;
      case 'band': return `<td class="r">${p.band[0]}–${p.band[2]}</td>`;
    }
    return '<td></td>';
  }

  function scatter(el, w, side, list, hi, onPick) {
    const C = App.C, h = Math.min(520, Math.max(340, w * 0.6));
    const m = { l: 52, r: 16, t: 16, b: 46 };
    const svg = App.svg(el, w, h, `Scatter: normal-state vs pressure-state value for ${list.length} ranked ${App.SIDE[side].many.toLowerCase()}`);
    const ext = d3.extent(list.flatMap(p => [p.normal, p.impact]));
    const pad = (ext[1] - ext[0]) * 0.06;
    const x = d3.scaleLinear([ext[0] - pad, ext[1] + pad], [m.l, w - m.r]).nice();
    const y = d3.scaleLinear([ext[0] - pad, ext[1] + pad], [h - m.b, m.t]).nice();
    const rr = d3.scaleSqrt(d3.extent(list, p => p.wballs), [3.5, 9]);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(6).tickSize(-(h - m.t - m.b)).tickFormat(''));
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(w - m.l - m.r)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(6));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6));
    svg.selectAll('.axis .domain').remove();
    const lo = Math.max(x.domain()[0], y.domain()[0]), hi2 = Math.min(x.domain()[1], y.domain()[1]);
    svg.append('line').attr('class', 'ref').attr('x1', x(lo)).attr('y1', y(lo)).attr('x2', x(hi2)).attr('y2', y(hi2));
    svg.append('line').attr('stroke', '#9AA3B0').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t).attr('y2', h - m.b);
    svg.append('line').attr('stroke', '#9AA3B0').attr('y1', y(0)).attr('y2', y(0)).attr('x1', m.l).attr('x2', w - m.r);
    svg.append('text').attr('class', 'lbl-m').attr('x', w - m.r).attr('y', h - 8).attr('text-anchor', 'end').text('Normal states: value vs par per 100 balls →');
    svg.append('text').attr('class', 'lbl-m').attr('x', -m.t).attr('y', 14).attr('transform', 'rotate(-90)').attr('text-anchor', 'end').text('Under pressure: value vs par per 100 balls →');
    svg.append('text').attr('class', 'lbl-m').attr('x', x(hi2) - 4).attr('y', y(hi2) + 14).attr('text-anchor', 'end').text('pressure = normal');
    const sorted = list.slice().sort((a, b) => (hi(a) - hi(b)) || (b.rank - a.rank));
    const dots = svg.append('g').selectAll('circle').data(sorted).join('circle')
      .attr('cx', p => x(p.normal)).attr('cy', p => y(p.impact)).attr('r', p => rr(p.wballs))
      .attr('fill', p => p.rank <= 10 ? C.pink : '#8C9AB3').attr('fill-opacity', p => hi(p) ? (p.rank <= 10 ? 0.95 : 0.55) : 0.12)
      .attr('stroke', '#fff').attr('stroke-width', 1.5).style('cursor', 'pointer')
      .on('click', (ev, p) => onPick(p));
    App.hover(dots, p => `<b>#${p.rank} ${esc(p.name)}</b><span>PRI ${f(p.pri)} · ${esc(App.team(p.team))}</span><span>Pressure ${sg(p.impact)} · normal ${sg(p.normal)} per 100</span><span>${App.int(p.wballs)} pressure balls</span>`);
    // labels for the top 10 (greedy de-overlap); fewer on narrow screens
    const lab = list.filter(p => p.rank <= (w < 560 ? 3 : 10) && hi(p)).sort((a, b) => a.rank - b.rank);
    const boxes = [];
    const g = svg.append('g');
    lab.forEach(p => {
      const cx = x(p.normal), cy = y(p.impact), r0 = rr(p.wballs) + 3, txt = App.first(p.name), tw = txt.length * 6.6 + 4;
      const cands = [[cx + r0, cy + 4, 'start'], [cx - r0, cy + 4, 'end'], [cx, cy - r0 - 2, 'middle'], [cx, cy + r0 + 11, 'middle']];
      for (const [tx, ty, an] of cands) {
        const x0 = an === 'start' ? tx : an === 'end' ? tx - tw : tx - tw / 2, b = [x0, ty - 11, x0 + tw, ty + 2];
        if (b[0] < m.l || b[2] > w - m.r || b[1] < 0 || b[3] > h - m.b) continue;
        if (boxes.some(o => !(b[2] < o[0] || b[0] > o[2] || b[3] < o[1] || b[1] > o[3]))) continue;
        boxes.push(b);
        g.append('text').attr('class', 'lbl').attr('x', tx).attr('y', ty).attr('text-anchor', an).attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 3).text(txt);
        break;
      }
    });
  }

  App.page('rankings', (main, r) => {
    const st = App.state.rk = Object.assign({ side: 'bat', q: '', team: '', type: '', sort: 'rank', dir: 1 }, App.state.rk || {});
    if (r.side) st.side = r.side;
    main.innerHTML = `
<section class="dark section-tight"><div class="wrap" style="padding-top:18px;padding-bottom:30px">
  <p class="kicker">Rankings</p><h1 class="h2">Pressure Reliability Index, all qualified players</h1>
  <p class="lede">Ranked if active in 2026 with at least 150 weighted pressure balls and 12 innings (batters) or 180 balls and 12 spells (bowlers). Pink dots and badges are the official top 10.</p>
</div></section>
<section class="section-tight"><div class="wrap">
  <div class="controls" id="ctl"></div>
  <div class="card"><div class="split"><h3 class="h3" id="sc-title"></h3><p class="note">Above the dashed line = better under pressure than normal. Dot size = pressure balls.</p></div><div class="chart mt-16" id="sc"></div></div>
  <p class="note mt-16" id="count"></p>
  <div class="tablewrap mt-8"><table class="t" id="tbl"></table></div>
</div></section>`;
    const ctl = main.querySelector('#ctl');
    const seg = App.seg([['bat', 'Batters'], ['bowl', 'Bowlers']], st.side, v => { st.side = v; st.team = ''; st.type = ''; st.sort = 'rank'; st.dir = 1; build(); }, 'List');
    ctl.appendChild(seg);
    const q = document.createElement('input'); q.className = 'input'; q.type = 'search'; q.placeholder = 'Search a player…'; q.setAttribute('aria-label', 'Search players'); q.value = st.q;
    q.addEventListener('input', () => { st.q = q.value; draw(); });
    ctl.appendChild(q);
    const team = document.createElement('select'); team.className = 'select'; team.setAttribute('aria-label', 'Filter by IPL team');
    team.addEventListener('change', () => { st.team = team.value; draw(); });
    ctl.appendChild(team);
    const type = document.createElement('select'); type.className = 'select'; type.setAttribute('aria-label', 'Filter by bowling type');
    type.innerHTML = '<option value="">Pace and spin</option><option>Pace</option><option>Spin</option>';
    type.addEventListener('change', () => { st.type = type.value; draw(); });
    ctl.appendChild(type);

    function build() {
      const list = App.DB.players[st.side];
      const teams = [...new Set(list.map(p => p.team || '—'))].sort((a, b) => a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b));
      team.innerHTML = '<option value="">All teams</option>' + teams.map(t => `<option value="${esc(t)}"${t === st.team ? ' selected' : ''}>${t === '—' ? 'No IPL side' : esc(t)}</option>`).join('');
      type.style.display = st.side === 'bowl' ? '' : 'none'; type.value = st.type;
      main.querySelector('#sc-title').textContent = st.side === 'bat' ? 'Batters: pressure vs normal' : 'Bowlers: pressure vs normal';
      draw();
    }
    const match = p => (!st.q || p.name.toLowerCase().includes(st.q.toLowerCase().trim())) && (!st.team || (p.team || '—') === st.team) && (!st.type || p.type === st.type);
    var redraw = null;
    function draw() {
      const side = st.side, list = App.DB.players[side], cols = COLS[side];
      const shown = list.filter(match);
      const col = cols.find(c => c.k === st.sort) || cols[0];
      const get = col.get || (p => p[col.k]);
      shown.sort((a, b) => { const va = get(a), vb = get(b); return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * st.dir || a.rank - b.rank; });
      main.querySelector('#count').textContent = `${shown.length} of ${list.length} ${App.SIDE[side].many.toLowerCase()} shown. Brackets show par for the same states. Click a column to sort.`;
      const tbl = main.querySelector('#tbl');
      tbl.innerHTML = `<thead><tr>${cols.map(c => `<th class="sortable${c.num ? ' r' : ''}" data-k="${c.k}" scope="col" ${c.tip ? `title="${esc(c.tip)}"` : ''} aria-sort="${st.sort === c.k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}">${c.t}${st.sort === c.k ? `<span class="arr">${st.dir > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}</tr></thead>
        <tbody>${shown.map(p => `<tr class="click${p.team === 'RR' ? ' rr' : ''}" data-id="${p.id}">${cols.map(c => cell(side, c, p)).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}">No players match.</td></tr>`}</tbody>`;
      tbl.querySelectorAll('th').forEach(th => th.addEventListener('click', () => {
        const k = th.dataset.k; if (st.sort === k) st.dir *= -1; else { st.sort = k; st.dir = (k === 'rank' || k === 'name' || k === 'band' || (k === 'econ')) ? 1 : -1; } draw();
      }));
      tbl.querySelectorAll('tbody tr.click').forEach(tr => tr.addEventListener('click', ev => { if (ev.target.closest('a')) return; App.go(`player-${side}-${tr.dataset.id}`); }));
      ids = new Set(shown.map(p => p.id));
      if (redraw) redraw();
      else redraw = App.chart(main.querySelector('#sc'), (el, w) => scatter(el, w, st.side, App.DB.players[st.side], p => ids.has(p.id) ? 1 : 0, p => App.go(`player-${st.side}-${p.id}`)));
    }
    let ids = new Set();
    build();
  });
})();
