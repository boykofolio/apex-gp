'use strict';
/* =====================================================================
   APEX GP — top-down formula racing (canvas 2D, vector graphics)
   ===================================================================== */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const rand = (a, b) => a + Math.random() * (b - a);
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ---------- tuning ---------- */
const DS = 8, VMAX = 800, ACC = 640, BRAKE = 1550, GRIP = 1450, KMH = 0.432, STEP = 1 / 120;
const CS = 1.56, CAR_HALF = 12 * CS, CAR_R = 10.5 * CS, WMAX = 2.0;
const GEARS = [.27, .39, .50, .60, .70, .80, .90, 1.0];

/* ---------- teams (fictional) ---------- */
const TEAMS = [
  { id: 'mclaren',     n: 'MCLAREN',      f: 'McLaren Formula 1 Team',   c1: '#FF8000', c2: '#1A1B1F', c3: '#47C7FC', ui: '#FF8A1A', bg: '#d86400', num: 4,  drv: 'Lando Norris',      code: 'NOR', ch: 'MCL40',    pu: 'Mercedes M17',  tit: 10, spd: 1.006, acc: 1.004, grip: 1.008 },
  { id: 'ferrari',     n: 'FERRARI',      f: 'Scuderia Ferrari HP',      c1: '#DC0000', c2: '#FFFFFF', c3: '#FFD700', ui: '#FF2A2A', bg: '#9c000c', num: 16, drv: 'Charles Leclerc',   code: 'LEC', ch: 'SF-26',    pu: 'Ferrari 067',   tit: 16, spd: 1.008, acc: 1.006, grip: 1.000 },
  { id: 'redbull',     n: 'RED BULL',     f: 'Oracle Red Bull Racing',   c1: '#1E2B5C', c2: '#DB0A40', c3: '#FFC906', ui: '#FFC906', bg: '#16265e', num: 1,  drv: 'Max Verstappen',    code: 'VER', ch: 'RB22',     pu: 'Red Bull Ford', tit: 6,  spd: 1.010, acc: 1.000, grip: 1.004 },
  { id: 'mercedes',    n: 'MERCEDES',     f: 'Mercedes-AMG Petronas F1', c1: '#C0C6CC', c2: '#111111', c3: '#00D2BE', ui: '#00D2BE', bg: '#2b2e33', num: 63, drv: 'George Russell',    code: 'RUS', ch: 'W17',      pu: 'Mercedes M17',  tit: 8,  spd: 1.004, acc: 1.008, grip: 1.000 },
  { id: 'astonmartin', n: 'ASTON MARTIN', f: 'Aston Martin Aramco F1',   c1: '#00594F', c2: '#CEDC00', c3: '#FFFFFF', ui: '#2fd3b5', bg: '#007a68', num: 14, drv: 'Fernando Alonso',   code: 'ALO', ch: 'AMR26',    pu: 'Honda RA626H',  tit: 0,  spd: 0.998, acc: 1.000, grip: 1.006 },
  { id: 'alpine',      n: 'ALPINE',       f: 'BWT Alpine F1 Team',       c1: '#0A6BE8', c2: '#FF69B4', c3: '#FFFFFF', ui: '#FF79C0', bg: '#8a3fb0', num: 43, drv: 'Franco Colapinto',  code: 'COL', ch: 'A526',     pu: 'Mercedes M17',  tit: 2,  spd: 0.996, acc: 1.002, grip: 1.004 },
  { id: 'haas',        n: 'HAAS',         f: 'MoneyGram Haas F1 Team',   c1: '#EDEDED', c2: '#1C1C1C', c3: '#E6002B', ui: '#FF3344', bg: '#a8101e', num: 31, drv: 'Esteban Ocon',      code: 'OCO', ch: 'VF-26',    pu: 'Ferrari 067',   tit: 0,  spd: 1.000, acc: 0.998, grip: 1.002 },
  { id: 'williams',    n: 'WILLIAMS',     f: 'Atlassian Williams Racing',c1: '#1F5FD6', c2: '#0B1A3A', c3: '#00A3E0', ui: '#4DA3FF', bg: '#1652c2', num: 55, drv: 'Carlos Sainz',      code: 'SAI', ch: 'FW48',     pu: 'Mercedes M17',  tit: 9,  spd: 1.004, acc: 0.996, grip: 0.998 },
  { id: 'racingbulls', n: 'RACING BULLS', f: 'Visa Cash App Racing Bulls',c1: '#F2F2F2', c2: '#1634CC', c3: '#E4002B', ui: '#7d95ff', bg: '#2340b0', num: 6,  drv: 'Isack Hadjar',      code: 'HAD', ch: 'VCARB 03', pu: 'Red Bull Ford', tit: 0,  spd: 0.998, acc: 1.004, grip: 1.000 },
  { id: 'audi',        n: 'AUDI',         f: 'Audi F1 Team',             c1: '#BFC3C8', c2: '#101010', c3: '#FF3B1F', ui: '#FF4B2B', bg: '#6c7178', num: 27, drv: 'Nico Hülkenberg',   code: 'HUL', ch: 'R26',      pu: 'Audi AFR 26',   tit: 0,  spd: 1.002, acc: 1.002, grip: 0.996 },
  { id: 'porsche',     n: 'PORSCHE',      f: 'Porsche F1 Works',         c1: '#E9E9E9', c2: '#151515', c3: '#D5001C', ui: '#E9E9E9', bg: '#3a3b3f', num: 5,  drv: 'Felix Krone',       code: 'KRO', ch: '9F1',      pu: 'Porsche 9F1',   tit: 0,  spd: 0.996, acc: 0.998, grip: 1.002 },
];

/* ---------- settings ---------- */
const S = Object.assign({ team: 0, diff: 1, laps: 3, lefty: false, sound: true, name: '', ctrl: 'wheel' },
  (() => { try { return JSON.parse(localStorage.getItem('apexgp') || '{}'); } catch (e) { return {}; } })());
const saveS = () => { try { localStorage.setItem('apexgp', JSON.stringify(S)); } catch (e) {} };

/* =====================================================================
   TRACK
   ===================================================================== */
const MONACO = {
  name: 'MONACO', sub: 'Circuit de Monaco · Monte Carlo', km: '3.34', scale: 2.2, hw: 150, wall: 34, theme: 'city',
  pts: [[0,1000],[0,400],[0,-60],[30,-230],[180,-320],[500,-460],[840,-690],[990,-850],[1040,-1040],[1150,-1180],[1350,-1230],[1550,-1170],[1640,-1060],[1678,-950],[1689,-860],[1701,-816],[1733,-784],[1777,-772],[1821,-784],[1853,-816],[1865,-860],[1872,-950],[1950,-1030],[2050,-1000],[2130,-900],[2150,-760],[2050,-600],[1800,-430],[1560,-330],[1350,-250],[1240,-200],[1140,-250],[1040,-200],
        [850,-190],[730,-110],[700,80],[740,250],[700,420],[700,900],[720,1280],[650,1440],[700,1600],[660,1790],[460,1860],
        [250,1810],[80,1660],[0,1400]],
  sea: [[900,-20],[1100,-25],[1250,-40],[1460,-108],[1670,-180],[1910,-280],[2190,-470],[2330,-760],[2400,-1150],[3600,-1150],[3600,3200],[1600,3200],[1600,2150],[1250,1950],[900,1950]],
  beach: [[2190,-470],[2330,-760],[2400,-1150],[3600,-1150]],
  piers: [[[1150,150],[1150,1250]],[[1400,250],[1400,1350]],[[950,1600],[1500,1600]],[[2000,-200],[2400,700]]],
  parks: [[1250,-980,230],[300,2350,600],[700,2200,260],[-500,-200,260],[1777,-855,30],[2250,-1350,200]],
  tunnel: [[2150,-760],[1250,-215]],
  decor: [['fountain',1250,-990],['heli',520,2420],['tennis',-420,-180,.35],['tennis',2230,-1380,.35],['pool',-120,1250,0],['pool',1950,-1350,.35]]
};

function crc(p0, p1, p2, p3, t) { // centripetal Catmull-Rom
  const d = (p, q) => Math.pow(Math.hypot(q[0] - p[0], q[1] - p[1]), .5) || 1e-4;
  const t0 = 0, t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), tt = t1 + (t2 - t1) * t;
  const L = (A, B, a, b) => { const w = (tt - a) / (b - a); return [A[0] + (B[0] - A[0]) * w, A[1] + (B[1] - A[1]) * w]; };
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  return L(L(A1, A2, t0, t2), L(A2, A3, t1, t3), t1, t2);
}
const smooth = (a, r, passes) => {
  const N = a.length; let s = Float32Array.from(a);
  for (let p = 0; p < passes; p++) {
    const o = new Float32Array(N);
    for (let i = 0; i < N; i++) { let v = 0; for (let k = -r; k <= r; k++) v += s[(i + k + N) % N]; o[i] = v / (2 * r + 1); }
    s = o;
  }
  return s;
};

