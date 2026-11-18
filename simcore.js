/* Finish model used in the War Room.
   Per-ball model is the one in the report's sim.py: league-par outcome distribution for overs 17-20 of
   IPL 2025-26 chases, tilted by each player's shrunk pressure deltas (exponential tilt on runs,
   additive shift on wicket probability). sim.py estimates it with 200,000 Monte Carlo runs; here the
   same Markov chain is solved exactly by dynamic programming, so the page answers instantly. */
(function (root) {
  'use strict';
  function prep(B) {
    if (B.base_mean == null) {
      let m = 0;
      for (let j = 0; j < B.rv.length; j++) m += B.pr[j] * B.rv[j];
      B.base_mean = (1 - B.p_w) * m;
    }
    return B;
  }
  function makeDist(B, dr, dw) {
    prep(B);
    const pw = Math.min(0.4, Math.max(0.01, B.p_w + dw));
    const target = B.base_mean + dr;
    let lo = -3, hi = 3, q = B.pr.slice();
    for (let it = 0; it < 60; it++) {
      const th = (lo + hi) / 2;
      let s = 0;
      q = B.pr.map((p, j) => { const v = p * Math.exp(th * B.rv[j]); s += v; return v; });
      let m = 0;
      for (let j = 0; j < q.length; j++) { q[j] /= s; m += q[j] * B.rv[j]; }
      if ((1 - pw) * m < target) lo = th; else hi = th;
    }
    return { pw, q };
  }
  /* plan: one {dr,dw} per over for the bowling side (+dr = more runs conceded, +dw = more wickets).
     bats: [A, B, bench], each {dr,dw}; A starts on strike, B at the other end, new batters are bench.
     Returns V with V[n] = P(batting side wins) needing n runs (1..maxNeed); a tie counts one half. */
  function solve(B, maxNeed, balls, wkts, plan, bats) {
    prep(B);
    const P = B.p_extra, rv = B.rv, R = rv.length;
    const nOv = Math.ceil(balls / 6);
    const D = [];
    for (let o = 0; o < nOv; o++) {
      const bo = plan[Math.min(o, plan.length - 1)];
      D.push([0, 1, 2].map(s => makeDist(B, bo.dr + bats[s].dr, bo.dw + bats[s].dw)));
    }
    const NN = maxNeed + 1, WW = wkts + 1;
    const S = 9 * NN, L = WW * S;
    const V = new Float64Array((balls + 1) * L);
    const at = (l, w, s, t, n) => l * L + w * S + (s * 3 + t) * NN + n;
    const term = (n, l, w, s, t) => {
      if (n <= 0) return 1;
      if (l <= 0 || w <= 0) return (n === 1 && l <= 0) ? 0.5 : 0;
      return V[at(l, w, s, t, n)];
    };
    for (let l = 1; l <= balls; l++) {
      const o = Math.floor((balls - l) / 6);
      const l2 = l - 1, eov = (l2 % 6 === 0);
      for (let w = 1; w <= wkts; w++) {
        for (let s = 0; s < 3; s++) for (let t = 0; t < 3; t++) {
          const d = D[o][s], pw = d.pw, q = d.q;
          for (let n = 1; n <= maxNeed; n++) {
            const ve = n - 1 <= 0 ? 1 : V[at(l, w, s, t, n - 1)];
            let ws = 2, wt = t;
            if (eov) { ws = t; wt = 2; }
            const vw = term(n, l2, w - 1, ws, wt);
            let vr = 0;
            for (let j = 0; j < R; j++) {
              const r = rv[j];
              let a = s, b = t;
              if (r % 2 === 1) { a = t; b = s; }
              if (eov) { const x = a; a = b; b = x; }
              vr += q[j] * term(n - r, l2, w, a, b);
            }
            V[at(l, w, s, t, n)] = P * ve + (1 - P) * (pw * vw + (1 - pw) * vr);
          }
        }
      }
    }
    const out = new Float64Array(NN);
    for (let n = 1; n <= maxNeed; n++) out[n] = V[at(balls, wkts, 0, 1, n)];
    return out;
  }
  /* Seeded Monte Carlo replay of the same chain: returns per-match results for drawing. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function simulate(B, need, balls, wkts, plan, bats, N, seed) {
    prep(B);
    const rng = mulberry32(seed || 2027);
    const nOv = Math.ceil(balls / 6), D = [];
    for (let o = 0; o < nOv; o++) {
      const bo = plan[Math.min(o, plan.length - 1)];
      D.push([0, 1, 2].map(s => {
        const d = makeDist(B, bo.dr + bats[s].dr, bo.dw + bats[s].dw);
        let c = 0; d.cdf = d.q.map(x => (c += x)); return d;
      }));
    }
    const res = new Float32Array(N), runs = new Int16Array(N);
    for (let i = 0; i < N; i++) {
      let nd = need, left = balls, wk = wkts, st = 0, ns = 1, out = -1;
      while (out < 0) {
        if (rng() < B.p_extra) { nd -= 1; if (nd <= 0) out = 1; continue; }
        const d = D[Math.floor((balls - left) / 6)][st];
        let r = 0, wicket = false;
        if (rng() < d.pw) wicket = true;
        else { const u = rng(); let j = 0; while (j < 5 && d.cdf[j] < u) j++; r = B.rv[j]; }
        nd -= r; left -= 1;
        if (wicket) { wk -= 1; st = 2; }
        else if (r % 2 === 1) { const x = st; st = ns; ns = x; }
        if (left % 6 === 0) { const x = st; st = ns; ns = x; }
        if (nd <= 0) out = 1;
        else if (left <= 0 || wk <= 0) out = (nd === 1 && left <= 0) ? 0.5 : 0;
      }
      res[i] = out; runs[i] = need - nd;
    }
    return { res, runs };
  }
  root.SimCore = { prep, makeDist, solve, simulate };
})(typeof window !== 'undefined' ? window : globalThis);