function buildTrack(def) {
  const P = def.pts.map(p => [p[0] * def.scale, p[1] * def.scale]), n = P.length, dense = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const steps = Math.max(6, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 3));
    for (let k = 0; k < steps; k++) dense.push(crc(p0, p1, p2, p3, k / steps));
  }
  const X = [dense[0][0]], Y = [dense[0][1]]; let acc = 0;
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1], b = dense[i % dense.length], seg = Math.hypot(b[0] - a[0], b[1] - a[1]); let t0 = 0;
    if (seg < 1e-6) continue;
    while (acc + seg * (1 - t0) >= DS) { t0 += (DS - acc) / seg; acc = 0; X.push(a[0] + (b[0] - a[0]) * t0); Y.push(a[1] + (b[1] - a[1]) * t0); }
    acc += seg * (1 - t0);
  }
  if (Math.hypot(X[X.length - 1] - X[0], Y[Y.length - 1] - Y[0]) < DS * .6) { X.pop(); Y.pop(); }
  const N = X.length, hw = def.hw;
  const T = { def, N, hw, wall: def.wall, city: def.theme === 'city', len: N * DS, x: Float32Array.from(X), y: Float32Array.from(Y),
    tx: new Float32Array(N), ty: new Float32Array(N), nx: new Float32Array(N), ny: new Float32Array(N), ang: new Float32Array(N) };
  for (let i = 0; i < N; i++) {
    const a = (i - 1 + N) % N, b = (i + 1) % N; let dx = X[b] - X[a], dy = Y[b] - Y[a]; const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    T.tx[i] = dx; T.ty[i] = dy; T.nx[i] = -dy; T.ny[i] = dx; T.ang[i] = Math.atan2(dy, dx);
  }
  const k = new Float32Array(N);
  for (let i = 0; i < N; i++) k[i] = wrapA(T.ang[(i + 4) % N] - T.ang[(i - 4 + N) % N]) / (8 * DS);
  T.k = smooth(k, 3, 3);
  const kw = smooth(T.k, 6, 10);
  T.line = new Float32Array(N);
  for (let i = 0; i < N; i++) T.line[i] = Math.sign(kw[i]) * hw * .72 * Math.min(1, Math.abs(kw[i]) * 520);
  T.line = smooth(T.line, 4, 4);
  // target speed profile (corner speed + braking backward pass)
  const ks = smooth(T.k, 4, 3); T.vt = new Float32Array(N);
  for (let i = 0; i < N; i++) T.vt[i] = Math.min(VMAX * 1.08, Math.sqrt(GRIP * .93 / Math.max(Math.abs(ks[i]) * .8, 1e-6)));
  for (let it = 0; it < 2; it++) for (let i = N - 1; i >= 0; i--) { const j = (i + 1) % N; T.vt[i] = Math.min(T.vt[i], Math.sqrt(T.vt[j] ** 2 + 2 * BRAKE * .8 * DS)); }
  // spatial hash
  T.cell = 256; T.grid = new Map();
  for (let i = 0; i < N; i += 2) { const key = Math.floor(X[i] / 256) + ',' + Math.floor(Y[i] / 256); (T.grid.get(key) || T.grid.set(key, []).get(key)).push(i); }
  // kerbs / gravel masks
  T.kerb = new Uint8Array(N); T.grav = new Int8Array(N); // grav: -1 left side, +1 right side
  for (let i = 0; i < N; i++) {
    if (Math.abs(ks[i]) > 1 / 1100) for (let e = -5; e <= 5; e++) T.kerb[(i + e + N) % N] = 1;
    if (def.theme !== 'city' && Math.abs(ks[i]) > 1 / 650) for (let e = -4; e <= 14; e++) T.grav[(i + e + N) % N] = -Math.sign(ks[i]);
  }
  buildScenery(T);
  return T;
}
function nearTrack(T, x, y) {
  const cx = Math.floor(x / 256), cy = Math.floor(y / 256); let best = Infinity, bi = -1;
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
    const l = T.grid.get((cx + a) + ',' + (cy + b)); if (!l) continue;
    for (const i of l) { const d = (x - T.x[i]) ** 2 + (y - T.y[i]) ** 2; if (d < best) { best = d; bi = i; } }
  }
  return [Math.sqrt(best), bi];
}
function offsetRuns(T, off, mask, minClear) { // builds polylines at lateral offset; mask(i) => side (+1/-1) or 0
  const runs = []; let cur = null;
  for (let i = 0; i <= T.N; i++) {
    const j = i % T.N, side = i < T.N ? mask(j) : 0;
    let ok = side !== 0;
    let px, py;
    if (ok) { px = T.x[j] + T.nx[j] * off * side; py = T.y[j] + T.ny[j] * off * side; if (minClear) { const [dd, bi] = nearTrack(T, px, py); let di = Math.abs(bi - j); di = Math.min(di, T.N - di); if (dd < minClear || di > 16) ok = false; } }
    if (ok) { if (!cur) { cur = { p: new Path2D(), x0: px, y0: py, x1: px, y1: py, n: 0 }; cur.p.moveTo(px, py); } else cur.p.lineTo(px, py);
      cur.n++; cur.x0 = Math.min(cur.x0, px); cur.y0 = Math.min(cur.y0, py); cur.x1 = Math.max(cur.x1, px); cur.y1 = Math.max(cur.y1, py); }
    else if (cur) { if (cur.n > 1) runs.push(cur); cur = null; }
  }
  return runs;
}
function buildScenery(T) {
  const N = T.N, hw = T.hw, CH = 48;
  T.chunks = [];
  for (let s = 0; s < N; s += CH) {
    const c = { p: new Path2D(), l: new Path2D(), x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    for (let i = s; i <= s + CH; i++) {
      const j = i % N, x = T.x[j], y = T.y[j], lx = x + T.nx[j] * T.line[j], ly = y + T.ny[j] * T.line[j];
      if (i === s) { c.p.moveTo(x, y); c.l.moveTo(lx, ly); } else { c.p.lineTo(x, y); c.l.lineTo(lx, ly); }
      c.x0 = Math.min(c.x0, x); c.y0 = Math.min(c.y0, y); c.x1 = Math.max(c.x1, x); c.y1 = Math.max(c.y1, y);
    }
    T.chunks.push(c);
  }
  T.kerbs = [...offsetRuns(T, hw + 1, j => T.kerb[j] ? 1 : 0), ...offsetRuns(T, hw + 1, j => T.kerb[j] ? -1 : 0)];
  const Wl = T.wall;
  T.kerbW = new Path2D(); T.kerbR = new Path2D(); T.tyres = new Path2D();
  for (let i = 0; i < N; i += 2) {
    if (!T.kerb[i]) continue; const j = (i + 2) % N, K = ((i >> 1) & 1) ? T.kerbR : T.kerbW;
    for (const sd of [-1, 1]) {
      if (sd === Math.sign(T.k[i]) && 1 / Math.abs(T.k[i]) < hw + 25) continue;
      const q = (k, o) => [T.x[k] + T.nx[k] * o * sd, T.y[k] + T.ny[k] * o * sd], a1 = q(i, hw - 7), a2 = q(i, hw + 12), a3 = q(j, hw + 12), a4 = q(j, hw - 7);
      K.moveTo(a1[0], a1[1]); K.lineTo(a2[0], a2[1]); K.lineTo(a3[0], a3[1]); K.lineTo(a4[0], a4[1]); K.closePath();
    }
    if (Math.abs(T.k[i]) > 1 / 520) { const sd = -Math.sign(T.k[i]);
      for (const o of [Wl + 10, Wl + 21]) { const x = T.x[i] + T.nx[i] * (hw + o) * sd, y = T.y[i] + T.ny[i] * (hw + o) * sd; T.tyres.moveTo(x + 6, y); T.tyres.arc(x, y, 6, 0, 7); } }
  }
  T.zebra = [.1, .3, .45, .62, .9].map(f => Math.round(f * N)).filter(i => Math.abs(T.k[i]) < 1 / 1500);
  T.gravel = T.city ? [] : offsetRuns(T, hw + 70, j => T.grav[j], hw + 40);
  T.barrier = [...offsetRuns(T, hw + Wl, () => 1, hw + Wl - 30), ...offsetRuns(T, hw + Wl, () => -1, hw + Wl - 30)];
  T.stands = []; T.pits = [];
  for (let i = -60; i < 140; i += 30) {
    const j = (i + N) % N, so = hw + Wl + 90, po = hw + Wl + 60;
    T.stands.push({ x: T.x[j] - T.nx[j] * so, y: T.y[j] - T.ny[j] * so, a: T.ang[j] });
    T.pits.push({ x: T.x[j] + T.nx[j] * po, y: T.y[j] + T.ny[j] * po, a: T.ang[j], t: ((i + 60) / 30 | 0) % 11 });
  }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < N; i++) { x0 = Math.min(x0, T.x[i]); y0 = Math.min(y0, T.y[i]); x1 = Math.max(x1, T.x[i]); y1 = Math.max(y1, T.y[i]); }
  T.bbox = [x0, y0, x1, y1];
  const R = rng(7); T.trees = []; T.blds = []; T.yachts = []; T.palms = [];
  if (!T.city) {
    for (let k = 0; k < 4200 && T.trees.length < 900; k++) {
      const x = lerp(x0 - 1200, x1 + 1200, R()), y = lerp(y0 - 1200, y1 + 1200, R());
      const [d] = nearTrack(T, x, y); if (d < hw + 290) continue;
      T.trees.push({ x, y, r: 26 + R() * 30, v: R() * 3 | 0 });
    }
    return;
  }
  const sc = T.def.scale, P = a => [a[0] * sc, a[1] * sc];
  T.seaPts = T.def.sea.map(P); T.seaP = new Path2D(); T.seaPts.forEach((p, i) => i ? T.seaP.lineTo(p[0], p[1]) : T.seaP.moveTo(p[0], p[1])); T.seaP.closePath();
  const sea = (x, y) => inPoly(T.seaPts, x, y), clear = (x, y, m) => nearTrack(T, x, y)[0] > hw + Wl + m;
  const parks = T.def.parks.map(p => [p[0] * sc, p[1] * sc, p[2] * sc]), inPark = (x, y) => parks.some(p => (x - p[0]) ** 2 + (y - p[1]) ** 2 < p[2] ** 2);
  T.piers = T.def.piers.map(q => [P(q[0]), P(q[1])]); T.pierP = new Path2D();
  for (const [a, b] of T.piers) {
    T.pierP.moveTo(a[0], a[1]); T.pierP.lineTo(b[0], b[1]);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    for (let s = 40; s < L - 30; s += 58) for (const sd of [-1, 1]) {
      if (R() < .2) continue; const l = 70 + R() * 95, w = l * (.24 + R() * .06), off = 22 + l / 2;
      const dx = -uy * sd, dy = ux * sd, x = a[0] + ux * s + dx * off, y = a[1] + uy * s + dy * off;
      if (sea(x, y) && clear(x, y, 60)) T.yachts.push({ x, y, l, w, a: Math.atan2(dx, -dy) });
    }
  }
  for (let k = 0; k < 400 && T.yachts.length < 140; k++) {
    const x = lerp(x0, x1 + 1500, R()), y = lerp(y0 - 800, y1 + 1500, R());
    if (sea(x, y) && clear(x, y, 420) && !inPoly(T.seaPts, x - 300, y) === false) T.yachts.push({ x, y, l: 130 + R() * 120, w: 40 + R() * 18, a: R() * 7 });
  }
  const th = .35, cs = Math.cos(th), sn = Math.sin(th), md = v => ((v % 620) + 620) % 620;
  const onStreet = (x, y) => { const u = md(x * cs + y * sn), v = md(-x * sn + y * cs); return u < 125 || u > 495 || v < 125 || v > 495; };
  T.decor = (T.def.decor || []).map(d => ({ t: d[0], x: d[1] * sc, y: d[2] * sc, a: d[3] || 0 }));
  const nearDecor = (x, y, r) => T.decor.some(d => Math.hypot(x - d.x, y - d.y) < r);
  T.streets = new Path2D(); const D = 9000, cx0 = (x0 + x1) / 2, cy0 = (y0 + y1) / 2;
  for (let k = -16; k <= 16; k++) for (const [ax, ay, bx, by] of [[cs, sn, -sn, cs], [-sn, cs, cs, sn]]) {
    const base = Math.round((cx0 * ax + cy0 * ay) / 620) * 620 + k * 620, px = ax * base, py = ay * base;
    T.streets.moveTo(px - bx * D + (bx * (cx0 * bx + cy0 * by)), py - by * D + (by * (cx0 * bx + cy0 * by))); T.streets.lineTo(px + bx * D + (bx * (cx0 * bx + cy0 * by)), py + by * D + (by * (cx0 * bx + cy0 * by)));
  }
  for (let i = 0; i < N; i += 26) {
    if (!T.kerb[i] || T.stands.length > 34) continue; const sd = -Math.sign(T.k[i]) || 1, o = hw + Wl + 95;
    const x = T.x[i] + T.nx[i] * o * sd, y = T.y[i] + T.ny[i] * o * sd;
    if (!sea(x, y) && nearTrack(T, x, y)[0] > hw + Wl + 80 && !nearDecor(x, y, 220)) T.stands.push({ x, y, a: T.ang[i] + (sd > 0 ? Math.PI : 0) });
  }
  T.boats = [];
  for (let k = 0; k < 900 && T.boats.length < 9; k++) { const x = lerp(x0, x1 + 2500, R()), y = lerp(y0 - 1500, y1 + 1500, R());
    if (sea(x, y) && clear(x, y, 500)) T.boats.push({ x, y, a: R() * 7, v: 60 + R() * 90, l: 40 + R() * 30, w: 14 + R() * 6 }); }
  T.isSea = sea;
  for (const p of parks) for (let k = 0; k < p[2] * p[2] / 2200; k++) {
    const a = R() * 7, r = Math.sqrt(R()) * p[2], x = p[0] + Math.cos(a) * r, y = p[1] + Math.sin(a) * r;
    if (!sea(x, y) && clear(x, y, 40) && !nearDecor(x, y, 120)) T.trees.push({ x, y, r: 18 + R() * 22, v: R() * 3 | 0 });
  }
  for (let i = 0; i < N; i += 9) {
    const sd = R() < .5 ? 1 : -1, o = hw + Wl + 42, x = T.x[i] + T.nx[i] * o * sd, y = T.y[i] + T.ny[i] * o * sd;
    if (!sea(x, y) && clear(x, y, 30)) R() < .5 ? T.palms.push({ x, y, r: 26 + R() * 10, a: R() * 7 }) : T.trees.push({ x, y, r: 16 + R() * 9, v: R() * 3 | 0 });
  }
  for (let e = 0; e < T.seaPts.length; e++) {
    const a = T.seaPts[e], b = T.seaPts[(e + 1) % T.seaPts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > 4000) continue;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    for (let s2 = 50; s2 < L; s2 += 95) for (const sd of [1, -1]) {
      const x = a[0] + ux * s2 - uy * sd * 46, y = a[1] + uy * s2 + ux * sd * 46;
      if (!sea(x, y) && clear(x, y, 25)) { T.palms.push({ x, y, r: 28 + R() * 10, a: R() * 7 }); break; }
    }
  }
  if (T.def.beach) { T.beachP = new Path2D(); T.def.beach.map(P).forEach((p, i) => i ? T.beachP.lineTo(p[0], p[1]) : T.beachP.moveTo(p[0], p[1])); }
  for (let gx = x0 - 1700; gx < x1 + 1700; gx += 125) for (let gy = y0 - 1700; gy < y1 + 1700; gy += 125) {
    if (R() < .1) continue;
    const x = gx + R() * 40 - 20, y = gy + R() * 40 - 20;
    if (sea(x, y) || inPark(x, y) || onStreet(x, y) || nearDecor(x, y, 140)) continue;
    const [d, bi] = nearTrack(T, x, y);
    if (d < hw + Wl + 120 || ((bi > N - 80 || (bi >= 0 && bi < 160)) && d < hw + Wl + 300)) continue;
    const big = R() < .15;
    T.blds.push({ x, y, w: (big ? 115 : 66) + R() * 46, h: (big ? 115 : 66) + R() * 46, a: (bi >= 0 && d < 800 ? T.ang[bi] : .35) + (R() < .1 ? .3 : 0),
      c: ROOF[R() * ROOF.length | 0], hg: (big ? 30 : 8) + R() * 22, d: R() < .12 ? 3 : R() < .07 ? 1 : R() < .45 ? 2 : 4 });
    const b = T.blds[T.blds.length - 1];
    if (b.d === 3) { b.cars = []; for (let cx2 = -b.w / 2 + 14; cx2 < b.w / 2 - 10; cx2 += 17) for (const ry of [-b.h / 2 + 16, b.h / 2 - 16]) if (R() < .75) b.cars.push([cx2, ry, CARC[R() * CARC.length | 0]]); }
    if (b.d === 4 && R() < .5) { b.c = TERRA[R() * TERRA.length | 0]; b.hip = 1; }
    b.wc = FAC[R() * FAC.length | 0]; b.bal = R() < .6; b.sh = b.hip && R() < .75; b.H = Math.min(b.hg * 1.6, d < hw + Wl + 320 ? 30 : 88);
  }
  const nearIdx = p => { let b = 1e18, bi = 0; for (let i = 0; i < N; i++) { const dd = (T.x[i] - p[0]) ** 2 + (T.y[i] - p[1]) ** 2; if (dd < b) { b = dd; bi = i; } } return bi; };
  const ia = nearIdx(P(T.def.tunnel[0])), ib = nearIdx(P(T.def.tunnel[1]));
  T.tunP = new Path2D(); T.tunB = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  for (let i = ia, f = true; ; i = (i + 1) % N, f = false) {
    f ? T.tunP.moveTo(T.x[i], T.y[i]) : T.tunP.lineTo(T.x[i], T.y[i]);
    const b = T.tunB; b.x0 = Math.min(b.x0, T.x[i] - 300); b.y0 = Math.min(b.y0, T.y[i] - 300); b.x1 = Math.max(b.x1, T.x[i] + 300); b.y1 = Math.max(b.y1, T.y[i] + 300);
    if (i === ib) break;
  }
}
const CARC = ['#c9c9c9', '#2b2d31', '#a3262b', '#e8e6e0', '#3a5d8f', '#c8a640', '#5c6b54', '#7a7d82'];
const FAC = ['#d3c2a3', '#c9a482', '#c48e76', '#d1a99a', '#dcdad2', '#d4c38c', '#bfb3a3', '#b9a48a'];
const TERRA = ['#9a5a40', '#a8644a', '#8c4f39', '#b06c4e'];
const ROOF = ['#d9d6cf', '#c7c3ba', '#7f5443', '#8b5e4a', '#74503f', '#957c66', '#86817a', '#686a6c', '#a39885', '#8e7056', '#9a9387', '#b3aa98'];
function inPoly(p, x, y) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

/* ---------- textures ---------- */
function makePattern(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return c; }
let PAT = {};
function buildPatterns(ctx) {
  PAT.grass = ctx.createPattern(makePattern(512, (g, s) => {
    g.fillStyle = '#3f6e30'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 64) { g.fillStyle = (i / 64) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.035)'; g.fillRect(0, i, s, 64); }
    const R = rng(3);
    for (let i = 0; i < 260; i++) { g.fillStyle = R() < .5 ? 'rgba(20,50,10,.10)' : 'rgba(170,210,110,.07)'; g.beginPath(); g.arc(R() * s, R() * s, 2 + R() * 9, 0, 7); g.fill(); }
  }), 'repeat');
  PAT.asph = ctx.createPattern(makePattern(256, (g, s) => {
    g.fillStyle = '#2c2e32'; g.fillRect(0, 0, s, s); const R = rng(11);
    for (let i = 0; i < 1400; i++) { const l = R() < .5; g.fillStyle = l ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.09)'; g.fillRect(R() * s, R() * s, 1 + R() * 2, 1 + R() * 2); }
  }), 'repeat');
  PAT.grav = ctx.createPattern(makePattern(128, (g, s) => {
    g.fillStyle = '#d5bd88'; g.fillRect(0, 0, s, s); const R = rng(5);
    for (let i = 0; i < 500; i++) { g.fillStyle = R() < .5 ? 'rgba(120,90,40,.18)' : 'rgba(255,250,230,.25)'; g.fillRect(R() * s, R() * s, 1.5, 1.5); }
  }), 'repeat');
  PAT.city = ctx.createPattern(makePattern(256, (g, s) => {
    g.fillStyle = '#4a4743'; g.fillRect(0, 0, s, s); const R = rng(17);
    for (let i = 0; i < 900; i++) { g.fillStyle = R() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.07)'; g.fillRect(R() * s, R() * s, 1 + R() * 3, 1 + R() * 3); }
  }), 'repeat');
  PAT.water = ctx.createPattern(makePattern(512, (g, s) => {
    const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#183847'); gr.addColorStop(1, '#183847');
    g.fillStyle = gr; g.fillRect(0, 0, s, s); const R = rng(23); g.lineCap = 'round';
    for (let i = 0; i < 160; i++) { const x = R() * s, y = R() * s, l = 8 + R() * 26; g.strokeStyle = `rgba(200,230,240,${.03 + R() * .05})`; g.lineWidth = 1 + R() * 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 3, x + l, y); g.stroke(); }
  }), 'repeat');
  PAT.tiles = ctx.createPattern(makePattern(64, (g, s) => {
    g.fillStyle = '#9a9184'; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(70,60,50,.35)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, s / 2); g.lineTo(s / 2, 0); g.lineTo(s, s / 2); g.lineTo(s / 2, s); g.closePath(); g.stroke();
    g.fillStyle = 'rgba(190,140,100,.18)'; g.beginPath(); g.moveTo(s / 2, 12); g.lineTo(s - 12, s / 2); g.lineTo(s / 2, s - 12); g.lineTo(12, s / 2); g.fill();
  }), 'repeat');
  PAT.sand = ctx.createPattern(makePattern(128, (g, s) => {
    g.fillStyle = '#cdb68a'; g.fillRect(0, 0, s, s); const R = rng(31);
    for (let i = 0; i < 500; i++) { g.fillStyle = R() < .5 ? 'rgba(120,95,55,.16)' : 'rgba(255,250,235,.22)'; g.fillRect(R() * s, R() * s, 1.5, 1.5); }
  }), 'repeat');
  PAT.crowd = ctx.createPattern(makePattern(64, (g, s) => {
    g.fillStyle = '#2b2f36'; g.fillRect(0, 0, s, s); const R = rng(9), cols = ['#e8e8e8', '#d8091c', '#ffc400', '#0a8bE8', '#ff8700', '#7d8590', '#f4c7a1'];
    for (let y = 2; y < s; y += 7) for (let x = 2; x < s; x += 5) { g.fillStyle = cols[R() * cols.length | 0]; g.beginPath(); g.arc(x + R(), y, 1.7, 0, 7); g.fill(); }
  }), 'repeat');
}

/* =====================================================================
   CAR ART (pure vector, shaded for volume)
   ===================================================================== */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function paintCar(g, t) {
  const C1 = t.c1, C2 = t.c2, C3 = t.c3;
  const tyre = (x, y, w, h) => { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#08080a'); gr.addColorStop(.5, '#3b3d42'); gr.addColorStop(1, '#08080a'); g.fillStyle = gr; rrect(g, x, y, w, h, 1.8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)'; for (let k = 1; k < 5; k++) g.fillRect(x + .5, y + h * k / 5, w - 1, .35); };
  // suspension
  g.strokeStyle = '#18191c'; g.lineWidth = .8; g.beginPath();
  for (const s of [-1, 1]) { g.moveTo(2.5 * s, -16.5); g.lineTo(8.5 * s, -15); g.moveTo(2.8 * s, -12); g.lineTo(8.5 * s, -14); g.moveTo(5 * s, 12); g.lineTo(8.5 * s, 14.5); g.moveTo(4.5 * s, 17); g.lineTo(8.5 * s, 16); }
  g.stroke();
  tyre(-11.8, -19.8, 4.5, 9.6); tyre(7.3, -19.8, 4.5, 9.6); tyre(-12.4, 10, 5.4, 10.6); tyre(7, 10, 5.4, 10.6);
  // floor
  g.fillStyle = '#141519'; g.beginPath(); g.moveTo(-3.5, -9); g.lineTo(-8.8, -3); g.lineTo(-9.2, 12); g.lineTo(-7, 18.5); g.lineTo(7, 18.5); g.lineTo(9.2, 12); g.lineTo(8.8, -3); g.lineTo(3.5, -9); g.fill();
  // rear wing
  g.fillStyle = shade(C2, -.1); rrect(g, -9, 19.4, 18, 4.2, 1); g.fill();
  g.fillStyle = shade(C1, -.25); g.fillRect(-9, 22.2, 18, 1.1);
  g.fillStyle = C3; g.fillRect(-9.7, 18.6, 1.3, 5.8); g.fillRect(8.4, 18.6, 1.3, 5.8);
  // nose
  let gr = g.createLinearGradient(-2.8, 0, 2.8, 0); gr.addColorStop(0, shade(C1, -.4)); gr.addColorStop(.5, shade(C1, .3)); gr.addColorStop(1, shade(C1, -.4));
  g.fillStyle = gr; g.beginPath(); g.moveTo(-1.2, -25.5); g.lineTo(1.2, -25.5); g.lineTo(2.9, -10); g.lineTo(-2.9, -10); g.fill();
  g.fillStyle = C3; g.fillRect(-.9, -25.6, 1.8, 2.2);
  // front wing
  g.fillStyle = shade(C2, -.05); rrect(g, -11.3, -27.6, 22.6, 3.2, 1.2); g.fill();
  g.fillStyle = C1; rrect(g, -10.8, -25, 21.6, 1.3, .6); g.fill();
  g.fillStyle = C3; g.fillRect(-11.8, -28, 1.3, 4.6); g.fillRect(10.5, -28, 1.3, 4.6);
  // body + sidepods
  const body = new Path2D('M0,-12 C2.2,-12 3.2,-9 3.6,-6 C6.8,-5.2 7.7,-1 7.7,3 C7.7,9 5.6,13 3.2,17 L1.6,19.6 L-1.6,19.6 L-3.2,17 C-5.6,13 -7.7,9 -7.7,3 C-7.7,-1 -6.8,-5.2 -3.6,-6 C-3.2,-9 -2.2,-12 0,-12 Z');
  gr = g.createLinearGradient(-7.7, 0, 7.7, 0);
  gr.addColorStop(0, shade(C1, -.5)); gr.addColorStop(.17, C1); gr.addColorStop(.4, shade(C1, .22)); gr.addColorStop(.5, shade(C1, .32)); gr.addColorStop(.6, shade(C1, .22)); gr.addColorStop(.83, C1); gr.addColorStop(1, shade(C1, -.5));
  g.fillStyle = gr; g.fill(body);
  g.save(); g.clip(body);
  g.fillStyle = C2; g.globalAlpha = .92;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(7.8 * s, 1); g.bezierCurveTo(6 * s, -2, 4.5 * s, -4.5, 3.4 * s, -6.5); g.lineTo(2.2 * s, -6.5); g.bezierCurveTo(3.5 * s, 0, 4.5 * s, 7, 5 * s, 14); g.lineTo(7.8 * s, 9); g.fill(); }
  g.globalAlpha = 1; g.fillStyle = C3; for (const s of [-1, 1]) g.fillRect(s > 0 ? 5.8 : -6.6, 2, .8, 6);
  g.restore();
  // engine cover spine
  gr = g.createLinearGradient(-1.8, 0, 1.8, 0); gr.addColorStop(0, shade(C2, -.35)); gr.addColorStop(.5, shade(C2, .25)); gr.addColorStop(1, shade(C2, -.35));
  g.fillStyle = gr; rrect(g, -1.8, -1.5, 3.6, 18.5, 1.8); g.fill();
  g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(-.25, -10, .5, 26);
  // mirrors
  g.fillStyle = shade(C1, -.3); g.fillRect(-5.6, -6.6, 1.6, .9); g.fillRect(4, -6.6, 1.6, .9);
  // cockpit, helmet, halo
  g.fillStyle = '#09090b'; g.beginPath(); g.ellipse(0, -4.4, 2.5, 4.1, 0, 0, 7); g.fill();
  g.fillStyle = C3; g.beginPath(); g.arc(0, -3.7, 1.9, 0, 7); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.ellipse(0, -4.8, 1.4, .6, 0, 0, 7); g.fill();
  g.strokeStyle = '#1d1e22'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-2.7, -.8); g.quadraticCurveTo(-2.9, -8.8, 0, -9.4); g.quadraticCurveTo(2.9, -8.8, 2.7, -.8); g.moveTo(0, -9.4); g.lineTo(0, -7.2); g.stroke();
  g.fillStyle = '#0c0c0e'; g.beginPath(); g.ellipse(0, .9, 1.25, 1.7, 0, 0, 7); g.fill();
  // global light: top-left key, bottom-right falloff
  g.save(); g.globalCompositeOperation = 'source-atop';
  gr = g.createLinearGradient(-12, -28, 12, 26); gr.addColorStop(0, 'rgba(255,255,255,.20)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)');
  g.fillStyle = gr; g.fillRect(-14, -30, 28, 60); g.restore();
}
const SPR = [];
function buildSprite(i) {
  const t = TEAMS[i], SC = t.pic ? 6 : 4, P = 6;
  const W = t.pic ? 52 * t.pic.width / t.pic.height + 2 : 30, H = t.pic ? 54 : 58;
  const c = document.createElement('canvas'); c.width = Math.ceil(W * SC); c.height = H * SC;
  const g = c.getContext('2d'); g.scale(SC, SC); g.translate(W / 2, H / 2);
  if (t.pic) { g.save(); g.shadowColor = 'rgba(8,8,10,.95)'; g.shadowBlur = 1.4 * SC; drawCarArt(g, i); g.restore(); }
  drawCarArt(g, i);
  if (t.pic) { g.save(); g.globalCompositeOperation = 'source-atop'; const lg = g.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2);
    lg.addColorStop(0, 'rgba(255,255,255,.16)'); lg.addColorStop(.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = lg; g.fillRect(-W, -H, W * 2, H * 2); g.restore(); }
  const s = document.createElement('canvas'); s.width = Math.ceil((W + P * 2) * SC); s.height = (H + P * 2) * SC;
  const h = s.getContext('2d'); h.shadowColor = 'rgba(0,0,0,.6)'; h.shadowBlur = 2.8 * SC; h.shadowOffsetX = s.width;
  h.drawImage(c, P * SC - s.width, P * SC);
  SPR[i] = { car: c, sh: s, W, H, P };
}
function buildSprites() { TEAMS.forEach((_, i) => buildSprite(i)); }
function drawCarArt(g, i) {
  const t = TEAMS[i];
  if (t.pic) { const w = 52 * t.pic.width / t.pic.height; g.drawImage(t.pic, -w / 2, -26, w, 52); } else paintCar(g, t);
}
/* PNG cars: drop top-down images (nose up) into cars/<team>.png — background is cut out automatically */
function cutout(im) {
  const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  const g = c.getContext('2d'); g.drawImage(im, 0, 0, c.width, c.height);
  const W = c.width, H = c.height, d = g.getImageData(0, 0, W, H), p = d.data;
  if (p[3] > 200) {
    const bg = [p[0], p[1], p[2]], seen = new Uint8Array(W * H), st = [];
    for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
    while (st.length) {
      const q = st.pop(); if (seen[q]) continue; seen[q] = 1; const o = q * 4;
      if (Math.abs(p[o] - bg[0]) + Math.abs(p[o + 1] - bg[1]) + Math.abs(p[o + 2] - bg[2]) > 70) continue;
      p[o + 3] = 0; const x = q % W;
      if (x > 0) st.push(q - 1); if (x < W - 1) st.push(q + 1); if (q >= W) st.push(q - W); if (q < W * (H - 1)) st.push(q + W);
    }
    g.putImageData(d, 0, 0);
  }
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[(y * W + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, rot = w > h * 1.15, out = document.createElement('canvas');
  out.width = rot ? h : w; out.height = rot ? w : h; const o = out.getContext('2d');
  if (rot) { o.translate(out.width / 2, out.height / 2); o.rotate(-Math.PI / 2); o.drawImage(c, x0, y0, w, h, -w / 2, -h / 2, w, h); }
  else o.drawImage(c, x0, y0, w, h, 0, 0, w, h);
  return out;
}
function loadCarPNGs() {
  TEAMS.forEach((t, i) => {
    const im = new Image();
    im.onload = () => { try { try { t.pic = cutout(im); } catch (e) { t.pic = im; } buildSprite(i); if (!$('#menu').classList.contains('hidden')) refreshMenu(); } catch (e) { console.warn('PNG', t.n, e); } };
    im.src = 'cars/' + t.id + '.png';
  });
}

/* =====================================================================
   GAME STATE
   ===================================================================== */
const cv = $('#c'), ctx = cv.getContext('2d');
let DPR = 1, isDesk = matchMedia('(hover:hover) and (pointer:fine)').matches;
if (isDesk) document.body.classList.add('desktop');
const G = { mode: 'menu', net: null, track: null, cars: [], me: -1, follow: 0, laps: 3, t: 0, lt: 0, phase: 'grid', lightsOut: 5.8, paused: false,
  skids: new Float32Array(2400 * 4), skidN: 0, parts: [], order: [], resT: -1, snaps: [] };
const cam = { x: 0, y: 0, a: 0, z: .8, shake: 0 };

function slotPos(T, slot) {
  const i = ((-(slot >> 1) * 17 - 7 - (slot & 1) * 8) % T.N + T.N) % T.N, off = ((slot & 1) ? 1 : -1) * T.hw * .45;
  return { i, x: T.x[i] + T.nx[i] * off, y: T.y[i] + T.ny[i] * off, h: Math.atan2(T.tx[i], -T.ty[i]), off };
}
function makeCar(team, slot, o) {
  const p = slotPos(G.track, slot);
  return Object.assign({ team, slot, x: p.x, y: p.y, h: p.h, vx: 0, vy: 0, vF: 0, vL: 0, steer: 0, thr: 0, brk: 0, idx: p.i, d: p.off,
    lap: 0, half: true, prog: 0, fin: false, finT: 0, best: Infinity, last: 0, lapStart: 0, human: null, name: TEAMS[team].code,
    skill: 1, sk: 1, react: rand(.03, .2), avoid: 0, mist: 0, stuck: 0, slide: 0, tow: 0, surf: 0, wl: null, rx: p.x, ry: p.y, rh: p.h }, o);
}
function difficultyRange() { return [[.80, .90], [.895, .985], [.95, 1.025]][S.diff]; }

function startRace(grid, laps, net) {
  G.track = G.track || buildTrack(MONACO);
  const [lo, hi] = difficultyRange();
  const bots = grid.filter(g => !g.human).length; let bk = 0;
  G.cars = grid.map((g, slot) => {
    const c = makeCar(g.team, slot, { human: g.human, name: g.name || TEAMS[g.team].code, id: slot });
    if (!g.human) { c.skill = g.skill || lerp(hi, lo, bk / Math.max(1, bots - 1)); bk++; c.lineAmt = .55 + .45 * c.skill; }
    return c;
  });
  G.me = G.cars.findIndex(c => c.human === 'local'); G.follow = Math.max(0, G.me);
  G.laps = laps; G.net = net; G.t = 0; G.lt = 0; G.phase = net === 'attract' ? 'race' : 'grid'; G.lightsOut = 5 + rand(.4, 1.3);
  G.skidN = 0; G.parts.length = 0; G.order = []; G.resT = -1; G.snaps = []; G.paused = false; G.shownLights = -1;
  G.mode = net === 'attract' ? 'attract' : 'race';
  const c = G.cars[G.follow]; cam.x = c.x; cam.y = c.y; cam.a = c.h;
  if (G.mode === 'race') {
    show(null); $('#hud').classList.remove('hidden'); $('#lights').classList.remove('hidden');
    $$('#lights i').forEach(i => i.classList.remove('on'));
    $('#hLapN').textContent = '/' + laps; $('#hPosN').textContent = '/' + G.cars.length;
    if (isDesk) { $('#deskHint').classList.remove('hidden'); setTimeout(() => $('#deskHint').classList.add('hidden'), 6000); }
    buildMini();
  } else $('#hud').classList.add('hidden');
}
function startSolo() {
  const others = TEAMS.map((_, i) => i).filter(i => i !== S.team).sort(() => Math.random() - .5);
  const grid = others.map(t => ({ team: t, human: null }));
  grid.splice(5, 0, { team: S.team, human: 'local', name: myName() });
  startRace(grid, S.laps, null);
}
function startAttract() {
  G.track = G.track || buildTrack(MONACO);
  const grid = TEAMS.map((_, i) => ({ team: i, human: null, skill: rand(.9, 1) }));
  startRace(grid, 999, 'attract');
  G.follow = G.cars.findIndex(c => c.team === S.team);
  const c = G.cars[G.follow]; cam.x = c.x; cam.y = c.y; cam.a = c.h;
  show('menu');
}

/* =====================================================================
   PHYSICS
   ===================================================================== */
function trackPos(c) {
  const T = G.track, N = T.N; let best = 1e18, bi = c.idx;
  for (let k = -22; k <= 22; k++) { const i = (c.idx + k + N) % N, dx = c.x - T.x[i], dy = c.y - T.y[i], d = dx * dx + dy * dy; if (d < best) { best = d; bi = i; } }
  const prev = c.idx; c.idx = bi; c.d = (c.x - T.x[bi]) * T.nx[bi] + (c.y - T.y[bi]) * T.ny[bi];
  if (bi > N * .4 && bi < N * .6) c.half = true;
  if (prev > N * .8 && bi < N * .2) { if (c.half) { c.lap++; c.half = false; onLap(c); } }
  else if (prev < N * .2 && bi > N * .8) { c.lap--; c.half = true; }
  c.prog = c.lap * N + bi;
}
function onLap(c) {
  if (c.lap >= 2) { c.last = G.t - c.lapStart; c.best = Math.min(c.best, c.last); c.lapStart = G.t;
    if (c.human === 'local' && c.lap <= G.laps) banner(c.last <= c.best ? 'BEST LAP' : (c.lap === G.laps ? 'FINAL LAP' : 'LAP ' + c.lap), c.last <= c.best ? '#b06cff' : '#fff'); }
  if (c.lap > G.laps && !c.fin) {
    c.fin = true; c.finT = G.t; G.order.push(c);
    if (c.human === 'local') { banner('FINISH', '#FFC400'); G.resT = 2.6; }
  }
}
function physics(c, dt) {
  const T = G.track, tm = TEAMS[c.team];
  let thr = c.thr, brk = c.brk, steer = c.steer;
  if (G.phase !== 'race') { c.vx = c.vy = c.vF = c.vL = 0; return; }
  const v0F = c.vF;
  // steering → yaw
  const kSteer = steer / (55 + Math.abs(v0F) * .18);
  const slip = Math.atan2(Math.abs(c.vL), Math.abs(v0F) + 1);
  c.h += v0F * kSteer * Math.max(.15, 1 - slip / .7) * dt;
  const fx = Math.sin(c.h), fy = -Math.cos(c.h), rx = -fy, ry = fx;
  let vF = c.vx * fx + c.vy * fy, vL = c.vx * rx + c.vy * ry;
  // surface
  const ad = Math.abs(c.d); let grip = GRIP * tm.grip, vmax = VMAX * tm.spd, drag = 0;
  c.surf = 0;
  if (ad > T.hw + 13) {
    if (T.city) { c.surf = 3; grip *= .92; vmax *= .94; drag = 20; }
    else if (T.grav[c.idx] === Math.sign(c.d) && ad < T.hw + 130) { c.surf = 2; grip *= .42; vmax = 170; drag = 900; }
    else { c.surf = 1; grip *= .55; vmax = 330; drag = 260; }
  } else if (ad > T.hw - 6 && T.kerb[c.idx]) { c.surf = 3; grip *= .96; }
  if (c.tow > 0) vmax *= 1 + .045 * c.tow;
  // longitudinal
  let a = 0;
  if (thr > 0 && vF > -5) { const r = Math.max(0, vF) / vmax; a += thr * ACC * tm.acc * Math.max(0, 1 - r * r) * (r < .25 ? 1.6 : 1); }
  if (brk > 0) { if (vF > 8) a -= brk * BRAKE; else if (thr === 0) a -= brk * 260; }
  if (vF < -110) a = Math.max(a, 0);
  a -= 55 * Math.sign(vF) + drag * Math.sign(vF);
  if (vF > vmax) a -= (vF - vmax) * 1.6;
  if (thr === 0 && brk === 0 && Math.abs(vF) < 8) vF = 0;
  vF += a * dt;
  // lateral grip
  const corr = Math.min(Math.abs(vL), grip * dt); vL -= Math.sign(vL) * corr;
  if (Math.abs(vL) > 28) vF -= Math.sign(vF) * Math.abs(vL) * .9 * dt;
  c.vF = vF; c.vL = vL; c.vx = fx * vF + rx * vL; c.vy = fy * vF + ry * vL;
  c.x += c.vx * dt; c.y += c.vy * dt;
  c.slide = clamp((Math.abs(vL) - 40) / 120, 0, 1) + (brk > .5 && vF > 420 && c.surf === 0 ? .4 : 0);
}
function collide() {
  const cs = G.cars;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const A = cs[i], B = cs[j]; if (Math.abs(A.x - B.x) > 100 || Math.abs(A.y - B.y) > 100) continue;
    const soft = G.phase === 'race' && G.t < 3.5;
    for (let p = -1; p <= 1; p += 2) for (let q = -1; q <= 1; q += 2) {
      const ax = A.x + Math.sin(A.h) * CAR_HALF * p, ay = A.y - Math.cos(A.h) * CAR_HALF * p;
      const bx = B.x + Math.sin(B.h) * CAR_HALF * q, by = B.y - Math.cos(B.h) * CAR_HALF * q;
      let dx = bx - ax, dy = by - ay; const d = Math.hypot(dx, dy);
      if (d >= CAR_R * 2 || d < 1e-3) continue;
      dx /= d; dy /= d; const ov = CAR_R * 2 - d;
      A.x -= dx * ov / 2; A.y -= dy * ov / 2; B.x += dx * ov / 2; B.y += dy * ov / 2;
      const vn = (B.vx - A.vx) * dx + (B.vy - A.vy) * dy;
      if (vn < 0) {
        const J = -(soft ? .12 : .28) * vn; A.vx -= J * dx; A.vy -= J * dy; B.vx += J * dx; B.vy += J * dy;
        A.h += p * 0 * J * Math.sign(dx * Math.cos(A.h) + dy * Math.sin(A.h)); B.h -= q * 0 * J * Math.sign(dx * Math.cos(B.h) + dy * Math.sin(B.h));
        if (A.human === 'local' || B.human === 'local') cam.shake = Math.min(10, cam.shake + 2 + J * .08);
      }
    }
  }
}
function barrier(c) {
  const T = G.track, lim = T.hw + T.wall - 11, ad = Math.abs(c.d);
  if (ad <= lim) return;
  const s = Math.sign(c.d), nx = T.nx[c.idx] * s, ny = T.ny[c.idx] * s, ex = ad - lim;
  c.x -= nx * ex; c.y -= ny * ex;
  const vn = c.vx * nx + c.vy * ny;
  if (vn > 0) {
    const sp = Math.hypot(c.vx, c.vy), tx = T.tx[c.idx], ty = T.ty[c.idx], sg = (c.vx * tx + c.vy * ty) >= 0 ? 1 : -1;
    const keep = sp * (1 - Math.min(.12, vn / (sp + 1) * .25));
    c.vx = tx * sg * keep; c.vy = ty * sg * keep; c.vL = 0;
    c.h += wrapA(Math.atan2(tx * sg, -ty * sg) - c.h) * .5;
    if (c.human === 'local') cam.shake = Math.min(12, 2 + vn * .025);
  }
  c.d = s * lim;
}
function towCalc() {
  const N = G.track.N;
  for (const c of G.cars) {
    c.tow = 0;
    if (c.vF < 300) continue;
    for (const o of G.cars) {
      if (o === c) continue; let ds = o.idx - c.idx; if (ds < -N / 2) ds += N; if (ds > N / 2) ds -= N;
      if (ds > 3 && ds < 34 && Math.abs(o.d - c.d) < 40) { c.tow = 1 - ds / 40; break; }
    }
  }
}

/* ---------- AI ---------- */
function ai(c, dt) {
  const T = G.track, N = T.N, i = c.idx, v = Math.max(0, c.vF);
  if (G.phase === 'race' && G.t < c.react && G.mode !== 'attract') { c.thr = 0; c.brk = 0; c.steer = 0; return; }
  // mistakes keep the field alive
  c.mist -= dt; if (c.mist < -6 && Math.random() < dt * .05 * (1.12 - c.skill)) c.mist = rand(.8, 1.8);
  c.sk = c.skill * (c.mist > 0 ? 1.07 : 1);
  const la = Math.round((30 + v * .24) / DS), j = (i + la) % N;
  const base = T.line[j] * (c.lineAmt || 1);
  let block = null, bds = 99;
  for (const o of G.cars) {
    if (o === c) continue; let ds = o.idx - i; if (ds < -N / 2) ds += N; if (ds > N / 2) ds -= N;
    if (ds > 0 && ds < 30 && Math.abs(o.d - c.d) < 46 && o.vF < c.vF + 25 && ds < bds) { block = o; bds = ds; }
  }
  let aT = 0;
  if (block) { const side = block.d > base ? -1 : 1; aT = block.d + side * 70 - base; }
  c.avoid = lerp(c.avoid, aT, 1 - Math.exp(-dt * 2.6));
  const off = clamp(base + c.avoid, -T.hw + 14, T.hw - 14);
  const tx = T.x[j] + T.nx[j] * off, ty = T.y[j] + T.ny[j] * off;
  const err = wrapA(Math.atan2(tx - c.x, -(ty - c.y)) - c.h);
  c.steer = clamp(err * (2.6 + c.skill), -1, 1);
  let target = T.vt[(i + 2) % N] * c.sk;
  if (Math.abs(c.d) > T.hw + 10) target *= .8;
  if (block && bds < 9 && Math.abs(c.avoid - aT) > 20) target = Math.min(target, block.vF);
  if (v < target - 6) { c.thr = 1; c.brk = 0; } else if (v > target + 12) { c.thr = 0; c.brk = clamp((v - target) / 80, .25, 1); } else { c.thr = .35; c.brk = 0; }
  // recovery
  const wrong = Math.abs(wrapA(c.h - Math.atan2(T.tx[i], -T.ty[i]))) > 1.7;
  if (G.phase === 'race' && (v < 25 || wrong || Math.abs(c.d) > T.hw + 190)) c.stuck += dt; else c.stuck = Math.max(0, c.stuck - dt);
  if (c.stuck > 2.6) {
    const k = (i + 2) % N; c.x = T.x[k]; c.y = T.y[k]; c.h = Math.atan2(T.tx[k], -T.ty[k]); c.vx = c.vy = c.vF = c.vL = 0; c.stuck = 0; c.idx = k;
  }
}

function simStep(dt) {
  if (G.phase === 'grid') {
    G.lt += dt;
    if (G.lt >= G.lightsOut) { G.phase = 'race'; G.t = 0; }
  } else G.t += dt;
  for (const c of G.cars) {
    if (c.human === 'local' && !c.fin) { c.thr = In.thr; c.brk = In.brk; c.steer = In.steer; }
    else if (!c.human || c.fin) ai(c, dt);
    physics(c, dt);
  }
  collide();
  for (const c of G.cars) { trackPos(c); barrier(c); }
  if ((G.step = (G.step || 0) + 1) % 6 === 0) towCalc();
  if (G.mode === 'attract' && G.cars.some(c => c.lap > 30)) startAttract();
}

/* =====================================================================
   EFFECTS
   ===================================================================== */
function addSkid(x1, y1, x2, y2) { const k = (G.skidN++ % 2400) * 4, s = G.skids; s[k] = x1; s[k + 1] = y1; s[k + 2] = x2; s[k + 3] = y2; }
function effects(dt) {
  const T = G.track;
  if (T.boats) for (const b of T.boats) { const nx = b.x + Math.sin(b.a) * b.v * dt, ny = b.y - Math.cos(b.a) * b.v * dt;
    if (T.isSea(nx + Math.sin(b.a) * 260, ny - Math.cos(b.a) * 260)) { b.x = nx; b.y = ny; } else b.a += dt * 1.2; }
  for (const c of G.cars) {
    const fx = Math.sin(c.h), fy = -Math.cos(c.h), rx = -fy, ry = fx;
    const w = [c.x + rx * 14.9 - fx * 23.4, c.y + ry * 14.9 - fy * 23.4, c.x - rx * 14.9 - fx * 23.4, c.y - ry * 14.9 - fy * 23.4];
    if (c.wl && (c.slide > .25 || (c.surf === 0 && G.phase === 'race' && G.t < 1.2 && c.vF > 20 && c.vF < 260))) {
      if (c.surf === 0 || c.surf === 3) { addSkid(c.wl[0], c.wl[1], w[0], w[1]); addSkid(c.wl[2], c.wl[3], w[2], w[3]); }
      if (Math.random() < c.slide * .7) puff(w[Math.random() < .5 ? 0 : 2], w[1], c, 0);
    }
    if ((c.surf === 1 || c.surf === 2) && c.vF > 60 && Math.random() < .5) puff(w[0], w[1], c, c.surf);
    c.wl = w;
  }
  for (let i = G.parts.length - 1; i >= 0; i--) { const p = G.parts[i]; p.l -= dt; if (p.l <= 0) { G.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 26; p.vx *= .97; p.vy *= .97; }
}
function puff(x, y, c, kind) {
  if (G.parts.length > 260) return;
  G.parts.push({ x, y, vx: c.vx * .25 + rand(-20, 20), vy: c.vy * .25 + rand(-20, 20), r: 5, l: kind ? .5 : 1.1, m: kind ? .5 : 1.1, k: kind });
}

/* =====================================================================
   RENDER
   ===================================================================== */
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * DPR; cv.height = innerHeight * DPR;
}
addEventListener('resize', resize);
function camera(dt) {
  const c = G.cars[G.follow]; if (!c) return;
  const sp = Math.hypot(c.vx, c.vy), base = Math.min(innerHeight / 560, innerWidth / 305) * (G.mode === 'attract' ? .8 : 1) * (isDesk ? 1 : .5);
  cam.z = lerp(cam.z, base * (1 - .3 * Math.min(1, sp / VMAX)), 1 - Math.exp(-dt * 1.5));
  let lx = c.vx * .3, ly = c.vy * .3; const lim = Math.min(innerWidth, innerHeight) * .3 / cam.z, l = Math.hypot(lx, ly);
  if (l > lim) { lx *= lim / l; ly *= lim / l; }
  const k = 1 - Math.exp(-dt * 5); cam.lx = lerp(cam.lx || 0, lx, k); cam.ly = lerp(cam.ly || 0, ly, k);
  cam.x = c.x + cam.lx; cam.y = c.y + cam.ly; cam.a = 0;
  if (c.surf === 1 || c.surf === 2) cam.shake = Math.max(cam.shake, sp > 40 ? 1 + sp / VMAX * 3 : 0);
  else if (c.surf === 3) cam.shake = Math.max(cam.shake, .5 + sp / VMAX * 1.2);
  cam.shake *= Math.exp(-dt * 8);
}
function vis(b, cx, cy, r) { return b.x1 > cx - r && b.x0 < cx + r && b.y1 > cy - r && b.y0 < cy + r; }
function render() {
  const T = G.track, W = cv.width, H = cv.height, z = cam.z * DPR;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sh = cam.shake, sx = rand(-sh, sh) * DPR, sy = rand(-sh, sh) * DPR;
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
  const vr = Math.hypot(W, H) / 2 / z + 40, cx = cam.x, cy = cam.y;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const vc = T.chunks.filter(c => vis(c, cx, cy, vr + 300));
  if (T.city) {
    ctx.fillStyle = PAT.city; ctx.fillRect(cx - vr, cy - vr, vr * 2, vr * 2);
    ctx.lineCap = 'butt'; ctx.strokeStyle = '#3b3c3f'; ctx.lineWidth = 84; ctx.stroke(T.streets);
    ctx.strokeStyle = 'rgba(205,180,90,.55)'; ctx.lineWidth = 3; ctx.setLineDash([26, 26]); ctx.stroke(T.streets); ctx.setLineDash([]); ctx.lineCap = 'round';
    ctx.strokeStyle = PAT.tiles; ctx.lineWidth = 120; ctx.stroke(T.seaP);
    if (T.beachP) { ctx.strokeStyle = PAT.sand; ctx.lineWidth = 230; ctx.stroke(T.beachP); }
    ctx.fillStyle = PAT.water; ctx.fill(T.seaP);
    if (T.beachP) { ctx.save(); ctx.clip(T.seaP); ctx.strokeStyle = 'rgba(70,190,185,.35)'; ctx.lineWidth = 150; ctx.stroke(T.beachP); ctx.strokeStyle = 'rgba(235,250,245,.35)'; ctx.lineWidth = 10; ctx.setLineDash([30, 20]); ctx.stroke(T.beachP); ctx.setLineDash([]); ctx.restore(); }
    ctx.strokeStyle = 'rgba(190,220,230,.07)'; ctx.lineWidth = 46; ctx.stroke(T.seaP);
    ctx.strokeStyle = '#77736b'; ctx.lineWidth = 12; ctx.stroke(T.seaP);
    ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 34;
    ctx.save(); ctx.translate(6, 9); ctx.stroke(T.pierP); ctx.restore();
    ctx.strokeStyle = '#8c8880'; ctx.lineWidth = 30; ctx.stroke(T.pierP); ctx.lineCap = 'round';
    for (const y of T.yachts) if (Math.abs(y.x - cx) < vr + 150 && Math.abs(y.y - cy) < vr + 150) drawYacht(y);
    for (const b of T.boats) if (Math.abs(b.x - cx) < vr + 300 && Math.abs(b.y - cy) < vr + 300) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.fillStyle = 'rgba(235,250,250,.18)';
      ctx.beginPath(); ctx.moveTo(-b.w / 2, b.l / 2); ctx.lineTo(-b.w * 2.5, b.l * 3.5); ctx.lineTo(b.w * 2.5, b.l * 3.5); ctx.lineTo(b.w / 2, b.l / 2); ctx.fill(); ctx.restore(); drawYacht(b); }
    for (const d of T.decor) if (Math.abs(d.x - cx) < vr + 300 && Math.abs(d.y - cy) < vr + 300) drawDecor(d);
    drawBlds(T, cx, cy, vr);
    ctx.strokeStyle = '#66625b'; ctx.lineWidth = (T.hw + T.wall) * 2 + 64; for (const c of vc) ctx.stroke(c.p);
  } else {
    ctx.fillStyle = PAT.grass; ctx.fillRect(cx - vr, cy - vr, vr * 2, vr * 2);
    ctx.strokeStyle = PAT.grav; ctx.lineWidth = 112;
    for (const r of T.gravel) if (vis(r, cx, cy, vr + 60)) ctx.stroke(r.p);
  }
  drawTrees(T, cx, cy, vr); if (T.palms) drawPalms(T, cx, cy, vr);
  ctx.fillStyle = '#1b1c1e'; ctx.fill(T.tyres); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; ctx.stroke(T.tyres);
  for (const r of T.barrier) if (vis(r, cx, cy, vr)) {
    ctx.strokeStyle = 'rgba(0,0,0,.38)'; ctx.lineWidth = 12; ctx.save(); ctx.translate(4, 6); ctx.stroke(r.p); ctx.restore();
    ctx.strokeStyle = '#cdd0d4'; ctx.lineWidth = 8; ctx.stroke(r.p);
    if (T.city) { ctx.lineCap = 'butt'; ctx.setLineDash([46, 90]); ctx.strokeStyle = '#9c2229'; ctx.stroke(r.p); ctx.setLineDash([]); ctx.lineCap = 'round'; }
    ctx.strokeStyle = '#6f757c'; ctx.lineWidth = 1.5; ctx.stroke(r.p);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = T.hw * 2 + 26; for (const c of vc) ctx.stroke(c.p);
  ctx.strokeStyle = '#d3d2cb'; ctx.lineWidth = T.hw * 2 + 6; for (const c of vc) ctx.stroke(c.p);
  ctx.strokeStyle = PAT.asph; ctx.lineWidth = T.hw * 2 - 10; for (const c of vc) ctx.stroke(c.p);
  ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 46; for (const c of vc) ctx.stroke(c.l);
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#d9d8d2'; ctx.fill(T.kerbW); ctx.fillStyle = '#a5252b'; ctx.fill(T.kerbR);
  ctx.fillStyle = 'rgba(235,235,228,.5)';
  for (const i of T.zebra) { if (Math.abs(T.x[i] - cx) > vr + 200 || Math.abs(T.y[i] - cy) > vr + 200) continue;
    ctx.save(); ctx.translate(T.x[i], T.y[i]); ctx.rotate(T.ang[i]); for (let y = -T.hw + 12; y < T.hw - 12; y += 24) ctx.fillRect(-16, y, 32, 13); ctx.restore(); }
  ctx.setLineDash([]); ctx.lineCap = 'round';
  drawStartGrid(T);
  ctx.strokeStyle = 'rgba(8,8,10,.32)'; ctx.lineWidth = 4; ctx.beginPath();
  const n = Math.min(G.skidN, 2400), s = G.skids;
  for (let i = 0; i < n; i++) { const k = i * 4; if (Math.abs(s[k] - cx) > vr || Math.abs(s[k + 1] - cy) > vr) continue; ctx.moveTo(s[k], s[k + 1]); ctx.lineTo(s[k + 2], s[k + 3]); }
  ctx.stroke();
  drawBuildings(T, cx, cy, vr);
  for (const c of G.cars) {
    if (Math.abs(c.rx - cx) > vr || Math.abs(c.ry - cy) > vr) continue;
    const sp = SPR[c.team];
    ctx.save(); ctx.translate(c.rx + 6, c.ry + 9); ctx.rotate(c.rh); ctx.scale(CS, CS); ctx.drawImage(sp.sh, -sp.W / 2 - sp.P, -sp.H / 2 - sp.P, sp.W + sp.P * 2, sp.H + sp.P * 2); ctx.restore();
  }
  for (const c of G.cars) {
    if (Math.abs(c.rx - cx) > vr || Math.abs(c.ry - cy) > vr) continue;
    const sp = SPR[c.team];
    ctx.save(); ctx.translate(c.rx, c.ry); ctx.rotate(c.rh); ctx.scale(CS, CS); ctx.drawImage(sp.car, -sp.W / 2, -sp.H / 2, sp.W, sp.H); ctx.restore();
    if (c.human && c.human !== 'local' && G.mode === 'race') {
      ctx.save(); ctx.translate(c.rx, c.ry); ctx.font = '600 13px Titillium Web'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.55)'; const w = ctx.measureText(c.name).width + 12; ctx.fillRect(-w / 2, -52, w, 18);
      ctx.fillStyle = '#fff'; ctx.fillText(c.name, 0, -39); ctx.restore();
    }
  }
  for (const p of G.parts) {
    const a = p.l / p.m;
    ctx.fillStyle = p.k === 2 ? `rgba(200,170,110,${a * .45})` : p.k === 1 ? `rgba(120,115,105,${a * .4})` : `rgba(225,225,228,${a * .3})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  }
  if (T.tunP && vis(T.tunB, cx, cy, vr)) {
    ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(12,13,16,.62)'; ctx.lineWidth = (T.hw + T.wall) * 2 + 150; ctx.stroke(T.tunP);
    ctx.strokeStyle = 'rgba(255,210,140,.35)'; ctx.lineWidth = 6; ctx.setLineDash([12, 80]); ctx.stroke(T.tunP); ctx.setLineDash([]); ctx.lineCap = 'round';
  }
}
function drawYacht(y) {
  const L = y.l, B = y.w;
  y.p = y.p || new Path2D(`M0,${-L / 2} Q${B / 2},${-L / 4} ${B / 2},${L / 2 - 3} L${-B / 2},${L / 2 - 3} Q${-B / 2},${-L / 4} 0,${-L / 2}Z`);
  ctx.save(); ctx.translate(y.x + 7, y.y + 10); ctx.rotate(y.a); ctx.fillStyle = 'rgba(0,10,15,.35)'; ctx.fill(y.p); ctx.restore();
  ctx.save(); ctx.translate(y.x, y.y); ctx.rotate(y.a);
  ctx.fillStyle = '#e7e9e8'; ctx.fill(y.p);
  ctx.save(); ctx.scale(.8, .86); ctx.fillStyle = '#b4a384'; ctx.fill(y.p); ctx.restore();
  ctx.fillStyle = '#f2f2f0'; ctx.fillRect(-B * .3, -L * .12, B * .6, L * .38);
  ctx.fillStyle = '#2a3740'; ctx.fillRect(-B * .3, -L * .12, B * .6, L * .05);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(B * .05, -L * .12, B * .25, L * .38);
  ctx.restore();
}
function drawPalms(T, cx, cy, vr) {
  const L = T.palms.filter(p => Math.abs(p.x - cx) < vr + 80 && Math.abs(p.y - cy) < vr + 80);
  const leaf = (p, sh) => { for (let k = 0; k < 8; k++) { const a = p.a + k * .785, ca = Math.cos(a), sa = Math.sin(a), r = p.r * (k % 2 ? .85 : 1);
    if (!sh) ctx.fillStyle = k % 2 ? '#2c5627' : '#3b6d31';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + ca * r * .5 - sa * r * .22, p.y + sa * r * .5 + ca * r * .22, p.x + ca * r, p.y + sa * r);
    ctx.quadraticCurveTo(p.x + ca * r * .5 + sa * r * .12, p.y + sa * r * .5 - ca * r * .12, p.x, p.y); ctx.fill(); } };
  ctx.fillStyle = 'rgba(0,0,0,.3)'; for (const p of L) { ctx.save(); ctx.translate(p.r * .6, p.r * .85); leaf(p, 1); ctx.restore(); }
  for (const p of L) { leaf(p, 0); ctx.fillStyle = '#5e4a2e'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .13, 0, 7); ctx.fill(); }
}
function drawDecor(d) {
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a);
  if (d.t === 'fountain') {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(10, 14, 92, 0, 7); ctx.fill();
    ctx.fillStyle = '#bdb6a8'; ctx.beginPath(); ctx.arc(0, 0, 92, 0, 7); ctx.fill();
    ctx.fillStyle = '#2f7f90'; ctx.beginPath(); ctx.arc(0, 0, 74, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(220,245,250,.5)'; ctx.lineWidth = 2; for (const r of [20, 38, 56]) { ctx.beginPath(); ctx.arc(0, 0, r + (performance.now() / 60 % 18), 0, 7); ctx.stroke(); }
    ctx.fillStyle = '#e9e6dd'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill();
  } else if (d.t === 'heli') {
    ctx.fillStyle = '#35373b'; ctx.beginPath(); ctx.arc(0, 0, 90, 0, 7); ctx.fill(); ctx.strokeStyle = '#d9c35a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.stroke();
    ctx.fillStyle = '#eee'; ctx.fillRect(-28, -36, 12, 72); ctx.fillRect(16, -36, 12, 72); ctx.fillRect(-16, -6, 32, 12);
  } else if (d.t === 'tennis') {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-88, -158, 190, 330); ctx.fillStyle = '#b0563a'; ctx.fillRect(-95, -165, 190, 330);
    ctx.fillStyle = '#3d6f8f'; ctx.fillRect(-70, -130, 140, 260); ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 3; ctx.strokeRect(-70, -130, 140, 260);
    ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(70, 0); ctx.moveTo(0, -70); ctx.lineTo(0, 70); ctx.moveTo(-70, -70); ctx.lineTo(70, -70); ctx.moveTo(-70, 70); ctx.lineTo(70, 70); ctx.stroke();
  } else if (d.t === 'pool') {
    ctx.fillStyle = '#d7d2c7'; ctx.fillRect(-150, -90, 300, 180); ctx.fillStyle = '#2aa6c4'; ctx.fillRect(-120, -60, 240, 120);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; for (let y = -40; y <= 40; y += 20) { ctx.beginPath(); ctx.moveTo(-120, y); ctx.lineTo(120, y); ctx.stroke(); }
    ctx.fillStyle = '#f4f1ea'; for (let x = -130; x < 140; x += 26) { ctx.fillRect(x, -84, 14, 18); ctx.fillRect(x, 68, 14, 18); }
  }
  ctx.restore();
}
function drawBlds(T, cx, cy, vr) {
  const L = T.blds.filter(b => Math.abs(b.x - cx) < vr + 260 && Math.abs(b.y - cy) < vr + 320).sort((a, b) => a.y - b.y);
  ctx.fillStyle = 'rgba(6,8,12,.36)';
  for (const b of L) { if (b.d === 3) continue; ctx.save(); ctx.translate(b.x + b.H * .5, b.y + b.H * .2); ctx.rotate(b.a); ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore(); }
  const NL = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (const b of L) {
    const H = b.d === 3 ? 0 : b.H, ca = Math.cos(b.a), sa = Math.sin(b.a), W2 = b.w / 2, H2 = b.h / 2;
    if (H > 0) {
      const C = [[-W2, -H2], [W2, -H2], [W2, H2], [-W2, H2]].map(([x, y]) => [b.x + x * ca - y * sa, b.y + x * sa + y * ca]);
      for (let e = 0; e < 4; e++) {
        const nx = NL[e][0] * ca - NL[e][1] * sa, ny = NL[e][0] * sa + NL[e][1] * ca; if (ny < .08) continue;
        const p1 = C[e], p2 = C[(e + 1) % 4], len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        ctx.save(); ctx.transform(p2[0] - p1[0], p2[1] - p1[1], 0, -H, p1[0], p1[1]);
        ctx.fillStyle = shade(b.wc, -(.06 + (1 - ny) * .22 + (nx > 0 ? .12 : 0))); ctx.fillRect(0, 0, 1, 1);
        const cols = Math.max(1, Math.round(len / 15)), fl = Math.max(1, Math.round(H / 10));
        for (let f = 0; f < fl; f++) {
          const v0 = (f + .3) / fl, vh = .45 / fl;
          ctx.fillStyle = 'rgba(38,50,60,.88)'; for (let k = 0; k < cols; k++) ctx.fillRect((k + .3) / cols, v0, .4 / cols, vh);
          ctx.fillStyle = 'rgba(200,225,240,.18)'; for (let k = 0; k < cols; k++) ctx.fillRect((k + .3) / cols, v0 + vh * .55, .4 / cols, vh * .45);
          if (b.sh) { ctx.fillStyle = 'rgba(72,98,74,.85)'; for (let k = 0; k < cols; k++) { ctx.fillRect((k + .17) / cols, v0, .11 / cols, vh); ctx.fillRect((k + .72) / cols, v0, .11 / cols, vh); } }
          if (b.bal && f > 0) { ctx.fillStyle = 'rgba(242,239,232,.6)'; ctx.fillRect(.03, (f + .26) / fl, .94, .07 / fl); ctx.fillStyle = 'rgba(30,30,32,.35)'; ctx.fillRect(.03, (f + .33) / fl, .94, .03 / fl); }
        }
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, 1, Math.min(.2, 3 / H)); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, 1 - Math.min(.08, 1.5 / H), 1, Math.min(.08, 1.5 / H));
        ctx.restore();
      }
    }
    ctx.save(); ctx.translate(b.x, b.y - H); ctx.rotate(b.a);
    ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.fillStyle = 'rgba(0,0,0,.13)'; ctx.fillRect(-b.w / 2 + 5, -b.h / 2 + 5, b.w - 10, b.h - 10);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, 3); ctx.fillRect(-b.w / 2, -b.h / 2, 3, b.h);
    if (b.d === 1) { ctx.fillStyle = '#2b6f80'; ctx.fillRect(b.w * .05, -b.h * .3, b.w * .3, b.h * .22); }
    else if (b.d === 3) { ctx.fillStyle = '#38393c'; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.strokeStyle = 'rgba(240,240,235,.55)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = -b.w / 2 + 5.5; x < b.w / 2; x += 17) { ctx.moveTo(x, -b.h / 2 + 4); ctx.lineTo(x, -b.h / 2 + 28); ctx.moveTo(x, b.h / 2 - 4); ctx.lineTo(x, b.h / 2 - 28); } ctx.stroke();
      for (const [x, y, col] of b.cars) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 5, y - 8, 12, 19); ctx.fillStyle = col; rrect(ctx, x - 6, y - 10, 12, 20, 3); ctx.fill(); ctx.fillStyle = 'rgba(20,30,40,.75)'; ctx.fillRect(x - 4.5, y - 5, 9, 4); ctx.fillRect(x - 4.5, y + 4, 9, 2.5); } }
    else if (b.hip) { const W2 = b.w / 2, H2 = b.h / 2, f = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.fill(); };
      if (b.w >= b.h) { const r = W2 - H2; f([[-W2, -H2], [W2, -H2], [r, 0], [-r, 0]], 'rgba(255,230,210,.16)'); f([[-W2, H2], [W2, H2], [r, 0], [-r, 0]], 'rgba(0,0,0,.22)'); f([[-W2, -H2], [-W2, H2], [-r, 0]], 'rgba(255,230,210,.07)'); f([[W2, -H2], [W2, H2], [r, 0]], 'rgba(0,0,0,.12)'); }
      else { const r = H2 - W2; f([[-W2, -H2], [-W2, H2], [0, r], [0, -r]], 'rgba(255,230,210,.12)'); f([[W2, -H2], [W2, H2], [0, r], [0, -r]], 'rgba(0,0,0,.2)'); f([[-W2, -H2], [W2, -H2], [0, -r]], 'rgba(255,230,210,.18)'); f([[-W2, H2], [W2, H2], [0, r]], 'rgba(0,0,0,.26)'); } }
    else if (b.d === 2) { ctx.fillStyle = '#4f5256'; ctx.fillRect(-b.w * .3, -b.h * .25, b.w * .16, b.h * .12); ctx.fillRect(b.w * .08, b.h * .06, b.w * .12, b.h * .1); }
    ctx.restore();
  }
}
function drawStartGrid(T) {
  const x = T.x[0], y = T.y[0], a = T.ang[0] + Math.PI / 2;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  for (let i = 0; i < Math.ceil(T.hw * 2 / 8); i++) for (let r = 0; r < 3; r++) { ctx.fillStyle = (i + r) % 2 ? '#111' : '#f4f4f4'; ctx.fillRect(-T.hw + i * 8, -12 + r * 8, 8, 8); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'butt';
  for (let k = 0; k < 11; k++) {
    const p = slotPos(T, k); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.h);
    ctx.beginPath(); ctx.moveTo(-22, -24); ctx.lineTo(-22, -47); ctx.lineTo(22, -47); ctx.lineTo(22, -24); ctx.stroke(); ctx.restore();
  }
  ctx.lineCap = 'round';
}
function drawBuildings(T, cx, cy, vr) {
  for (const s of T.stands) {
    if (Math.abs(s.x - cx) > vr + 200 || Math.abs(s.y - cy) > vr + 200) continue;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-140 + 10, -70 + 14, 280, 150);
    ctx.fillStyle = PAT.crowd; ctx.fillRect(-140, -70, 280, 120);
    ctx.fillStyle = '#e9ebee'; ctx.fillRect(-140, 50, 280, 22); ctx.fillStyle = '#c4c8ce'; ctx.fillRect(-140, 66, 280, 6);
    ctx.fillStyle = '#FFC400'; ctx.fillRect(-140, -74, 280, 5);
    ctx.restore();
  }
  for (const p of T.pits) {
    if (Math.abs(p.x - cx) > vr + 200 || Math.abs(p.y - cy) > vr + 200) continue;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-64 + 10, -40 + 14, 136, 120);
    ctx.fillStyle = '#d9dce0'; ctx.fillRect(-64, -40, 136, 120);
    ctx.fillStyle = '#b9bdc3'; ctx.fillRect(-64, 30, 136, 50);
    ctx.fillStyle = TEAMS[p.t].c1; ctx.fillRect(-60, -46, 128, 10);
    ctx.fillStyle = '#2a2d33'; ctx.fillRect(-56, -36, 120, 8);
    ctx.restore();
  }
}
const TREE_C = [['#22402a', '#2d5534', '#416d45'], ['#1f3b2c', '#2a5039', '#3c6a4c'], ['#2c4524', '#3a5a2d', '#52753c']];
function drawTrees(T, cx, cy, vr) {
  const list = T.trees.filter(t => Math.abs(t.x - cx) < vr + 60 && Math.abs(t.y - cy) < vr + 60);
  ctx.fillStyle = 'rgba(5,10,5,.38)';
  ctx.beginPath(); for (const t of list) { ctx.moveTo(t.x + t.r * .35 + t.r, t.y + t.r * .5); ctx.arc(t.x + t.r * .35, t.y + t.r * .5, t.r, 0, 7); } ctx.fill();
  for (const t of list) {
    const c = TREE_C[t.v];
    ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.fill();
    ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(t.x - t.r * .18, t.y - t.r * .2, t.r * .72, 0, 7); ctx.fill();
    ctx.fillStyle = c[2]; ctx.beginPath(); ctx.arc(t.x - t.r * .36, t.y - t.r * .38, t.r * .34, 0, 7); ctx.fill();
  }
}

/* ---------- minimap ---------- */
let MINI = null;
function trackOutline(cvs, pad, lw, col) {
  const T = G.track, g = cvs.getContext('2d'), [x0, y0, x1, y1] = T.bbox;
  const s = Math.min((cvs.width - pad * 2) / (x1 - x0), (cvs.height - pad * 2) / (y1 - y0));
  const ox = (cvs.width - (x1 - x0) * s) / 2 - x0 * s, oy = (cvs.height - (y1 - y0) * s) / 2 - y0 * s;
  g.clearRect(0, 0, cvs.width, cvs.height); g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); for (let i = 0; i <= T.N; i += 3) { const j = i % T.N; i ? g.lineTo(T.x[j] * s + ox, T.y[j] * s + oy) : g.moveTo(T.x[j] * s + ox, T.y[j] * s + oy); } g.closePath();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = lw + 4; g.stroke(); g.strokeStyle = col; g.lineWidth = lw; g.stroke();
  g.fillStyle = '#FFC400'; g.fillRect(T.x[0] * s + ox - 5, T.y[0] * s + oy - 1.5, 10, 3);
  return { s, ox, oy };
}
function buildMini() {
  const base = document.createElement('canvas'); base.width = base.height = 220;
  MINI = Object.assign(trackOutline(base, 14, 5, 'rgba(255,255,255,.85)'), { base });
}
function drawMini() {
  const m = MINI, c = $('#mini'), g = c.getContext('2d'); if (!m) return;
  g.clearRect(0, 0, 220, 220); g.drawImage(m.base, 0, 0);
  for (const car of G.cars) {
    const me = car.human === 'local', r = me ? 7 : 5;
    g.fillStyle = TEAMS[car.team].c1; g.strokeStyle = me ? '#FFC400' : 'rgba(0,0,0,.6)'; g.lineWidth = me ? 3 : 1.5;
    g.beginPath(); g.arc(car.rx * m.s + m.ox, car.ry * m.s + m.oy, r, 0, 7); g.fill(); g.stroke();
  }
}

/* =====================================================================
   HUD
   ===================================================================== */
const fmt = t => { if (!isFinite(t) || t <= 0) return '—'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3); };
function standings() { return [...G.cars].sort((a, b) => (b.fin - a.fin) || (a.fin ? a.finT - b.finT : b.prog - a.prog)); }
let hudT = 0;
function hud(dt) {
  const me = G.cars[G.me]; if (!me || G.mode !== 'race') return;
  const v = Math.max(0, me.vF), kmh = Math.round(v * KMH);
  let gear = 0; while (gear < 7 && v > GEARS[gear] * VMAX * TEAMS[me.team].spd) gear++;
  const lo = gear ? GEARS[gear - 1] * VMAX : 0, hi = GEARS[gear] * VMAX, rpm = clamp(.42 + .58 * (v - lo) / (hi - lo), .2, 1);
  $('#hSpd').textContent = kmh; const gtxt = G.phase !== 'race' ? 'N' : (me.vF < -5 ? 'R' : gear + 1); $('#hGear').textContent = gtxt; $('#wGear').textContent = gtxt;
  const lit = Math.round(rpm * 12); REVS.forEach((r, i) => r.setAttribute('opacity', i < lit ? 1 : .15));
  Snd.update(G.phase === 'race' ? rpm : .25 + In.thr * .5, In.thr, !G.paused);
  // lights
  if (G.phase === 'grid') {
    const on = Math.min(5, Math.floor(G.lt)); if (on !== G.shownLights) { G.shownLights = on; $$('#lights i').forEach((e, i) => e.classList.toggle('on', i < on)); if (on > 0) Snd.beep(440); }
  } else if (G.shownLights !== 99) { G.shownLights = 99; $('#lights').classList.add('hidden'); banner('GO!', '#24d07a'); Snd.beep(880); }
  hudT -= dt; if (hudT > 0) return; hudT = .1;
  const st = standings(), pos = st.indexOf(me) + 1;
  $('#hPos').textContent = pos; $('#hLap').textContent = clamp(me.lap, 1, G.laps);
  $('#hTime').textContent = fmt(G.phase === 'race' ? (me.fin ? me.finT : G.t - me.lapStart) : 0).replace('—', '0:00.000');
  $('#hBest').textContent = 'BEST ' + fmt(me.best);
  const lead = st[0]; let rows = ''; const from = clamp(pos - 3, 0, Math.max(0, st.length - 5));
  for (let k = from; k < Math.min(st.length, from + 5); k++) {
    const c = st[k], gap = k === 0 ? 'LEAD' : c.fin && lead.fin ? '+' + (c.finT - lead.finT).toFixed(1) : '+' + ((lead.prog - c.prog) * DS / 600).toFixed(1);
    rows += `<div class="${c === me ? 'me' : ''}"><b>${k + 1}</b><i style="background:${TEAMS[c.team].c1}"></i><span>${c.human && c.human !== 'local' ? c.name.slice(0, 3).toUpperCase() : TEAMS[c.team].code}</span><em>${gap}</em></div>`;
  }
  $('#tower').innerHTML = rows;
  drawMini();
}
function banner(txt, col) { const b = $('#banner'); b.classList.add('hidden'); void b.offsetWidth; b.textContent = txt; b.style.color = col || '#fff'; b.classList.remove('hidden'); }
let REVS = [];
(function buildRevs() {
  const g = $('#revs'), cols = ['#24d07a', '#24d07a', '#24d07a', '#24d07a', '#24d07a', '#ff3b3b', '#ff3b3b', '#ff3b3b', '#ff3b3b', '#3d7bff', '#3d7bff', '#3d7bff'];
  cols.forEach((c, i) => { const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('x', -55 + i * 9.4); r.setAttribute('y', -62);
    r.setAttribute('width', 6.5); r.setAttribute('height', 7); r.setAttribute('rx', 2); r.setAttribute('fill', c); r.setAttribute('opacity', .15); g.appendChild(r); REVS.push(r); });
})();

/* =====================================================================
   RESULTS
   ===================================================================== */
function showResults() {
  show('results'); $('#hud').classList.add('hidden'); renderResults();
  $('#rAgain').classList.toggle('hidden', G.net === 'client');
}
function renderResults() {
  const st = standings(), me = G.cars[G.me], lead = st[0];
  $('#rTitle').textContent = 'P' + (st.indexOf(me) + 1);
  $('#rTable').innerHTML = st.map((c, k) => {
    let t; if (k === 0 && c.fin) t = fmt(c.finT); else if (c.fin) t = '+' + (c.finT - lead.finT).toFixed(3); else t = c.lap < lead.lap - 1 ? '+' + (lead.lap - c.lap) + ' LAP' : 'В ГОНКЕ';
    return `<tr class="${c === me ? 'me' : ''}"><td>${k + 1}</td><td><i style="background:${TEAMS[c.team].c1}"></i>${c.human ? c.name : TEAMS[c.team].drv}<span class="muted"> · ${TEAMS[c.team].n}</span></td><td class="t">${fmt(c.best)}</td><td class="t">${t}</td></tr>`;
  }).join('');
}

/* =====================================================================
   INPUT
   ===================================================================== */
const In = { gas: false, brake: false, wheel: 0, wa: false, keys: {}, mx: null, thr: 0, brk: 0, steer: 0, kst: 0 };
addEventListener('keydown', e => { In.keys[e.code] = true; Snd.init(); if (e.code === 'Escape' && G.mode === 'race') openSheet(true); if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code) && G.mode === 'race') e.preventDefault(); });
addEventListener('keyup', e => { In.keys[e.code] = false; });
addEventListener('mousemove', e => { In.mx = e.clientX; In.kbd = false; });
function pedal(el, key) {
  const on = e => { el.setPointerCapture?.(e.pointerId); In[key] = true; el.classList.add('on'); Snd.init(); };
  const off = () => { In[key] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
}
pedal($('#gas'), 'gas'); pedal($('#aL'), 'left'); pedal($('#aR'), 'right'); pedal($('#brake'), 'brake');
(() => {
  const z = $('#wheelZone'); let wp = null;
  z.addEventListener('pointerdown', e => {
    z.setPointerCapture?.(e.pointerId); const r = z.getBoundingClientRect();
    wp = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; wp.a = Math.atan2(e.clientY - wp.cy, e.clientX - wp.cx); In.wa = true; Snd.init();
  });
  z.addEventListener('pointermove', e => {
    if (!wp || e.pointerId !== wp.id) return;
    const dx = e.clientX - wp.cx, dy = e.clientY - wp.cy, a = Math.atan2(dy, dx);
    if (Math.hypot(dx, dy) > 22) In.wheel = clamp(In.wheel + wrapA(a - wp.a), -WMAX, WMAX);
    wp.a = a;
  });
  const end = e => { if (wp && e.pointerId === wp.id) { wp = null; In.wa = false; } };
  z.addEventListener('pointerup', end); z.addEventListener('pointercancel', end); z.addEventListener('lostpointercapture', end);
})();
const wheelEl = $('#wheel');
function readInput(dt) {
  const K = In.keys;
  if (isDesk) {
    const ks = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
    if (ks) { In.kst = clamp(In.kst + ks * dt * 3.5, -1, 1); In.steer = In.kst; In.kbd = true; }
    wheelEl.style.transform = `rotate(${In.steer * WMAX * .8}rad)`;
    if (ks) {} else { In.kst = 0; if (In.kbd) In.steer = 0; if (In.mx != null && !In.kbd) { const d = (In.mx - innerWidth / 2) / (innerWidth * .2); In.steer = clamp(Math.sign(d) * Math.max(0, Math.abs(d) - .03), -1, 1); } }
  } else {
    if (S.ctrl === 'arrows') {
      const ks = (In.right ? 1 : 0) - (In.left ? 1 : 0);
      In.kst = ks ? clamp(In.kst + ks * dt * (Math.sign(In.kst) === -ks ? 9 : 3.2), -1, 1) : In.kst * Math.exp(-dt * 14);
      In.steer = In.kst; In.wheel = 0;
    } else {
    if (!In.wa) In.wheel *= Math.exp(-dt * 9);
    const s = In.wheel / WMAX; In.steer = Math.sign(s) * Math.pow(Math.abs(s), 1.2);
    }
    wheelEl.style.transform = `rotate(${In.wheel}rad)`;
  }
  const gas = In.gas || K.KeyW || K.ArrowUp, brk = In.brake || K.KeyS || K.ArrowDown || K.Space;
  In.thr = gas ? Math.min(1, In.thr + dt * 7) : 0; In.brk = brk ? 1 : 0;
}

/* =====================================================================
   SOUND (synth engine)
   ===================================================================== */
const Snd = {
  ctx: null, L: [],
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const A = window.AudioContext || window.webkitAudioContext, c = new A(); this.ctx = c;
      this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
      (window.ENGINE_WAV || []).forEach((b64, i) => c.decodeAudioData(Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)).buffer).then(buf => {
        const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; s.loop = true; g.gain.value = 0; s.connect(g); g.connect(this.master); s.start(); this.L[i] = { s, g };
      }).catch(() => {}));
    } catch (e) {}
  },
  update(rpm, thr, on) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(on && S.sound && G.mode === 'race' ? .2 + thr * .14 : 0, t, .08);
    const w = [clamp(1 - rpm * 2.2, 0, 1), clamp(1 - Math.abs(rpm - .5) * 2.6, 0, 1), clamp(rpm * 2.2 - 1.1, 0, 1)];
    this.L.forEach((l, i) => { l.g.gain.setTargetAtTime(w[i], t, .05); l.s.playbackRate.setTargetAtTime(.78 + rpm * .75, t, .03); });
  },
  beep(fr) {
    if (!this.ctx || !S.sound) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.value = fr; o.type = 'sine'; g.gain.setValueAtTime(.12, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .35);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .4);
  }
};

/* =====================================================================
   MULTIPLAYER (WebRTC P2P via PeerJS — host simulates, clients render)
   ===================================================================== */
const Net = { peer: null, host: false, conns: new Map(), hc: null, players: [], me: null, code: '', laps: 3, sendT: 0 };
const PREFIX = 'apexgp-r-';
function myName() { return (S.name || 'Player').slice(0, 12); }
function netClose() {
  try { Net.hc && Net.hc.close(); } catch (e) {}
  for (const c of Net.conns.values()) try { c.close(); } catch (e) {}
  try { Net.peer && Net.peer.destroy(); } catch (e) {}
  Object.assign(Net, { peer: null, host: false, conns: new Map(), hc: null, players: [], me: null, code: '' });
}
function genCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.random() * a.length | 0]; return s; }
function freeTeam(pref) { const used = Net.players.map(p => p.team); if (!used.includes(pref)) return pref; return TEAMS.findIndex((_, i) => !used.includes(i)); }
function hostLobby() {
  if (typeof Peer === 'undefined') return toast('Сетевой модуль не загрузился');
  netClose(); const code = genCode(); $('#fStatus').textContent = 'Создаём лобби…';
  const p = new Peer(PREFIX + code, { debug: 0 }); Object.assign(Net, { peer: p, host: true, code, laps: S.laps });
  p.on('open', id => { Net.me = id; Net.players = [{ id, name: myName(), team: S.team, host: 1 }]; show('lobby'); renderLobby(); $('#fStatus').textContent = ''; });
  p.on('connection', conn => {
    conn.on('data', d => hostData(conn, d));
    const drop = () => { Net.conns.delete(conn.peer); Net.players = Net.players.filter(x => x.id !== conn.peer);
      const car = G.cars.find(c => c.human === conn.peer); if (car) { car.human = null; car.skill = .95; car.lineAmt = .9; toast(car.name + ' отключился'); }
      bcastLobby(); };
    conn.on('close', drop); conn.on('error', drop);
  });
  p.on('error', e => { $('#fStatus').textContent = 'Ошибка сети: ' + e.type; });
}
function hostData(conn, d) {
  if (d.t === 'hi') {
    if (G.mode === 'race' && G.net === 'host') { conn.send({ t: 'busy' }); return; }
    if (Net.players.length >= 11) { conn.send({ t: 'full' }); return; }
    Net.conns.set(conn.peer, conn);
    Net.players.push({ id: conn.peer, name: String(d.name || 'Player').slice(0, 12), team: freeTeam(d.team | 0) });
    bcastLobby();
  } else if (d.t === 'pick') {
    const pl = Net.players.find(p => p.id === conn.peer);
    if (pl && d.team >= 0 && d.team < 11 && !Net.players.some(p => p.team === d.team)) pl.team = d.team;
    bcastLobby();
  } else if (d.t === 'in') {
    const c = G.cars.find(c => c.human === conn.peer);
    if (c) { c.thr = clamp(+d.a || 0, 0, 1); c.brk = clamp(+d.b || 0, 0, 1); c.steer = clamp(+d.s || 0, -1, 1); }
  }
}
function bcast(m) { for (const c of Net.conns.values()) if (c.open) c.send(m); }
function bcastLobby() { bcast({ t: 'lobby', players: Net.players, laps: Net.laps, code: Net.code }); renderLobby(); }
function joinLobby(code) {
  if (typeof Peer === 'undefined') return toast('Сетевой модуль не загрузился');
  code = code.toUpperCase().trim(); if (code.length !== 4) return toast('Введите код из 4 букв');
  netClose(); $('#fStatus').textContent = 'Подключаемся…';
  const p = new Peer({ debug: 0 }); Net.peer = p;
  p.on('open', id => {
    Net.me = id; const conn = p.connect(PREFIX + code, { serialization: 'json' }); Net.hc = conn;
    conn.on('open', () => { conn.send({ t: 'hi', name: myName(), team: S.team }); $('#fStatus').textContent = ''; });
    conn.on('data', clientData);
    conn.on('close', () => { if (Net.hc === conn) { toast('Хост отключился'); netClose(); startAttract(); } });
  });
  p.on('error', e => { $('#fStatus').textContent = e.type === 'peer-unavailable' ? 'Комната не найдена' : 'Ошибка сети: ' + e.type; });
}
function clientData(d) {
  if (d.t === 'lobby') { Net.players = d.players; Net.laps = d.laps; Net.code = d.code; if (G.mode !== 'race' && $('#garage').classList.contains('hidden')) show('lobby'); renderLobby(); }
  else if (d.t === 'busy') { toast('Гонка уже идёт — подождите'); }
  else if (d.t === 'full') { toast('Лобби заполнено'); netClose(); }
  else if (d.t === 'start') { startRace(d.grid.map(g => ({ ...g, human: g.human === Net.me ? 'local' : g.human })), d.laps, 'client'); }
  else if (d.t === 's') { G.snaps.push({ rt: performance.now(), ...d }); if (G.snaps.length > 6) G.snaps.shift(); }
  else if (d.t === 'back') { G.mode = 'lobbywait'; startAttract(); show('lobby'); renderLobby(); }
}
function hostStart() {
  const humans = Net.players.map(p => ({ team: p.team, human: p.id === Net.me ? 'local' : p.id, name: p.name }));
  const used = humans.map(h => h.team);
  const grid = TEAMS.map((_, i) => i).filter(i => !used.includes(i)).sort(() => Math.random() - .5).map(t => ({ team: t, human: null }));
  humans.sort(() => Math.random() - .5).forEach((h, k) => grid.splice(Math.min(grid.length, 4 + k), 0, h));
  const g2 = grid.map(g => ({ team: g.team, human: g.human === 'local' ? Net.me : g.human, name: g.name }));
  bcast({ t: 'start', grid: g2, laps: Net.laps });
  startRace(grid, Net.laps, 'host');
}
function netTick(dt) {
  if (G.net === 'host') {
    Net.sendT -= dt; if (Net.sendT > 0) return; Net.sendT = 1 / 20;
    bcast({ t: 's', ph: G.phase, lt: +G.lt.toFixed(2), tm: +G.t.toFixed(3), c: G.cars.map(c => [Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10, +c.h.toFixed(3), Math.round(c.vF), c.lap, c.idx, c.fin ? +c.finT.toFixed(3) : 0, +c.slide.toFixed(2), isFinite(c.best) ? +c.best.toFixed(3) : 0, c.surf, +(c.lapStart).toFixed(3)]) });
  } else if (G.net === 'client' && Net.hc && Net.hc.open) {
    Net.sendT -= dt; if (Net.sendT > 0) return; Net.sendT = 1 / 30;
    Net.hc.send({ t: 'in', a: +In.thr.toFixed(2), b: In.brk, s: +In.steer.toFixed(3) });
  }
}
function applySnaps() {
  const S2 = G.snaps; if (!S2.length) return;
  const rt = performance.now() - 110; let a = S2[0], b = S2[S2.length - 1];
  for (let i = 0; i < S2.length - 1; i++) if (S2[i].rt <= rt && S2[i + 1].rt >= rt) { a = S2[i]; b = S2[i + 1]; break; }
  const k = b === a ? 1 : clamp((rt - a.rt) / (b.rt - a.rt), 0, 1), L = S2[S2.length - 1];
  const prevPhase = G.phase; G.phase = L.ph; G.lt = L.lt; G.t = L.tm;
  if (prevPhase === 'grid' && G.phase === 'race') G.t = L.tm;
  G.cars.forEach((c, i) => {
    const A = a.c[i], B = b.c[i], Lc = L.c[i]; if (!A || !B) return;
    c.x = lerp(A[0], B[0], k); c.y = lerp(A[1], B[1], k); c.h = A[2] + wrapA(B[2] - A[2]) * k; c.vF = lerp(A[3], B[3], k);
    const f = Math.sin(c.h), g = -Math.cos(c.h); c.vx = f * c.vF; c.vy = g * c.vF;
    c.idx = Lc[5]; c.prog = Lc[4] * G.track.N + Lc[5]; c.slide = Lc[7]; c.best = Lc[8] || Infinity; c.surf = Lc[9]; c.lapStart = Lc[10];
    if (Lc[4] !== c.lap) { const was = c.lap; c.lap = Lc[4]; if (c.human === 'local' && c.lap > was && c.lap >= 2 && c.lap <= G.laps) banner(c.lap === G.laps ? 'FINAL LAP' : 'LAP ' + c.lap); }
    if (Lc[6] && !c.fin) { c.fin = true; c.finT = Lc[6]; if (c.human === 'local') { banner('FINISH', '#FFC400'); G.resT = 2.6; } }
  });
}

/* =====================================================================
   UI / SCREENS
   ===================================================================== */
const SCREENS = ['menu', 'garage', 'friends', 'lobby', 'results'];
function show(id) { SCREENS.forEach(s => $('#' + s).classList.toggle('hidden', s !== id)); if (id === 'menu') refreshMenu(); }
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600); }

function refreshMenu() {
  const t = TEAMS[S.team];
  $('#mcTeam').textContent = t.n; $('#mcTeam').style.color = t.ui;
  $('#mcDriver').textContent = '#' + t.num + ' · ' + t.drv;
  const c = $('#menuCar'), g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.translate(c.width / 2, c.height / 2); g.scale(5, 5); drawCarArt(g, S.team);
  $('#tcLaps').textContent = S.laps; $('#tcLen').textContent = G.track.def.km || (G.track.len * .12 / 1000).toFixed(2);
  trackOutline($('#trackThumb'), 14, 4, '#FFC400');
}

/* ---------- garage ---------- */
const GA = { i: 0, from: -1, t: 1, mode: 'solo', sweep: 0, num: { spd: 0, acc: 0, grip: 0 } };
function openGarage(mode) {
  GA.mode = mode; GA.i = mode === 'lobby' ? (Net.players.find(p => p.id === Net.me)?.team ?? S.team) : S.team; GA.from = -1; GA.t = 0;
  show('garage'); $('#gDots').innerHTML = TEAMS.map(() => '<i></i>').join('');
  $('#gRings').innerHTML = ['FL', 'FR', 'RL', 'RR'].map((l, k) => `<div class="ring"><svg viewBox="0 0 40 40"><circle class="rb" cx="20" cy="20" r="16"/><circle class="rf" cx="20" cy="20" r="16"/></svg><b data-k="p${k}">0</b><span>${l}</span></div>`).join('');
  garageInfo();
}
function garageNav(d) { GA.from = GA.i; GA.i = (GA.i + d + TEAMS.length) % TEAMS.length; GA.t = 0; GA.dir = d; garageInfo(); }
function teamTaken(i) { return GA.mode === 'lobby' && Net.players.some(p => p.team === i && p.id !== Net.me); }
function teamStats(i) {
  const t = TEAMS[i], h = k => ((i * 7919 + k * 104729) % 97) / 97;
  return { spd: VMAX * t.spd * KMH, hp: Math.round(1000 * t.acc + h(1) * 12), a100: 2.62 / t.acc, a200: 4.25 / t.acc, rpm: 14.6 + h(2) * .6,
    brk: 5.2 * t.grip + .1 * h(3), kg: 798 + Math.round(h(4) * 6), drs: 11 + h(5) * 4, lat: 5.1 * t.grip, tit: t.tit,
    p: [22.5 + h(6) * .8, 22.5 + h(7) * .8, 20.5 + h(8) * .8, 20.5 + h(9) * .8], bars: [t.acc, t.grip, (t.spd + t.grip) / 2, (t.acc + t.spd) / 2] };
}
function roll(el, v, dec, delay) {
  const id = el._id = (el._id || 0) + 1, t0 = performance.now() + delay, blk = el.closest('.g-block,.kv,.bar,.ring');
  if (blk) setTimeout(() => { blk.classList.remove('flash'); void blk.offsetWidth; blk.classList.add('flash'); }, delay);
  let last = 0;
  const tick = now => {
    if (el._id !== id) return; const t = (now - t0) / 850;
    if (t < 0) return requestAnimationFrame(tick);
    if (t < .55) { if (now - last > 40) { last = now; el.textContent = (v * (.7 + Math.random() * .6)).toFixed(dec); } }
    else if (t < 1) el.textContent = lerp(parseFloat(el.textContent) || v, v, .22).toFixed(dec);
    else { el.textContent = v.toFixed(dec); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function garageInfo() {
  const t = TEAMS[GA.i], s = teamStats(GA.i);
  $('#gTeam').textContent = t.n; $('#gFull').textContent = t.f; $('#gDrv').textContent = t.drv; $('#gNum').textContent = t.num;
  $('#gCh').textContent = t.ch; $('#gPu').textContent = t.pu; $('#gTeam').style.color = t.ui;
  const hm = $('#gHelm'); hm.classList.remove('pop'); void hm.offsetWidth; hm.src = 'cars/helmets/' + t.id + '.png'; hm.classList.add('pop');
  const lay = document.createElement('div'); lay.className = 'gbg-layer';
  lay.style.background = `radial-gradient(85% 55% at 50% 42%, ${hexA(t.bg, .95)} 0%, ${shade(t.bg, -.6)} 62%, #08090b 100%)`;
  $('#garage').prepend(lay); requestAnimationFrame(() => lay.classList.add('on'));
  setTimeout(() => $$('#garage .gbg-layer').slice(1).forEach(e => e.remove()), 700);
  $('#gIndex').textContent = String(GA.i + 1).padStart(2, '0') + ' / ' + TEAMS.length;
  $$('#gDots i').forEach((e, k) => e.classList.toggle('on', k === GA.i));
  let d = 0; const R = (k, v, dec) => $$(`[data-k="${k}"]`).forEach(el => roll(el, v, dec, (d++) * 55));
  R('spd', s.spd, 0); R('hp', s.hp, 0); R('a100', s.a100, 2); R('rpm', s.rpm, 1); R('a200', s.a200, 2); R('brk', s.brk, 1);
  R('kg', s.kg, 0); R('drs', s.drs, 1); R('lat', s.lat, 1); s.p.forEach((v, k) => R('p' + k, v, 1)); R('tit', s.tit, 0);
  ['bBrk', 'bPow', 'bAero', 'bErs'].forEach((id, k) => { const e = $('#' + id); e.style.width = '8%'; void e.offsetWidth; e.style.width = clamp(55 + (s.bars[[2, 0, 1, 3][k]] - .99) / .025 * 45, 30, 100) + '%'; });
  const gg = $('#gGauge'); gg.style.transition = 'none'; gg.style.strokeDashoffset = 157; void gg.getBoundingClientRect(); gg.style.transition = ''; gg.style.strokeDashoffset = 157 * (1 - s.rpm / 16);
  $$('.ring .rf').forEach((c, k) => { c.style.transition = 'none'; c.style.strokeDashoffset = 100.5; void c.getBoundingClientRect(); c.style.transition = '';
    c.style.strokeDashoffset = 100.5 * (1 - (k < 4 ? (s.p[k] - 17) / 7 : s.tit / 16)); });
  const taken = teamTaken(GA.i); $('#gTaken').classList.toggle('hidden', !taken);
  $('#gSelect').textContent = taken ? 'ЗАНЯТО' : 'ВЫБРАТЬ'; $('#gSelect').style.opacity = taken ? .4 : 1;
}
let gOff = null;
function drawGarage(dt) {
  const cvs = $('#gCar'), r = cvs.getBoundingClientRect(); if (!r.width) return;
  const W = Math.round(r.width * DPR), H = Math.round(r.height * DPR);
  if (cvs.width !== W || cvs.height !== H) { cvs.width = W; cvs.height = H; }
  if (!gOff) gOff = document.createElement('canvas');
  const g = cvs.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  GA.t = Math.min(1, GA.t + dt * 1.6); GA.sweep = (GA.sweep + dt * .35) % 1.6;
  const sc = Math.min(H * .8 / 54, W * .96 / (TEAMS[GA.i].pic ? 21 : 26));
  const e = 1 - Math.pow(1 - GA.t, 3), ein = GA.t * GA.t * GA.t;
  const dir = GA.dir || 1;
  const draw = (ti, oy, alpha, blur) => {
    const t = TEAMS[ti];
    gOff.width = Math.ceil(30 * sc); gOff.height = Math.ceil(60 * sc);
    const o = gOff.getContext('2d'); o.setTransform(sc, 0, 0, sc, gOff.width / 2, gOff.height / 2); drawCarArt(o, ti);
    // showroom light sweep
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-atop';
    const y = (GA.sweep - .3) * gOff.height * 1.4, lg = o.createLinearGradient(0, y - 80, gOff.width * .3, y + 80);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,.28)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    o.fillStyle = lg; o.fillRect(0, 0, gOff.width, gOff.height); o.globalCompositeOperation = 'source-over';
    // glow
    const gl = g.createRadialGradient(W / 2, H / 2 + oy, 10, W / 2, H / 2 + oy, Math.min(W, H) * .5);
    gl.addColorStop(0, hexA(t.ui, .3 * alpha)); gl.addColorStop(1, hexA(t.ui, 0)); g.fillStyle = gl; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = alpha; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 30 * DPR; g.shadowOffsetX = 10 * DPR; g.shadowOffsetY = 18 * DPR;
    if (blur) for (let k = 4; k > 0; k--) { g.globalAlpha = alpha * .12; g.drawImage(gOff, (W - gOff.width) / 2, (H - gOff.height) / 2 + oy + k * blur * dir); }
    g.globalAlpha = alpha; g.drawImage(gOff, (W - gOff.width) / 2, (H - gOff.height) / 2 + oy); g.restore();
  };
  if (GA.from >= 0 && GA.t < .55) draw(GA.from, -dir * ein * H * 1.6, 1, 22 * DPR);
  draw(GA.i, dir * (1 - e) * H * 1.1, Math.min(1, GA.t * 2.5), (1 - e) * 30 * DPR);
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }
(() => {
  const st = $('#garage'); let x0 = null;
  st.addEventListener('pointerdown', e => { x0 = e.target.closest('button') ? null : e.clientX; });
  st.addEventListener('pointerup', e => { if (x0 == null) return; const d = e.clientX - x0; x0 = null; if (Math.abs(d) > 35) garageNav(d < 0 ? 1 : -1); });
  $('#gPrev').onclick = () => garageNav(-1); $('#gNext').onclick = () => garageNav(1);
  $('#gBack').onclick = () => show(GA.mode === 'lobby' ? 'lobby' : 'menu');
  $('#gSelect').onclick = () => {
    if (teamTaken(GA.i)) return toast('Этот болид уже выбран другим игроком');
    S.team = GA.i; saveS();
    if (GA.mode === 'lobby') {
      if (Net.host) { const me = Net.players.find(p => p.id === Net.me); if (me) me.team = GA.i; bcastLobby(); }
      else if (Net.hc) Net.hc.send({ t: 'pick', team: GA.i });
      show('lobby');
    } else { G.follow = G.cars.findIndex(c => c.team === S.team); show('menu'); }
  };
  addEventListener('keydown', e => { if ($('#garage').classList.contains('hidden')) return; if (e.code === 'ArrowLeft') garageNav(-1); if (e.code === 'ArrowRight') garageNav(1); if (e.code === 'Enter') $('#gSelect').click(); });
})();

/* ---------- lobby ---------- */
function renderLobby() {
  $('#lCode').textContent = Net.code || '----'; $('#lCount').textContent = Net.players.length;
  $('#lPlayers').innerHTML = Net.players.map(p => `<li><i style="background:${TEAMS[p.team].c1}"></i><b>${esc(p.name)}${p.id === Net.me ? ' (вы)' : ''}</b><span>${TEAMS[p.team].n}${p.host ? ' · HOST' : ''}</span></li>`).join('');
  $('#lStart').classList.toggle('hidden', !Net.host); $('#lLaps').classList.toggle('hidden', !Net.host); $('#lWait').classList.toggle('hidden', Net.host);
  $$('#lLaps button').forEach(b => b.classList.toggle('on', +b.dataset.v === Net.laps));
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- sheet (settings / pause) ---------- */
function openSheet(pause) {
  $('#sheetTitle').textContent = pause ? 'ПАУЗА' : 'НАСТРОЙКИ'; $('#sQuit').classList.toggle('hidden', !pause);
  $('#sheet').classList.remove('hidden'); if (pause && !G.net) G.paused = true; syncSettings();
}
function syncSettings() {
  $$('#sDiff button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.diff));
  $$('#sLaps button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.laps));
  $('#sLeft').classList.toggle('on', S.lefty); $('#sSound').classList.toggle('on', S.sound);
  $('#controls').classList.toggle('lefty', S.lefty);
  $$('#sCtrl button').forEach(b => b.classList.toggle('on', b.dataset.v === S.ctrl));
  $('#wheelZone').classList.toggle('hidden', S.ctrl === 'arrows'); $('#arrows').classList.toggle('hidden', S.ctrl !== 'arrows');
}
function wireUI() {
  $('#btnSettings').onclick = () => openSheet(false);
  $('#btnPause').onclick = () => openSheet(true);
  $('#sClose').onclick = () => { $('#sheet').classList.add('hidden'); G.paused = false; if ($('#menu').classList.contains('hidden') === false) refreshMenu(); };
  $('#sQuit').onclick = () => { $('#sheet').classList.add('hidden'); if (G.net) netClose(); startAttract(); };
  $('#sDiff').onclick = e => { const v = e.target.dataset.v; if (v != null) { S.diff = +v; saveS(); syncSettings(); } };
  $('#sLaps').onclick = e => { const v = e.target.dataset.v; if (v != null) { S.laps = +v; saveS(); syncSettings(); } };
  $('#sCtrl').onclick = e => { const v = e.target.dataset.v; if (v) { S.ctrl = v; saveS(); syncSettings(); } };
  $('#sLeft').onclick = () => { S.lefty = !S.lefty; saveS(); syncSettings(); };
  $('#sSound').onclick = () => { S.sound = !S.sound; saveS(); syncSettings(); };
  $('#carCard').onclick = () => openGarage('solo');
  $('#btnRace').onclick = () => { Snd.init(); startSolo(); };
  $('#btnFriends').onclick = () => { $('#fName').value = S.name; show('friends'); };
  $('#fBack').onclick = () => show('menu');
  $('#btnHost').onclick = () => { S.name = $('#fName').value.trim(); saveS(); hostLobby(); };
  $('#btnJoin').onclick = () => { S.name = $('#fName').value.trim(); saveS(); joinLobby($('#fCode').value); };
  $('#lBack').onclick = () => { netClose(); show('menu'); };
  $('#lCar').onclick = () => openGarage('lobby');
  $('#lCopy').onclick = () => { const url = location.origin + location.pathname + '#join=' + Net.code; (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => toast('Ссылка скопирована'), () => toast(url)); };
  $('#lLaps').onclick = e => { const v = e.target.dataset.v; if (v != null && Net.host) { Net.laps = +v; bcastLobby(); } };
  $('#lStart').onclick = () => { Snd.init(); hostStart(); };
  $('#rAgain').onclick = () => { if (G.net === 'host') { bcast({ t: 'back' }); startAttract(); show('lobby'); renderLobby(); } else startSolo(); };
  $('#rMenu').onclick = () => { if (G.net) netClose(); startAttract(); };
  const m = location.hash.match(/join=([A-Z]{4})/i);
  if (m) { $('#fCode').value = m[1].toUpperCase(); $('#fName').value = S.name; show('friends'); }
  syncSettings();
}

/* =====================================================================
   LOOP
   ===================================================================== */
let last = performance.now(), accT = 0, resUpd = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  readInput(dt);
  if (G.mode === 'race' || G.mode === 'attract' || G.mode === 'lobbywait') {
    if (G.net === 'client' && G.mode === 'race') applySnaps();
    else if (!G.paused) { accT += dt; let n = 0; while (accT >= STEP && n++ < 8) { simStep(STEP); accT -= STEP; } if (n >= 8) accT = 0; }
    for (const c of G.cars) { c.rx = c.x; c.ry = c.y; c.rh = c.h; }
    { const f = G.cars[G.follow]; if (f && cam.shake > .3) { f.rx += rand(-1, 1) * cam.shake * .15; f.ry += rand(-1, 1) * cam.shake * .15; f.rh += rand(-1, 1) * cam.shake * .005; } }
    if (!G.paused) effects(dt);
    camera(dt); render(); hud(dt); netTick(dt);
    if (G.resT > 0) { G.resT -= dt; if (G.resT <= 0) showResults(); }
    if (!$('#results').classList.contains('hidden') && (resUpd -= dt) < 0) { resUpd = .5; renderResults(); }
  }
  if (!$('#garage').classList.contains('hidden')) drawGarage(dt);
}

/* ---------- boot ---------- */
resize(); buildPatterns(ctx); buildSprites(); loadCarPNGs();
G.track = buildTrack(MONACO);
wireUI();
const joinHash = /join=/i.test(location.hash);
startAttract();
if (joinHash) show('friends');
document.fonts?.ready.then(() => refreshMenu());
requestAnimationFrame(frame);
