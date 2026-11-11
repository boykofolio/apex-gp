'use strict';
/* =====================================================================
   APEX GP · FX engine
   The static world (ground, towns, circuit, trackside kit) is painted once
   into a tile cache — a megatexture — and blitted every frame. That leaves
   the whole frame budget for what moves: light, particles, weather, cameras.
   Loaded before game.js; nothing here runs until the game calls it.
   ===================================================================== */
window.FX = (() => {
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const TS = 512, FONT = '"Titillium Web",system-ui,sans-serif', W0 = '#f1efe8';

/* ---------- every circuit has its own light, paint and trackside kit ----------
   tod: 0 day · 1 golden hour · 2 dusk under floodlights · 3 night
   k: kerb colours · g: run-off (0 lush grass, 1 dry grass, 2 sand) · gv: gravel colour · as: asphalt tone
   w: 0 armco + tyre walls, 1 concrete blocks + catch fence, 2 tecpro · ac: paint and hoardings
   st: street circuit · air: what drifts in the wind · gr: colour grade */
const LOOK = {
  monaco:      { tod: 0, k: [W0, '#cf1f2b'], w: 1, st: 1, as: 1, ac: ['#cf1f2b', '#f4f4f4', '#14306b'], bird: '#ffffff', gr: 'rgba(255,225,170,.06)' },
  suzuka:      { tod: 0, k: [W0, '#d42a2a'], gv: '#b9ab8f', ac: ['#d42a2a', '#f4f4f4', '#26262b'], air: ['#ffc4dc', '#ffe3ee', '#ff9fc4'] },
  spa:         { tod: 0, k: ['#f2c318', '#c81e28'], ac: ['#1a1a1c', '#f2c318', '#c81e28'], air: ['#c98a3a', '#8f6a2c', '#6b8f3a'], gr: 'rgba(120,150,190,.09)' },
  sepang:      { tod: 1, k: [W0, '#1e58b8'], as: 2, ac: ['#1e58b8', '#f2c318', '#c81e28'] },
  interlagos:  { tod: 0, k: ['#f2d21c', '#1f9a4a'], ac: ['#1f9a4a', '#f2d21c', '#1e58b8'], air: ['#7fae52', '#55883a'] },
  vegas:       { tod: 3, k: [W0, '#d81f6a'], w: 1, st: 1, ac: ['#d81f6a', '#22c7f2', '#f2c318'], beams: 1 },
  yas:         { tod: 2, k: [W0, '#16a5c9'], w: 2, g: 2, ac: ['#16a5c9', '#f4f4f4', '#0e2a4f'], bird: '#ffffff' },
  melbourne:   { tod: 1, k: [W0, '#d42a2a'], w: 1, st: 1, ac: ['#0b8f6a', '#f2c318', '#f4f4f4'], bird: '#ffffff' },
  shanghai:    { tod: 0, k: [W0, '#c81e28'], as: 2, ac: ['#c81e28', '#f2c318', '#f4f4f4'], gr: 'rgba(150,160,175,.10)' },
  sakhir:      { tod: 2, k: [W0, '#c81e28'], g: 2, w: 2, ac: ['#c81e28', '#f4f4f4', '#1a1a1c'], air: ['#d9c08a', '#c9ad74'], dust: 1 },
  jeddah:      { tod: 3, k: [W0, '#15a05a'], g: 2, w: 1, st: 1, ac: ['#15a05a', '#f4f4f4', '#7a3fd0'], beams: 1 },
  miami:       { tod: 0, k: ['#ff5fa8', '#19c8c3'], w: 1, st: 1, ac: ['#19c8c3', '#ff5fa8', '#f4f4f4'], bird: '#ffffff', gr: 'rgba(255,170,200,.05)' },
  montreal:    { tod: 0, k: [W0, '#d42a2a'], w: 1, ac: ['#d42a2a', '#f4f4f4', '#1e58b8'], air: ['#c9502c', '#e08a2c', '#d9b02c'] },
  catalunya:   { tod: 0, k: ['#f2c318', '#c81e28'], g: 1, gv: '#c9b48a', ac: ['#c81e28', '#f2c318', '#1e3fa8'] },
  rbring:      { tod: 0, k: [W0, '#c81e28'], ac: ['#1b2a5c', '#c81e28', '#f2c318'], gr: 'rgba(170,220,255,.05)', air: ['#ffffff', '#f2f2d8'] },
  silverstone: { tod: 0, k: [W0, '#1e3fa8'], ac: ['#1e3fa8', '#c81e28', '#f4f4f4'], gr: 'rgba(140,160,190,.09)' },
  hungaroring: { tod: 1, k: [W0, '#c81e28'], g: 1, ac: ['#c81e28', '#f4f4f4', '#1f9a4a'] },
  zandvoort:   { tod: 0, k: [W0, '#f26a1c'], g: 1, gv: '#d9c9a0', ac: ['#f26a1c', '#f4f4f4', '#1e3fa8'], bird: '#ffffff', air: ['#e3d4ad', '#d6c493'], dust: 1 },
  monza:       { tod: 1, k: [W0, '#c81e28'], ac: ['#1f9a4a', '#f4f4f4', '#c81e28'], air: ['#c98a3a', '#a8642c', '#d9a83a'] },
  madrid:      { tod: 1, k: ['#f2c318', '#c81e28'], w: 1, st: 1, ac: ['#c81e28', '#f2c318', '#f4f4f4'] },
  baku:        { tod: 1, k: [W0, '#16a5c9'], w: 1, st: 1, ac: ['#16a5c9', '#c81e28', '#1f9a4a'], bird: '#ffffff' },
  marinabay:   { tod: 3, k: [W0, '#c81e28'], w: 1, st: 1, ac: ['#c81e28', '#f4f4f4', '#7a3fd0'], beams: 1 },
  austin:      { tod: 1, k: [W0, '#c81e28'], g: 1, ac: ['#c81e28', '#f4f4f4', '#1e3fa8'] },
  mexico:      { tod: 0, k: [W0, '#1f9a4a'], g: 1, ac: ['#1f9a4a', '#f4f4f4', '#c81e28'], air: ['#ff5fa8', '#f2c318', '#19c8c3', '#ff7a1c'] },
  losail:      { tod: 3, k: [W0, '#8a1f45'], g: 2, w: 2, ac: ['#8a1f45', '#f4f4f4', '#16a5c9'], air: ['#b7a57c', '#a39068'], dust: 1 },
};
/* sh: shadow offset per unit of height · sa: shadow strength · amb / band: light map (ambient, floodlit road) */
const TOD = [
  { sh: [6, 9], sa: .36 },
  { sh: [15, 10], sa: .32, mul: 'rgb(255,229,194)', sun: 'rgba(255,160,70,.13)' },
  { sh: [4, 6], sa: .2, amb: [112, 108, 156], band: [150, 146, 108] },
  { sh: [4, 6], sa: .18, amb: [150, 156, 205], band: [108, 100, 56] }];

let RES = 1, tw = TS, q = -1, fN = 0, cap = 320, lm = null, lg = null, SM = null, CL = null;
const tiles = new Map(), pool = [], PS = [];
const st = { armed: false, wait: false, gasAt: -1e9, t0: 0, fin: false, fw: 0, fwT: 0, conf: 0, flash: 0, bolt: 6, birds: null, heli: null, cold: true, settle: 0, ema: 16, zoomT: 0, ers: -1 };

/* =====================================================================
   PATTERNS
   ===================================================================== */
const PX = {};
function pat(key, size, draw, sc) {
  if (PX[key]) return PX[key];
  const c = mk(size, size); let s = 7; for (let i = 0; i < key.length; i++) s = (s * 31 + key.charCodeAt(i)) % 2147483646 + 1;
  draw(c.getContext('2d'), size, rng(s));
  const p = ctx.createPattern(c, 'repeat'); p.setTransform(new DOMMatrix().scale(sc || .5)); return PX[key] = p;
}
const speck = (g, s, R, n, cols, a, b) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[R() * cols.length | 0]; const r = a + R() * (b - a); g.fillRect(R() * s, R() * s, r, r); } };
const blot = (g, s, R, n, cols, al, r0, r1) => { g.globalAlpha = al;
  for (let i = 0; i < n; i++) { const x = R() * s, y = R() * s, r = r0 + R() * (r1 - r0); g.fillStyle = cols[R() * cols.length | 0];
    for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { if (x + dx + r < 0 || x + dx - r > s || y + dy + r < 0 || y + dy - r > s) continue; g.beginPath(); g.arc(x + dx, y + dy, r, 0, 7); g.fill(); } }
  g.globalAlpha = 1; };
const ASP = [['#232427', '#303236', '#18191b'], ['#303235', '#3d3f43', '#232528'], ['#3c3e42', '#494b50', '#2e3033']];
const asphP = t => pat('as' + t, 256, (g, s, R) => { const b = ASP[t]; g.fillStyle = b[0]; g.fillRect(0, 0, s, s); blot(g, s, R, 14, [b[1], b[2]], .16, 14, 44); speck(g, s, R, 3200, [b[1], b[2], b[1], 'rgba(255,255,255,.07)'], .6, 1.9); });
const GRS = [['#3f7a35', '#4b8b3d', '#35692d', '#5b9b49'], ['#7f8b46', '#8e9a52', '#6d7a3c', '#9ca65d'], ['#c9b282', '#d6c092', '#b89f70', '#e0cca0'], ['#274a2f', '#2f5737', '#1f3d27', '#386441'], ['#8d7d5f', '#99896a', '#7c6d52', '#a59575']];
const grassP = k => pat('gr' + k, 256, (g, s, R) => { const c = GRS[k]; g.fillStyle = c[0]; g.fillRect(0, 0, s, s); blot(g, s, R, 26, c.slice(1), .22, 10, 34);
  if (k === 2 || k === 4) speck(g, s, R, 2400, c.slice(1), .7, 1.9);
  else { g.lineWidth = 1; for (let i = 0; i < 1700; i++) { g.strokeStyle = c[1 + (R() * 3 | 0)]; const x = R() * s, y = R() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R() * 3 - 1.5, y - 2 - R() * 3.5); g.stroke(); } } });
const gravP = c => pat('gv' + c, 128, (g, s, R) => { g.fillStyle = c; g.fillRect(0, 0, s, s); speck(g, s, R, 1500, [shade(c, .16), shade(c, -.16), shade(c, .3), shade(c, -.3)], .8, 2.2); });
const detP = () => pat('det', 256, (g, s, R) => { speck(g, s, R, 1500, ['rgba(0,0,0,.10)', 'rgba(255,255,255,.07)', 'rgba(0,0,0,.06)'], .7, 2.4); blot(g, s, R, 10, ['#000', '#fff'], .03, 16, 50); });
const soft = (c, a) => { const k = mk(64, 64), g = k.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, hexA(c, a)); rg.addColorStop(.5, hexA(c, a * .45)); rg.addColorStop(1, hexA(c, 0)); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return k; };

/* =====================================================================
   PER-TRACK KIT: gravel beds, rubber, boards, lamps, gantries
   ===================================================================== */
function hidden(T, x, y) { // under the circuit or behind a building
  if (clearTrack(T, x, y)[0] < T.hw + T.wall + 26) return true;
  const B = T.buckets; if (!B) return false; const bx = Math.floor(x / 700), by = Math.floor(y / 700);
  for (let b = by; b <= by + 1; b++) for (let a = bx - 1; a <= bx + 1; a++) { const l = B.get(a + ',' + b); if (!l) continue;
    for (const o of l) { if (o.tree) continue; const s = o.s, k = s.sc || 1, h = s.w / 2 * k; if (x > o.x - h && x < o.x + h && y < o.y + s.d / 2 * k && y > o.y - (s.d / 2 + s.H) * k) return true; } }
  return false;
}
function prep(T) {
  if (T.fx) return T.fx;
  const N = T.N, hw = T.hw, Wl = T.wall, def = T.def, PT = T.pit, R = rng(4242 + N), J = i => ((i % N) + N) % N;
  const L = Object.assign({ tod: 0, k: [W0, '#cf1f2b'], g: 0, gv: '#a9a393', w: T.city ? 1 : 0, as: 0, ac: ['#cf1f2b', '#f4f4f4', '#1e3fa8'] }, LOOK[def.id]);
  if (def.night) L.tod = 3;
  const td = TOD[L.tod], F = T.fx = { L, sh: td.sh, sa: td.sa, g: def.night ? (L.g === 2 ? 4 : 3) : L.g, gvC: def.night ? '#6f6a5c' : L.gv, sand: L.g === 2, dec: [], props: [], lamps: [], over: [], gl: [] };
  const ks = smooth(T.k, 5, 2), ro = (j, sd) => sd > 0 ? T.roP[j] : T.roN[j], at = (j, o) => [T.x[j] + T.nx[j] * o, T.y[j] + T.ny[j] * o];
  const free = (x, y) => clearTrack(T, x, y)[0] >= hw + Wl + 8 && !(PT && PT.block(x, y));
  // gravel beds on the outside of real corners, where the run-off is deep enough
  F.gv = [1, -1].map(sd => { const w = new Float32Array(N); for (let i = 0; i < N; i++) if (Math.abs(ks[i]) > 1 / 700 && Math.sign(ks[i]) === -sd && ro(i, sd) > 60) for (let e = -6; e <= 22; e++) w[J(i + e)] = 1; return smooth(w, 8, 3); });
  F.ad = [0, 1].map(s => { const m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = hash((i / 48 | 0) * 3.7 + s * 91.3 + N) < .62 ? 1 : 0; return m; });
  // braking zones: rubber into the corner, traction marks out of it, distance boards
  const vt = T.vt; let z0 = -1;
  for (let i = 0; i < N; i++) { const dn = vt[J(i + 10)] < vt[i] - 14;
    if (dn) { if (z0 < 0) z0 = i; continue; } if (z0 < 0) continue;
    const a = z0, b = i; z0 = -1; if (vt[a] - vt[b] < 120) continue;
    for (let k = 8 + R() * 10 | 0; k > 0; k--) F.dec.push({ i: a + R() * (b - a) * .9 | 0, n: 6 + R() * 26 | 0, o: (R() - .5) * 56, f: 1, w: 3.6, tw: 1, c: `rgba(6,6,8,${(.05 + R() * .12).toFixed(2)})` });
    for (let k = 3 + R() * 4 | 0; k > 0; k--) F.dec.push({ i: b + 8 + R() * 16 | 0, n: 10 + R() * 20 | 0, o: (R() - .5) * 50, f: 1, w: 3.6, tw: 1, c: `rgba(6,6,8,${(.04 + R() * .08).toFixed(2)})` });
    const sd = -Math.sign(ks[J(b + 12)]) || 1;
    for (const [d, t] of [[156, '150'], [104, '100'], [52, '50']]) { if (b - a < d * .55) continue; const j = J(b - d), p = at(j, (hw + Wl * .52) * sd); F.props.push({ k: 1, x: p[0], y: p[1], a: T.ang[j] + Math.PI / 2, t }); } }
  // resurfaced patches, seams, manholes
  for (let k = N / 55 | 0; k > 0; k--) F.dec.push({ i: R() * N | 0, n: 4 + R() * 12 | 0, o: (R() - .5) * hw * 1.5, f: 0, w: 14 + R() * 30, c: R() < .6 ? 'rgba(0,0,0,.085)' : 'rgba(255,255,255,.03)' });
  for (let k = N / 110 | 0; k > 0; k--) F.dec.push({ i: R() * N | 0, n: 20 + R() * 60 | 0, o: (R() < .5 ? -1 : 1) * hw * (.2 + R() * .3), f: 0, w: 1.3, c: 'rgba(0,0,0,.22)' });
  if (L.st) for (let k = N / 130 | 0; k > 0; k--) { const p = at(R() * N | 0, (R() - .5) * hw * 1.4); F.props.push({ k: 4, x: p[0], y: p[1], a: 0 }); }
  // marshal posts, TV cameras, floodlights
  for (let i = 40, n = 0; i < N; i += 120, n++) { const sd = n & 1 ? 1 : -1, p = at(i, (hw + Wl + ro(i, sd) + 14) * sd); if (free(p[0], p[1])) F.props.push({ k: n % 3 === 2 ? 3 : 0, x: p[0], y: p[1], a: T.ang[i] + (sd > 0 ? Math.PI : 0) }); }
  if (L.tod > 1) for (let i = 14, n = 0; i < N; i += 30, n++) { const sd = n & 1 ? 1 : -1, o = hw + Wl + ro(i, sd) + 12, p = at(i, o * sd), h = at(i, (o - 38) * sd); if (!free(p[0], p[1])) continue;
    F.props.push({ k: 2, x: p[0], y: p[1], a: T.ang[i] + (sd > 0 ? Math.PI : 0) }); F.lamps.push({ x: h[0], y: h[1] }); }
  // overhead: start gantry and sponsor bridges on the straights
  const ov = (k, j, txt) => F.over.push({ k, i: j, x: T.x[j], y: T.y[j], a: T.ang[j] + Math.PI / 2, txt, l: hw + Wl + T.roN[j] + 6, r: hw + Wl + T.roP[j] + 6 });
  ov(0, 7 % N, def.name);
  for (let i = 300, last = -1e9; i < N - 300 && F.over.length < 3; i += 16) { if (i - last < N / 3.2) continue;
    let ok = !(PT && PT.rel(i) < PT.len + 80) && !(T.bridge && Math.min(Math.abs(i - T.bridge.i), N - Math.abs(i - T.bridge.i)) < T.bridge.span + 90);
    for (let e = -36; e <= 36 && ok; e += 6) if (Math.abs(T.k[J(i + e)]) > 1 / 2400) ok = false;
    for (const sd of [1, -1]) { if (!ok) break; const p = at(i, (hw + Wl + ro(i, sd) + 6) * sd), nb = nearTrack(T, p[0], p[1]); let di = Math.abs(nb[1] - i); di = Math.min(di, N - di); if (di > 30 && nb[0] < hw + Wl + 40) ok = false; }
    if (ok) { ov(1, i, def.name); last = i; } }
  // sun glints on open water
  if (T.isSea || (T.waters && T.waters.length)) { const sg = mk(4, 4).getContext('2d'), bb = T.bbox, M = 1300;
    for (let k = 0; k < 3000 && F.gl.length < 420; k++) { const x = lerp(bb[0] - M, bb[2] + M, R()), y = lerp(bb[1] - M, bb[3] + M, R()); let wet = false;
      if (T.isSea) wet = T.isSea(x, y); else for (const w of T.waters) { sg.lineWidth = w.w * .8; if (sg.isPointInStroke(w.p, x, y)) { wet = true; break; } }
      if (wet && !hidden(T, x, y)) F.gl.push({ x, y, p: R() * 7 }); } }
  return F;
}

/* =====================================================================
   BAKING: one tile of the static world
   ===================================================================== */
function cityGround(T, cx, cy, vr, vc) { // Monaco: streets, harbour, piers, yachts, town
  const g = ctx; g.fillStyle = PAT.city; g.fillRect(cx - vr, cy - vr, vr * 2, vr * 2);
  g.lineCap = 'butt'; g.strokeStyle = '#3b3c3f'; g.lineWidth = 84; g.stroke(T.streets);
  g.strokeStyle = 'rgba(205,180,90,.55)'; g.lineWidth = 3; g.setLineDash([26, 26]); g.stroke(T.streets); g.setLineDash([]); g.lineCap = 'round';
  g.strokeStyle = PAT.tiles; g.lineWidth = 120; g.stroke(T.seaP);
  if (T.beachP) { g.strokeStyle = PAT.sand; g.lineWidth = 230; g.stroke(T.beachP); }
  g.fillStyle = PAT.water; g.fill(T.seaP);
  if (T.beachP) { g.save(); g.clip(T.seaP); g.strokeStyle = 'rgba(70,190,185,.35)'; g.lineWidth = 150; g.stroke(T.beachP); g.strokeStyle = 'rgba(235,250,245,.35)'; g.lineWidth = 10; g.setLineDash([30, 20]); g.stroke(T.beachP); g.setLineDash([]); g.restore(); }
  g.strokeStyle = 'rgba(190,220,230,.07)'; g.lineWidth = 46; g.stroke(T.seaP);
  g.strokeStyle = '#77736b'; g.lineWidth = 12; g.stroke(T.seaP);
  g.lineCap = 'butt'; g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 34; g.save(); g.translate(6, 9); g.stroke(T.pierP); g.restore();
  g.strokeStyle = '#8c8880'; g.lineWidth = 30; g.stroke(T.pierP); g.lineCap = 'round';
  for (const y of T.yachts) if (Math.abs(y.x - cx) < vr + 150 && Math.abs(y.y - cy) < vr + 150) drawYacht(y);
  for (const d of T.decor) if (Math.abs(d.x - cx) < vr + 300 && Math.abs(d.y - cy) < vr + 300) drawDecor(d);
  drawBlds(T, cx, cy, vr);
  g.lineCap = 'round'; g.strokeStyle = '#66625b'; g.lineWidth = (T.hw + T.wall) * 2 + 64; for (const c of vc) g.stroke(c.p);
}
function zoneGround(T, cx, cy, vr, vc) { // themed circuits: painted ground, streets, water, towns, landmarks
  const g = ctx, G0 = T.ground, d = T.def;
  { const kx = G0.c.width / G0.w, ky = G0.c.height / G0.h, ax = Math.max(G0.x, cx - vr - 64), ay = Math.max(G0.y, cy - vr - 64), bx = Math.min(G0.x + G0.w, cx + vr + 64), by = Math.min(G0.y + G0.h, cy + vr + 64);
    if (bx > ax && by > ay) g.drawImage(G0.c, (ax - G0.x) * kx, (ay - G0.y) * ky, (bx - ax) * kx, (by - ay) * ky, ax, ay, bx - ax, by - ay); }
  g.fillStyle = detP(); g.fillRect(cx - vr, cy - vr, vr * 2, vr * 2);
  g.globalAlpha = .2; g.fillStyle = PAT.city; g.fillRect(cx - vr, cy - vr, vr * 2, vr * 2); g.globalAlpha = 1;
  g.lineCap = 'butt';
  g.strokeStyle = d.walkC || 'rgba(205,200,188,.75)'; g.lineWidth = 74; g.stroke(T.road);
  g.strokeStyle = d.streetC; g.lineWidth = 58; g.stroke(T.road);
  g.strokeStyle = 'rgba(235,225,180,.4)'; g.lineWidth = 2; g.setLineDash([18, 24]); g.stroke(T.road); g.setLineDash([]);
  g.lineCap = 'round';
  for (const w of T.waters) { g.strokeStyle = '#8f8a7d'; g.lineWidth = w.w + 26; g.stroke(w.p); g.strokeStyle = w.c; g.lineWidth = w.w; g.stroke(w.p);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = w.w * .62; g.stroke(w.p); g.strokeStyle = 'rgba(0,25,45,.12)'; g.lineWidth = w.w * .3; g.stroke(w.p); }
  if (T.cpx) txDrawPlaza(T.cpx);
  const b0 = Math.floor((cx - vr - 400) / 700), b1 = Math.floor((cx + vr + 400) / 700), c0 = Math.floor((cy - vr - 400) / 700), c1 = Math.floor((cy + vr + 700) / 700);
  for (const m of T.bigM || []) { const s = m.s, k = s.sc, W = s.c.width / TX_SC * k, H = s.c.height / TX_SC * k, x = m.x - (s.w / 2 + s.pad) * k, y = m.y - (s.d / 2 + s.H + s.pad) * k; if (x < cx + vr && x + W > cx - vr && y < cy + vr && y + H > cy - vr) g.drawImage(s.c, x, y, W, H); }
  for (let by = c0; by <= c1; by++) for (let bx = b0; bx <= b1; bx++) { const l = T.buckets.get(bx + ',' + by); if (!l) continue;
    for (const o of l) { const s = o.s;
      if (o.tree) { const hs = s.s / 2; if (o.x + hs < cx - vr || o.x - hs > cx + vr || o.y + hs < cy - vr || o.y - hs > cy + vr) continue; g.drawImage(s.c, o.x - hs, o.y - hs, s.s, s.s); }
      else { const k = s.sc || 1, W = s.c.width / TX_SC * k, H = s.c.height / TX_SC * k, x = o.x - (s.w / 2 + s.pad) * k, y = o.y - (s.d / 2 + s.H + s.pad) * k; if (x > cx + vr || x + W < cx - vr || y > cy + vr || y + H < cy - vr) continue; g.drawImage(s.c, x, y, W, H); } } }
  if (T.yachts && T.yachts.length) for (const y of T.yachts) if (Math.abs(y.x - cx) < vr + 150 && Math.abs(y.y - cy) < vr + 150) drawYacht(y);
  if (T.rail) { const r = T.rail; g.lineCap = 'butt'; g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 60; g.save(); g.translate(14, 20); g.stroke(r.p); g.restore(); g.strokeStyle = '#8d8a83'; g.lineWidth = 56; g.stroke(r.p); g.strokeStyle = '#4c4a46'; g.setLineDash([8, 10]); g.lineWidth = 44; g.stroke(r.p); g.setLineDash([]); g.lineCap = 'round'; }
  if (T.cpx) txDrawRoofs(T.cpx);
  g.lineCap = 'round'; g.strokeStyle = d.verge; g.lineWidth = (T.hw + T.wall) * 2 + 36; for (const c of vc) g.stroke(c.p);
}
function prop(g, p, F) { // 0 marshal post · 1 distance board · 2 floodlight · 3 TV camera · 4 manhole
  const ca = Math.cos(p.a), sn = Math.sin(p.a), lx = F.sh[0] * ca + F.sh[1] * sn, ly = -F.sh[0] * sn + F.sh[1] * ca, shc = `rgba(0,0,0,${F.sa})`;
  if (p.k === 0) { g.fillStyle = shc; g.fillRect(-9 + lx, -7 + ly, 18, 14); g.fillStyle = '#e8731c'; g.fillRect(-9, -7, 18, 14); g.fillStyle = '#ffa24a'; g.fillRect(-9, -7, 18, 4); g.fillStyle = '#f4f4f4'; g.fillRect(-9, 1, 18, 2); g.fillStyle = '#2bd67b'; g.fillRect(-4, 7, 8, 3);
    g.fillStyle = '#ff8a1c'; g.beginPath(); g.arc(14, 2, 3.2, 0, 7); g.fill(); g.fillStyle = '#f6d7b0'; g.beginPath(); g.arc(14, 2, 1.6, 0, 7); g.fill(); }
  else if (p.k === 1) { g.fillStyle = shc; g.fillRect(-16 + lx * .5, -9 + ly * .5, 32, 18); g.fillStyle = '#f4f4f0'; g.fillRect(-16, -9, 32, 18); g.strokeStyle = '#17181b'; g.lineWidth = 1.5; g.strokeRect(-16, -9, 32, 18);
    g.fillStyle = '#17181b'; g.font = '900 13px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.t, 0, 1); }
  else if (p.k === 2) { g.lineCap = 'round'; g.strokeStyle = shc; g.lineWidth = 2.6; g.beginPath(); g.moveTo(lx * 2, ly * 2); g.lineTo(lx * 2, 38 + ly * 2); g.stroke(); g.strokeStyle = '#7a8089'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 38); g.stroke();
    g.fillStyle = '#2c2f35'; g.beginPath(); g.arc(0, 0, 3.4, 0, 7); g.fill(); g.fillStyle = '#eef2f6'; g.fillRect(-5.5, 34, 11, 6); }
  else if (p.k === 3) { g.fillStyle = shc; g.fillRect(-7 + lx, -7 + ly, 14, 14); g.fillStyle = '#3a3f47'; g.fillRect(-7, -7, 14, 14); g.fillStyle = '#565c66'; g.fillRect(-7, -7, 14, 3); g.fillStyle = '#111317'; g.fillRect(-2.5, 3, 5, 9); g.fillStyle = '#4aa3ff'; g.fillRect(-1.5, 10, 3, 2); }
  else { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(0, 0, 7.5, 0, 7); g.fill(); g.strokeStyle = 'rgba(125,125,130,.5)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.moveTo(-4, -4); g.lineTo(4, 4); g.moveTo(4, -4); g.lineTo(-4, 4); g.stroke(); }
}
function corridor(T, g, bx0, by0, bx1, by1, cx, cy, vr) { // the circuit itself: run-off, pit lane, asphalt, kerbs, barriers, kit
  const F = prep(T), L = F.L, N = T.N, hw = T.hw, Wl = T.wall, PT = T.pit, sh = F.sh, shc = `rgba(0,0,0,${F.sa})`;
  const J = i => ((i % N) + N) % N, ro = (j, sd) => sd > 0 ? T.roP[j] : T.roN[j];
  const gate = (j, sd) => { if (!PT || sd !== PT.sd) return false; const r = PT.rel(j); return r <= PT.len && (r < PT.G || r > PT.len - PT.G); };
  const runs = []; let s0 = -1;
  for (let i = 0; i < N; i++) { const m = hw + Wl + 70 + Math.max(T.roP[i], T.roN[i]), x = T.x[i], y = T.y[i];
    if (x > bx0 - m && x < bx1 + m && y > by0 - m && y < by1 + m) { if (s0 < 0) s0 = i; } else if (s0 >= 0) { runs.push([s0 - 3, i + 2]); s0 = -1; } }
  if (s0 >= 0) runs.push([s0 - 3, N + 2]);
  if (runs.length > 1 && runs[0][0] <= 0 && runs[runs.length - 1][1] >= N) runs[0][0] = runs.pop()[0] - N;
  // a polyline / a filled strip at lateral offsets (number or (j, side) => number); mask splits it
  const line = (i0, i1, sd, off, mask) => { g.beginPath(); let pen = false; const fn = typeof off === 'function';
    for (let i = i0; i <= i1; i++) { const j = J(i); if (mask && !mask(j, sd)) { pen = false; continue; }
      const o = (fn ? off(j, sd) : off) * sd, x = T.x[j] + T.nx[j] * o, y = T.y[j] + T.ny[j] * o; if (pen) g.lineTo(x, y); else { g.moveTo(x, y); pen = true; } } };
  const band = (i0, i1, sd, o1, o2, mask) => { g.beginPath(); let cur = [];
    const emit = () => { const n = cur.length; if (n > 1) { for (let k = 0; k < n; k++) { const j = cur[k], o = o1(j, sd) * sd, x = T.x[j] + T.nx[j] * o, y = T.y[j] + T.ny[j] * o; k ? g.lineTo(x, y) : g.moveTo(x, y); }
        for (let k = n - 1; k >= 0; k--) { const j = cur[k], o = o2(j, sd) * sd; g.lineTo(T.x[j] + T.nx[j] * o, T.y[j] + T.ny[j] * o); } g.closePath(); } cur = []; };
    for (let i = i0; i <= i1; i++) { const j = J(i); if (!mask || mask(j, sd)) cur.push(j); else emit(); } emit(); };
  const dots = (i0, i1, sd, off, mask, r, step) => { g.beginPath(); for (let i = i0; i <= i1; i++) { const j = J(i); if (j % step || !mask(j, sd)) continue; const o = off(j, sd) * sd, x = T.x[j] + T.nx[j] * o, y = T.y[j] + T.ny[j] * o; g.moveTo(x + r, y); g.arc(x, y, r, 0, 7); } };
  const gP = grassP(F.g), gvP = gravP(F.gvC), aP = asphP(L.as | 0), sand = F.g === 2 || F.g === 4;
  g.lineJoin = 'round';
  // --- verge grain, run-off (mown stripes or wind ripples), gravel beds ---
  for (const [a, b] of runs) { g.lineCap = 'butt'; line(a, b, 1, 0); g.strokeStyle = detP(); g.lineWidth = (hw + Wl) * 2 + 36; g.stroke();
    for (const sd of [1, -1]) { let mro = 0; for (let i = a; i <= b; i++) mro = Math.max(mro, ro(J(i), sd));
      const km = j => T.kerb[j] && !(sd === Math.sign(T.k[j]) && 1 / Math.abs(T.k[j]) < hw + 40);
      if (mro >= 1) { const inR = j => ro(j, sd) > .5;
        g.fillStyle = gP; band(a, b, sd, () => hw - 4, j => hw + Wl + ro(j, sd) + 4, inR); g.fill();
        g.save(); g.clip(); g.lineCap = 'butt'; g.lineWidth = sand ? 3 : 22;
        for (let o = hw + Wl + 8, k = 0; o < hw + Wl + mro + 26; o += sand ? 13 : 22, k++) { g.strokeStyle = sand ? 'rgba(90,60,20,.07)' : k & 1 ? 'rgba(255,255,210,.05)' : 'rgba(0,25,0,.07)'; line(a, b, sd, o, inR); g.stroke(); }
        g.restore();
        const gv = F.gv[sd > 0 ? 0 : 1];
        g.fillStyle = gvP; band(a, b, sd, () => hw + 20, j => hw + 20 + (Wl + ro(j, sd) - 34) * Math.min(1, gv[j] * 1.15), j => gv[j] > .05 && ro(j, sd) > 46); g.fill(); g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 2; g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 14; line(a, b, sd, j => hw + Wl + ro(j, sd) - 3, inR); g.stroke(); }
      g.lineCap = 'butt'; g.strokeStyle = L.k[2] || (sand ? '#3f8a5a' : '#2f7d4a'); g.lineWidth = 11; line(a, b, sd, hw + 17, km); g.stroke(); } }
  if (PT) { drawPitLane(T, cx, cy, vr); g.setLineDash([]); }
  // --- asphalt: shadow edge, white lines, surface, rubbered-in line, marks ---
  g.lineCap = 'butt'; g.lineJoin = 'round';
  for (const [a, b] of runs) { line(a, b, 1, 0); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = hw * 2 + 26; g.stroke(); }
  for (const [a, b] of runs) { line(a, b, 1, 0); g.strokeStyle = '#e6e5de'; g.lineWidth = hw * 2 + 6; g.stroke(); }
  for (const [a, b] of runs) { line(a, b, 1, 0); g.strokeStyle = aP; g.lineWidth = hw * 2 - 10; g.stroke();
    line(a, b, 1, j => clamp(T.line[j], 52 - hw, hw - 52)); g.strokeStyle = 'rgba(4,4,6,.10)'; g.lineWidth = 84; g.stroke(); g.strokeStyle = 'rgba(4,4,6,.11)'; g.lineWidth = 40; g.stroke();
    for (const d of F.dec) for (const k of [0, N, -N]) { const i0 = d.i + k; if (i0 > b || i0 + d.n < a) continue;
      const off = j => clamp(T.line[j] * d.f + d.o, 20 - hw, hw - 20); g.strokeStyle = d.c; g.lineWidth = d.w;
      if (d.tw) { line(i0, i0 + d.n, 1, j => off(j) - 17.5); g.stroke(); line(i0, i0 + d.n, 1, j => off(j) + 17.5); g.stroke(); } else { line(i0, i0 + d.n, 1, off); g.stroke(); } }
    if (L.st) { g.strokeStyle = 'rgba(222,200,110,.16)'; g.lineWidth = 3; line(a, b, 1, 0, j => j % 11 < 4); g.stroke(); } }
  if (PT && pitOn()) { g.strokeStyle = aP; g.lineWidth = 146; g.stroke(PT.mouth); }
  g.fillStyle = L.k[0]; g.fill(T.kerbW); g.fillStyle = L.k[1]; g.fill(T.kerbR);
  if (L.st) { g.fillStyle = 'rgba(235,235,228,.42)'; for (const i of T.zebra) { if (Math.abs(T.x[i] - cx) > vr + 200 || Math.abs(T.y[i] - cy) > vr + 200) continue;
    g.save(); g.translate(T.x[i], T.y[i]); g.rotate(T.ang[i]); for (let y = -hw + 12; y < hw - 12; y += 24) g.fillRect(-16, y, 32, 13); g.restore(); } }
  if (Math.abs(T.x[0] - cx) < vr + 900 && Math.abs(T.y[0] - cy) < vr + 900) { // grid, slot numbers, the circuit's name painted on the tarmac
    g.lineCap = 'round'; drawStartGrid(T); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 12px ' + FONT; g.fillStyle = 'rgba(255,255,255,.72)';
    for (let k = 0; k < 11; k++) { const p = slotPos(T, k); g.save(); g.translate(p.x, p.y); g.rotate(p.h); g.fillText(k + 1, 0, -36); g.restore(); }
    g.save(); g.translate(T.x[0], T.y[0]); g.rotate(T.ang[0] + Math.PI / 2); g.font = '900 60px ' + FONT; const sc = Math.min(1, (hw * 2 - 60) / g.measureText(T.def.name).width); g.scale(sc, sc); g.fillStyle = 'rgba(255,255,255,.13)'; g.fillText(T.def.name, 0, -150 / sc); g.restore(); }
  // --- barriers: wall by circuit type, tyre stacks outside the corners, hoardings behind ---
  for (const [a, b] of runs) for (const sd of [1, -1]) {
    const bo = j => hw + Wl + ro(j, sd), open = j => !gate(j, sd), tyre = j => open(j) && Math.abs(T.k[j]) > 1 / 520 && Math.sign(T.k[j]) === -sd, wall = j => open(j) && !tyre(j), ad = F.ad[sd > 0 ? 0 : 1];
    g.lineCap = 'butt'; g.save(); g.translate(sh[0], sh[1]); g.strokeStyle = shc; g.lineWidth = 13; line(a, b, sd, bo, open); g.stroke(); g.restore();
    if (L.w === 1) { g.lineWidth = 10; g.strokeStyle = '#c3c0b6'; line(a, b, sd, bo, wall); g.stroke(); g.strokeStyle = L.ac[0]; line(a, b, sd, bo, j => wall(j) && (j >> 2) % 3 === 0); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.38)'; g.lineWidth = 2; line(a, b, sd, j => bo(j) - 3.4, wall); g.stroke();
      g.save(); g.translate(sh[0] * 1.6, sh[1] * 1.6); g.strokeStyle = 'rgba(15,18,24,.13)'; g.lineWidth = 16; line(a, b, sd, j => bo(j) + 8, open); g.stroke(); g.restore();
      g.strokeStyle = 'rgba(40,44,52,.75)'; g.lineWidth = 1.6; line(a, b, sd, j => bo(j) + 8, open); g.stroke();
      g.fillStyle = '#3c4149'; dots(a, b, sd, j => bo(j) + 8, open, 2.3, 5); g.fill(); }
    else if (L.w === 2) { g.lineWidth = 12; g.strokeStyle = '#f0f0ee'; line(a, b, sd, bo, wall); g.stroke(); g.strokeStyle = L.ac[0]; line(a, b, sd, bo, j => wall(j) && (j >> 2) & 1); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; line(a, b, sd, j => bo(j) - 4, wall); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; line(a, b, sd, j => bo(j) + 5.5, wall); g.stroke(); }
    else { g.lineWidth = 8; g.strokeStyle = '#cdd0d4'; line(a, b, sd, bo, wall); g.stroke(); g.strokeStyle = '#6f757c'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#585e66'; dots(a, b, sd, j => bo(j) + 5, wall, 1.9, 4); g.fill(); }
    g.fillStyle = '#15161a'; dots(a, b, sd, j => bo(j) + 3, tyre, 7, 2); g.fill(); g.fillStyle = '#30333a'; dots(a, b, sd, j => bo(j) + 3, tyre, 3.1, 2); g.fill();
    g.strokeStyle = L.ac[0]; g.lineWidth = 3.5; line(a, b, sd, j => bo(j) - 5.5, tyre); g.stroke();
    const bd = j => bo(j) + (L.w === 1 ? 8 : 11); g.lineWidth = 7;
    for (let c = 0; c < 3; c++) { g.strokeStyle = L.ac[c]; line(a, b, sd, bd, j => open(j) && ad[j] && (j >> 3) % 3 === c); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.6; line(a, b, sd, bd, j => open(j) && ad[j] && (j >> 3) % 3 !== 1 && j % 8 > 1 && j % 8 < 6); g.stroke(); }
  if (PT && vis(PT.wall, cx, cy, vr + 40)) { g.lineCap = 'butt'; g.save(); g.translate(sh[0], sh[1]); g.strokeStyle = shc; g.lineWidth = 12; g.stroke(PT.wall.p); g.restore(); g.strokeStyle = '#cdd0d4'; g.lineWidth = 8; g.stroke(PT.wall.p); g.strokeStyle = '#6f757c'; g.lineWidth = 1.5; g.stroke(PT.wall.p); }
  for (const p of F.props) { if (p.x < bx0 - 70 || p.x > bx1 + 70 || p.y < by0 - 70 || p.y > by1 + 70) continue; g.save(); g.translate(p.x, p.y); g.rotate(p.a); prop(g, p, F); g.restore(); }
}
function stands(T, g, cx, cy, vr) { // grandstands (tiers, aisles, canopy, hoardings) and the pit garages
  const F = prep(T), L = F.L, shc = `rgba(0,0,0,${F.sa})`;
  for (const s of T.stands) { if (Math.abs(s.x - cx) > vr + 230 || Math.abs(s.y - cy) > vr + 230) continue;
    const ca = Math.cos(s.a), sn = Math.sin(s.a), lx = (F.sh[0] * ca + F.sh[1] * sn) * 2.4, ly = (-F.sh[0] * sn + F.sh[1] * ca) * 2.4;
    g.save(); g.translate(s.x, s.y); g.rotate(s.a);
    g.fillStyle = shc; g.fillRect(-146 + lx, -88 + ly, 292, 158);
    g.fillStyle = '#9a9ea6'; g.fillRect(-146, -80, 292, 150);
    for (let r = 0; r < 6; r++) { const y = 30 - r * 20; g.fillStyle = PAT.crowd; g.fillRect(-140, y, 280, 20); g.fillStyle = `rgba(255,255,255,${(r * .028).toFixed(3)})`; g.fillRect(-140, y, 280, 20); g.fillStyle = 'rgba(0,0,0,.30)'; g.fillRect(-140, y + 18, 280, 2); }
    g.fillStyle = '#c9cdd3'; for (const x of [-72, 0, 72]) g.fillRect(x - 3.5, -70, 7, 120);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(-140, -22, 280, 9);
    g.fillStyle = 'rgba(238,241,245,.93)'; g.fillRect(-146, -84, 292, 62);
    g.strokeStyle = 'rgba(120,128,138,.55)'; g.lineWidth = 1.4; g.beginPath(); for (let x = -146; x <= 146.1; x += 29.2) { g.moveTo(x, -84); g.lineTo(x, -22); } g.moveTo(-146, -53); g.lineTo(146, -53); g.stroke();
    g.fillStyle = L.ac[0]; g.fillRect(-146, -89, 292, 5);
    g.fillStyle = '#eceef1'; g.fillRect(-146, 50, 292, 10);
    for (let c = 0; c < 3; c++) { g.fillStyle = L.ac[c]; for (let x = -146 + c * 48.7; x < 146; x += 146) g.fillRect(x, 60, 46, 8); }
    g.restore(); }
  for (const p of T.pits) { if (Math.abs(p.x - cx) > vr + 200 || Math.abs(p.y - cy) > vr + 200) continue;
    const ca = Math.cos(p.a), sn = Math.sin(p.a), lx = (F.sh[0] * ca + F.sh[1] * sn) * 1.6, ly = (-F.sh[0] * sn + F.sh[1] * ca) * 1.6;
    g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = shc; g.fillRect(-48 + lx, -40 + ly, 101, 120);
    g.scale(.74, 1); g.fillStyle = '#d9dce0'; g.fillRect(-64, -40, 136, 120); g.fillStyle = '#b9bdc3'; g.fillRect(-64, 30, 136, 50);
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = -30; y < 30; y += 10) g.fillRect(-64, y, 136, 1.5);
    g.fillStyle = TEAMS[p.t].c1; g.fillRect(-60, -46, 128, 10); g.fillStyle = '#2a2d33'; g.fillRect(-56, -36, 120, 8);
    g.restore(); }
}
function bake(T, t) {
  const g = t.g, main = ctx, me0 = G.me, e = 2 / RES, cx = t.x + tw / 2, cy = t.y + tw / 2, vr = tw / 2 + e;
  ctx = g; G.me = -1; // the old painters draw through the game's `ctx`; no "my pit box" highlight in the bake
  try {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setLineDash([]); g.imageSmoothingEnabled = true;
    g.fillStyle = '#39493a'; g.fillRect(0, 0, TS + 2, TS + 2);
    g.setTransform(RES, 0, 0, RES, 1 - t.x * RES, 1 - t.y * RES); g.lineCap = 'round'; g.lineJoin = 'round';
    const vc = T.chunks.filter(c => vis(c, cx, cy, vr + 300));
    if (T.city) cityGround(T, cx, cy, vr, vc); else if (T.def.zones) zoneGround(T, cx, cy, vr, vc); else { g.fillStyle = PAT.grass; g.fillRect(cx - vr, cy - vr, vr * 2, vr * 2); }
    if (!T.def.zones) { drawTrees(T, cx, cy, vr); if (T.palms) drawPalms(T, cx, cy, vr); }
    g.globalAlpha = 1; g.setLineDash([]);
    corridor(T, g, t.x - e, t.y - e, t.x + tw + e, t.y + tw + e, cx, cy, vr);
    stands(T, g, cx, cy, vr);
  } catch (err) { console.warn('fx bake', err); }
  ctx = main; G.me = me0;
}

/* =====================================================================
   TILE CACHE
   ===================================================================== */
function zoomK() { return G.mode === 'attract' ? 1 : clamp(S.zoom || 1, .45, 1.6); }
function flush() { for (const t of tiles.values()) if (pool.length < 96) pool.push(t.c); tiles.clear(); st.cold = true; }
function setRes() { // bake at (roughly) the closest zoom the camera reaches
  if (q < 0) q = S.gfx === 'hi' ? 2 : S.gfx === 'lo' ? 0 : isDesk ? 2 : 1;
  cap = [140, 320, 620][q];
  const base = Math.min(innerHeight / 560, innerWidth / 305) * (isDesk ? 1 : .5) * clamp(S.zoom || 1, .45, 1.6) * DPR * .85, r = clamp(Math.round(base * 4) / 4, .5, [1, 1.75, 2.5][q]);
  if (r !== RES) { RES = r; tw = TS / RES; flush(); }
}
function tile(T, a, b) { const c = pool.pop() || mk(TS + 2, TS + 2), t = { c, g: c.getContext('2d', { alpha: false }), x: a * tw, y: b * tw, f: fN }; bake(T, t); tiles.set(a + ',' + b, t); return t; }
function world(T, x0, y0, x1, y1) {
  const g = ctx, a0 = Math.floor(x0 / tw), a1 = Math.floor(x1 / tw), b0 = Math.floor(y0 / tw), b1 = Math.floor(y1 / tw), t0 = performance.now(), e = 1 / RES;
  const need = (a1 - a0 + 1) * (b1 - b0 + 1); let baked = 0, miss = 0;
  g.imageSmoothingEnabled = true;
  for (let b = b0; b <= b1; b++) for (let a = a0; a <= a1; a++) { let t = tiles.get(a + ',' + b);
    if (!t) { if (!st.cold && baked && performance.now() - t0 > 12) { miss++; g.fillStyle = '#39493a'; g.fillRect(a * tw, b * tw, tw + e, tw + e); continue; } t = tile(T, a, b); baked++; }
    t.f = fN; g.drawImage(t.c, 1, 1, TS + 1, TS + 1, t.x, t.y, tw + e, tw + e); }
  if (!miss) st.cold = false;
  if (!baked) { // look ahead: one tile per frame, the ones in the direction of travel first
    const c = G.cars[G.follow], sp = c ? Math.hypot(c.vx, c.vy) : 0, dx = sp > 30 ? c.vx / sp : 0, dy = sp > 30 ? c.vy / sp : 0; let best = null, bs = -1e9;
    for (let b = b0 - 1; b <= b1 + 1; b++) for (let a = a0 - 1; a <= a1 + 1; a++) { if ((a >= a0 && a <= a1 && b >= b0 && b <= b1) || tiles.has(a + ',' + b)) continue; const s = ((a + .5) * tw - cam.x) * dx + ((b + .5) * tw - cam.y) * dy; if (s > bs) { bs = s; best = [a, b]; } }
    if (best && (sp > 30 || fN % 4 === 0)) tile(T, best[0], best[1]); }
  const max = Math.max(need * 2 + 10, 28);
  if (tiles.size > max) { let old = null, k0 = null; for (const [k, t] of tiles) if (!old || t.f < old.f) { old = t; k0 = k; } if (old.f < fN - 3) { tiles.delete(k0); if (pool.length < 96) pool.push(old.c); } }
}
function skid(x1, y1, x2, y2, a) { // tyre marks are painted straight into the megatexture: they stay for the whole race
  if ((x2 - x1) ** 2 + (y2 - y1) ** 2 > 3600) return;
  const t1 = tiles.get(Math.floor(x1 / tw) + ',' + Math.floor(y1 / tw)), t2 = tiles.get(Math.floor(x2 / tw) + ',' + Math.floor(y2 / tw));
  for (const t of t2 === t1 ? [t1] : [t1, t2]) { if (!t) continue;
    const g = t.g; g.setTransform(RES, 0, 0, RES, 1 - t.x * RES, 1 - t.y * RES); g.globalAlpha = 1; g.strokeStyle = `rgba(8,8,10,${a.toFixed(2)})`; g.lineWidth = 4.4; g.lineCap = 'butt'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
}

/* =====================================================================
   PARTICLES · 0 smoke 1 grass dust 2 sand dust 3 spray 4 debris 5 spark 6 firework
   ===================================================================== */
function emit(k, x, y, vx, vy, l, r, gr, a, c) { if (PS.length < cap) PS.push({ k, x, y, vx, vy, l, m: l, r: r || 2, g: gr || 0, a: a == null ? 1 : a, c }); }
const nearCam = c => Math.abs(c.x - cam.x) < 1700 && Math.abs(c.y - cam.y) < 1300;
function puff(x, y, c, kind) { emit(kind ? (kind === 2 ? 2 : 1) : 0, x, y, c.vx * .25 + rand(-20, 20), c.vy * .25 + rand(-20, 20), kind ? .5 : 1.1, 6, 30, .5); }
function hit(c, nx, ny, vn) { // wall contact: sparks along the barrier, carbon on a big one
  if (vn < 8 || !nearCam(c)) return; const tx = -ny, ty = nx, sp = Math.hypot(c.vx, c.vy), sg = (c.vx * tx + c.vy * ty) >= 0 ? 1 : -1, n = vn > 40 ? Math.min(14, 3 + vn / 25 | 0) : Math.random() < .3 ? 1 : 0;
  for (let k = 0; k < n; k++) emit(5, c.x + nx * 18, c.y + ny * 18, tx * sg * sp * rand(.3, .8) - nx * rand(20, 140), ty * sg * sp * rand(.3, .8) - ny * rand(20, 140), rand(.2, .5));
  if (vn > 120) for (let k = 0; k < 6; k++) emit(4, c.x + nx * 16, c.y + ny * 16, -nx * rand(40, 200) + rand(-80, 80), -ny * rand(40, 200) + rand(-80, 80), rand(.5, 1), 0, 0, 1, '#1b1c20');
}
function bump(x, y, j) { if (j < 14 || Math.abs(x - cam.x) > 1700 || Math.abs(y - cam.y) > 1300) return; for (let k = Math.min(8, 2 + j / 20 | 0); k > 0; k--) emit(5, x, y, rand(-220, 220), rand(-220, 220), rand(.15, .4)); }
function burst(x, y) { const cols = ['#ff4a5a', '#ffd23a', '#4ad2ff', '#7dff8a', '#ff8ae0', '#ffffff'], c = cols[Math.random() * cols.length | 0], n = q ? 34 : 18;
  for (let k = 0; k < n; k++) { const a = k / n * 6.283 + rand(-.1, .1), v = rand(140, 330); emit(6, x, y, Math.cos(a) * v, Math.sin(a) * v, rand(.9, 1.5), 0, 0, 1, c); } st.flash = Math.max(st.flash, .22); }
function effects(dt) { // emitters and particle physics (runs only while the race is not paused)
  const T = G.track, F = prep(T), wet = clamp((G.h - 20) / 40, 0, 1);
  if (T.boats) for (const b of T.boats) { const nx = b.x + Math.sin(b.a) * b.v * dt, ny = b.y - Math.cos(b.a) * b.v * dt; if (T.isSea(nx + Math.sin(b.a) * 260, ny - Math.cos(b.a) * 260)) { b.x = nx; b.y = ny; } else b.a += dt * 1.2; }
  for (const c of G.cars) {
    if (c.en == null) c.en = 1;
    if (!c.human && G.phase === 'race') c.bst = Math.abs(T.k[c.idx]) < 1 / 1500 && c.vF > 380 && c.tow > 0 && !c.inPit && (c.bst ? c.en > .03 : c.en > .45); // bots spend their battery in the slipstream
    c.en = c.bst ? Math.max(0, c.en - dt / 6.5) : Math.min(1, c.en + dt * ((c.brk > 0 || (c.thr === 0 && c.vF > 200)) ? .1 : .03));
    c.fxH = clamp((c.fxH || 0) + (c.brk > .3 && c.vF > 260 ? dt * 2.6 : -dt * 1.3), 0, 1);
    if (c.thr0 > .8 && c.thr === 0 && c.vF > VMAX * .45) c.fl = .16; else if (c.fl > 0) c.fl -= dt; c.thr0 = c.thr;
    const fx = Math.sin(c.h), fy = -Math.cos(c.h), rx = -fy, ry = fx, wx = 9.55 * CS, wy = 15 * CS, near = nearCam(c);
    const w = [c.x + rx * wx - fx * wy, c.y + ry * wx - fy * wy, c.x - rx * wx - fx * wy, c.y - ry * wx - fy * wy], s2 = Math.random() < .5 ? 0 : 2;
    const launch = c.surf === 0 && G.phase === 'race' && G.sess === 'race' && G.t < 1.3 && c.vF > 20 && c.vF < 280;
    if (c.wl && near && (c.slide > .25 || launch)) {
      if (c.surf === 0 || c.surf === 3) { const a = launch ? .3 : .1 + c.slide * .2; skid(c.wl[0], c.wl[1], w[0], w[1], a); skid(c.wl[2], c.wl[3], w[2], w[3], a + .001); }
      if (Math.random() < (launch ? .8 : c.slide * .7)) emit(0, w[s2], w[s2 + 1], c.vx * .25 + rand(-22, 22), c.vy * .25 + rand(-22, 22), 1.15, 7, 30, .55); }
    if (near && (c.surf === 1 || c.surf === 2) && c.vF > 60) { if (Math.random() < .55) emit(F.sand ? 2 : 1, w[s2], w[s2 + 1], c.vx * .25 + rand(-20, 20), c.vy * .25 + rand(-20, 20), .7, 7, 36, .5);
      if (Math.random() < .4) emit(4, w[s2], w[s2 + 1], c.vx * .5 + rand(-110, 110), c.vy * .5 + rand(-110, 110), rand(.3, .6), 0, 0, 1, F.sand ? '#c9b282' : '#4a7a3a'); }
    // titanium skid block: flat out over the bumps, on the kerbs, under boost
    if (near && c.surf !== 1 && c.surf !== 2 && c.vF > VMAX * .8 && (c.bst || c.surf === 3 || hash((c.idx / 9 | 0) * 1.31 + T.N) < .14) && Math.random() < .55)
      for (let k = 0; k < 3; k++) emit(5, c.x - fx * 30 + rand(-6, 6), c.y - fy * 30 + rand(-6, 6), c.vx * rand(.45, .8) + rx * rand(-70, 70), c.vy * rand(.45, .8) + ry * rand(-70, 70), rand(.18, .42));
    if (near && wet > .05 && c.vF > 140 && Math.random() < wet * Math.min(1, c.vF / 500)) emit(3, w[s2], w[s2 + 1], c.vx * .35 + rand(-25, 25), c.vy * .35 + rand(-25, 25), .9, 8, 60 + c.vF * .05, .5 * wet + .15);
    c.wl = w;
  }
  const me = G.cars[G.me];
  if (me && me.fin && !st.fin && G.sess === 'race') { st.fin = true; st.fw = 7; st.conf = standings().indexOf(me) < 3 ? 6 : 0; }
  if (st.fw > 0) { st.fw -= dt; if ((st.fwT -= dt) <= 0) { st.fwT = rand(.2, .5); burst(cam.x + rand(-600, 600), cam.y + rand(-380, 380)); } }
  const d1 = Math.exp(-dt * 1.8), d2 = Math.exp(-dt * 3.4);
  for (let i = PS.length - 1; i >= 0; i--) { const p = PS[i]; p.l -= dt; if (p.l <= 0) { PS[i] = PS[PS.length - 1]; PS.pop(); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; const d = p.k >= 5 ? d2 : d1; p.vx *= d; p.vy *= d; p.r += p.g * dt; if (p.k === 6) p.vy += 70 * dt; }
}
function parts(g, inV) {
  if (!SM) SM = [soft('#e9e9ee', .5), soft('#6f7f4a', .5), soft('#c7b086', .5), soft('#cfe0f2', .45)];
  for (const p of PS) { if (p.k > 3 || !inV(p.x, p.y, p.r)) continue; g.globalAlpha = p.l / p.m * p.a; g.drawImage(SM[p.k], p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
  g.globalAlpha = 1;
  for (const p of PS) if (p.k === 4) { g.fillStyle = p.c; g.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2); }
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.beginPath();
  for (const p of PS) if (p.k === 5) { g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .032, p.y - p.vy * .032); }
  g.strokeStyle = '#ff9a2e'; g.lineWidth = 2.6; g.stroke(); g.strokeStyle = '#fff3cf'; g.lineWidth = 1; g.stroke();
  g.lineWidth = 2.2; for (const p of PS) if (p.k === 6) { g.globalAlpha = Math.min(1, p.l / p.m * 1.6); g.strokeStyle = p.c; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .07, p.y - p.vy * .07); g.stroke(); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}

/* =====================================================================
   THE LIVING WORLD: traffic, trains, boats, water, crowd, rain on the road
   ===================================================================== */
function alive(T, F, g, dt, now, inV, vc, hx, hy) {
  if (T.boats) for (const b of T.boats) if (inV(b.x, b.y, 320)) { g.save(); g.translate(b.x, b.y); g.rotate(b.a); g.fillStyle = 'rgba(235,250,250,.18)'; g.beginPath(); g.moveTo(-b.w / 2, b.l / 2); g.lineTo(-b.w * 2.5, b.l * 3.5); g.lineTo(b.w * 2.5, b.l * 3.5); g.lineTo(b.w / 2, b.l / 2); g.fill(); g.restore(); drawYacht(b); }
  if (T.movers) for (const m of T.movers) { m.x += m.v * dt; if (m.x > m.b) m.v = -Math.abs(m.v); if (m.x < m.a) m.v = Math.abs(m.v); if (!inV(m.x, m.y, 40) || hidden(T, m.x, m.y)) continue;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(m.x - m.l / 2 + 2, m.y - 6, m.l, 13); g.fillStyle = m.c; rrect(g, m.x - m.l / 2, m.y - 8, m.l, 15, 3); g.fill(); g.fillStyle = 'rgba(25,35,45,.8)'; g.fillRect(m.x - m.l * .22, m.y - 6, m.l * .44, 11); if (m.l > 40) { g.fillStyle = '#f2ece0'; g.fillRect(m.x - m.l / 2, m.y + 2, m.l, 3); }
    if (F.L.tod > 1) { const fx = m.v > 0 ? m.x + m.l / 2 - 2 : m.x - m.l / 2; g.fillStyle = '#fff0be'; g.fillRect(fx, m.y - 7, 2, 3); g.fillRect(fx, m.y + 3, 2, 3); } }
  if (T.rail) { const r = T.rail, pos = s => { s = ((s % r.tot) + r.tot) % r.tot; let k = 1; while (k < r.seg.length - 1 && r.seg[k] < s) k++; const t = (s - r.seg[k - 1]) / (r.seg[k] - r.seg[k - 1]), a = r.s[k - 1], b = r.s[k]; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), Math.atan2(b[0] - a[0], -(b[1] - a[1]))]; };
    for (let k = 0; k < 6; k++) { const [x, y, a] = pos(now * 340 - k * 112); if (!inV(x, y, 100)) continue; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#d9d7d0'; rrect(g, -19, -52, 38, 104, 7); g.fill(); g.fillStyle = '#e8761e'; g.fillRect(-19, -22, 38, 44); g.fillStyle = '#6f7277'; g.fillRect(-10, -40, 20, 12); g.fillRect(-10, 28, 20, 12); g.restore(); } }
  if (T.marks) for (const m of T.marks) if (!(m.s.sc > 1) && inV(m.x, m.y, 520)) { if (m.k === 'ferris') drawFerris(m.x, m.y); else if (m.k === 'sphere') txDrawSphere(m.x, m.y); }
  if (F.gl.length) { g.fillStyle = '#fff'; const k = F.L.tod > 1 ? .9 : 1.9; for (const p of F.gl) { if (!inV(p.x, p.y, 4)) continue; const a = Math.sin(now * 1.7 + p.p); if (a < .55) continue; g.globalAlpha = (a - .55) * k; g.fillRect(p.x - 3.5, p.y - .7, 7, 1.4); g.fillRect(p.x - .7, p.y - 2.4, 1.4, 4.8); } g.globalAlpha = 1; }
  // camera flashes in the grandstands
  g.fillStyle = '#fff'; const tick = Math.floor(now * 11), th = F.L.tod > 1 ? .5 : .2;
  for (const s of T.stands) { if (!inV(s.x, s.y, 170)) continue; const ca = Math.cos(s.a), sn = Math.sin(s.a);
    for (let n = 0; n < 2; n++) { const k = tick * 1.37 + s.x * .013 + n * 7.1; if (hash(k) > th) continue; const lx = (hash(k * 1.3) - .5) * 270, ly = -68 + hash(k * 2.7) * 112; g.fillRect(s.x + lx * ca - ly * sn - 1.6, s.y + lx * sn + ly * ca - 1.6, 3.2, 3.2); } }
  const wet = clamp((G.h - 18) / 45, 0, 1);
  if (wet > .02) { // a wet road shines, raindrops ring on it
    g.lineCap = 'butt'; g.strokeStyle = `rgba(150,178,210,${(wet * .11).toFixed(3)})`; g.lineWidth = T.hw * 2 - 10; const P = new Path2D(); for (const c of vc) P.addPath(c.p); g.stroke(P);
    if (q) { g.strokeStyle = `rgba(225,238,255,${(.12 + wet * .22).toFixed(3)})`; g.lineWidth = 1; g.beginPath();
      for (let k = 0, n = 18 + wet * 46 | 0; k < n; k++) { const ph = now * 2.6 + k * .618, sl = Math.floor(ph), age = ph - sl, x = cam.x + (hash(sl * 1.7 + k * 13.1) - .5) * hx * 2, y = cam.y + (hash(sl * 2.3 + k * 7.7) - .5) * hy * 2, r = 2 + age * 13; g.moveTo(x + r, y); g.ellipse(x, y, r, r * .8, 0, 0, 7); }
      g.stroke(); } g.lineCap = 'round'; }
}
function pitLive(T, g, now, inV) { // my box pulses, the entry arrows flash when it is time to stop
  const P = T.pit; if (!P || !pitOn()) return; const me = G.cars[G.me], N = T.N;
  if (me && G.mode === 'race') { const b = P.boxP[me.team]; if (inV(b.x, b.y, 100)) { const pulse = (.55 + .45 * Math.sin(now * 5.5)).toFixed(2); g.save(); g.translate(b.x, b.y); g.rotate(b.h); g.strokeStyle = `rgba(255,214,0,${pulse})`; g.lineWidth = 7; g.strokeRect(-27, -46, 54, 92);
      g.fillStyle = `rgba(255,214,0,${pulse})`; g.font = '900 20px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BOX', 0, 0); g.restore(); } }
  const hot = me && (me.wear <= 50 || (G.h > 30 && me.tyre !== 3)); g.fillStyle = hot ? `rgba(255,214,0,${(.55 + .45 * Math.sin(now * 6.6)).toFixed(2)})` : 'rgba(255,214,0,.45)';
  for (let k = 8; k <= 56; k += 12) { const i = (P.a - k + N) % N, o = (T.hw - 36) * P.sd, x = T.x[i] + T.nx[i] * o, y = T.y[i] + T.ny[i] * o; if (!inV(x, y, 30)) continue;
    g.save(); g.translate(x, y); g.rotate(T.ang[i] + P.sd * .4); g.beginPath(); g.moveTo(16, 0); g.lineTo(-12, -20); g.lineTo(-4, 0); g.lineTo(-12, 20); g.closePath(); g.fill(); g.restore(); }
}
const stopDec = () => 2 * BRAKE * .8;
function guide(T, g) { // driving line: green = flat out, yellow = at the limit, red = slow down now
  const me = G.cars[G.me]; if (!me || me.fin || me.inPit || G.phase !== 'race') return; const N = T.N, v = Math.max(me.vF, 80), B = stopDec();
  for (let k = 12; k <= 122; k += 5) { const j = (me.idx + k) % N, v1 = T.vt[j] * 1.07, r = v / Math.sqrt(v1 * v1 + B * k * DS), o = T.line[j] * .9;
    g.fillStyle = r > 1.03 ? '#ff3b3b' : r > .93 ? '#ffc400' : '#24d07a'; g.globalAlpha = .55 * Math.min(1, (127 - k) / 40) * Math.min(1, k / 24);
    g.save(); g.translate(T.x[j] + T.nx[j] * o, T.y[j] + T.ny[j] * o); g.rotate(T.ang[j]); g.beginPath(); g.moveTo(9, 0); g.lineTo(-5, -9); g.lineTo(-1, 0); g.lineTo(-5, 9); g.closePath(); g.fill(); g.restore(); }
  g.globalAlpha = 1;
}

/* =====================================================================
   CARS: shadows, wet reflections, pit crew, brake discs, flames, boost
   ===================================================================== */
/* the pit crew: runs out as the car stops, jacks it up, swaps all four wheels, drops it, waves it off */
function person(g, x, y, a, col) { g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = col; g.lineWidth = 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-2.7, .2); g.lineTo(-1.7, -3.6); g.moveTo(2.7, .2); g.lineTo(1.7, -3.6); g.stroke(); g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 3.4, 2, 0, 0, 7); g.fill(); g.fillStyle = '#f2f2f2'; g.beginPath(); g.arc(0, -.2, 1.55, 0, 7); g.fill(); g.restore(); }
function wheelTop(g, x, y, col) { g.fillStyle = '#0e0f12'; rrect(g, x - 2.8, y - 5, 5.6, 10, 1.4); g.fill(); if (col) { g.fillStyle = col; g.fillRect(x - 2.8, y - .7, 5.6, 1.4); } }
function crew(g, T, c, now, inV) {
  const P = T.pit; if (!P || !P.boxP[c.team]) return; const b = P.boxP[c.team]; if (!inV(b.x, b.y, 160)) return;
  if (c.pitS && !c.crA) { c.crA = now; c.crO = 0; } if (!c.pitS && c.crA && !c.crO) c.crO = now; if (c.crO && now - c.crO > .8) { c.crA = 0; c.crO = 0; } if (!c.crA) return;
  const come = ss((now - c.crA) / .4), gone = c.crO ? ss((now - c.crO) / .7) : 0, k = come * (1 - gone), col = TEAMS[c.team].c1, sd = P.sd, prog = c.pitSv ? 1 - clamp(c.pitT / (c.pitD || 2.1), 0, 1) : c.crO ? 1 : 0, nu = TY[c.pitSel != null ? c.pitSel : c.tyre].c, seg = (a, e) => clamp((prog - a) / (e - a), 0, 1), face = (x, y, tx, ty) => Math.atan2(tx - x, -(ty - y));
  g.save(); g.translate(b.x, b.y); g.rotate(b.h); g.scale(CS, CS);
  const home = (x, y) => [sd * 74, y * 1.5 + x * .2], at = (h, x, y) => [lerp(h[0], x, k), lerp(h[1], y, k)];
  for (const [wx, wy] of [[-11, -16], [11, -16], [-11, 15], [11, 15]]) { const s = Math.sign(wx), ox = wx + s * 13;
    const off = seg(.12, .36), inn = seg(.38, .62), f0 = at(home(wx, wy), wx + s * 9, wy + 7), tOld = [lerp(wx, ox + s * 5, off), lerp(wy, wy + 11, off)];
    if (prog > .1 && !c.crO) wheelTop(g, tOld[0], tOld[1], null);
    const m1 = prog > .12 ? [lerp(f0[0], ox + s * 5, off), lerp(f0[1], wy + 13, off)] : f0; person(g, m1[0], m1[1], face(m1[0], m1[1], tOld[0], tOld[1]), col);
    const f1 = at(home(wx, wy), ox + s * 4, wy - 11), tNew = [lerp(ox + s * 4, wx, inn), lerp(wy - 9, wy, inn)];
    if (!c.crO) wheelTop(g, tNew[0], tNew[1], nu);
    const m2 = [lerp(f1[0], wx + s * 9, inn), lerp(f1[1], wy - 7, inn)]; person(g, m2[0], m2[1], face(m2[0], m2[1], tNew[0], tNew[1]), col);
    const f2 = at(home(wx, wy), wx + s * 8, wy), rot = (prog > .04 && prog < .14) || (prog > .64 && prog < .8) ? Math.sin(now * 60) * .6 : 0; person(g, f2[0], f2[1], face(f2[0], f2[1], wx, wy) + rot, col);
    g.strokeStyle = '#d7d9de'; g.lineWidth = 1; g.beginPath(); g.moveTo(f2[0] - s * 3, f2[1]); g.lineTo(wx + s * 3, wy); g.stroke(); }
  for (const [x, y] of [[0, -38], [0, 36]]) { const p = at(home(x, y), x, y); person(g, p[0], p[1], face(p[0], p[1], 0, 0), col); g.strokeStyle = '#ffc400'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(p[0], p[1] + Math.sign(-y) * 2); g.lineTo(0, y * .78); g.stroke(); }
  { const p = at(home(0, -62), -22, -46); person(g, p[0], p[1], face(p[0], p[1], 0, 0), '#f4f4f4'); g.strokeStyle = '#d7d9de'; g.lineWidth = 1; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + 8, p[1] + 4); g.stroke(); g.fillStyle = prog > .93 || c.crO ? '#24d07a' : '#ff3b3b'; g.beginPath(); g.arc(p[0] + 10, p[1] + 5, 4, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.stroke(); }
  g.restore();
}
function cars(T, F, g, td, now, inV, cx, cy, vr) {
  const follow = G.cars[G.follow], ghost = c => G.sess === 'quali' && c !== follow, wet = clamp((G.h - 18) / 50, 0, 1), sh = td.sh;
  const body = c => { const sp = SPR[c.team]; g.save(); g.translate(c.rx, c.ry); g.rotate(c.rh); g.scale(CS, CS); g.drawImage(sp.car, -sp.W / 2, -sp.H / 2, sp.W, sp.H); g.restore(); };
  for (const c of G.cars) { if (!inV(c.rx, c.ry, 90) || ghost(c)) continue; const sp = SPR[c.team];
    g.save(); g.globalAlpha = Math.min(1, td.sa / .34); g.translate(c.rx + sh[0] * 1.15, c.ry + sh[1] * 1.15); g.rotate(c.rh); g.scale(CS, CS); g.drawImage(sp.sh, -sp.W / 2 - sp.P, -sp.H / 2 - sp.P, sp.W + sp.P * 2, sp.H + sp.P * 2); g.restore();
    if (wet > .05) { g.save(); g.globalAlpha = wet * .26; g.translate(c.rx + 3, c.ry + 14); g.rotate(c.rh); g.scale(CS, CS * 1.05); g.drawImage(sp.car, -sp.W / 2, -sp.H / 2, sp.W, sp.H); g.restore(); } }
  for (const c of G.cars) { if (!inV(c.rx, c.ry, 90)) continue; const sp = SPR[c.team], gh = ghost(c);
    const lift = c.pitS && c.pitSv ? 1 + .06 * clamp(Math.min((1 - c.pitT / (c.pitD || 2.1)) / .08, c.pitT / (c.pitD || 2.1) / .06), 0, 1) : 1; // up on the jacks
    g.save(); g.globalAlpha = gh ? .5 : 1; g.translate(c.rx, c.ry); g.rotate(c.rh); g.scale(CS * lift, CS * lift); g.drawImage(sp.car, -sp.W / 2, -sp.H / 2, sp.W, sp.H);
    if (!gh) { if ((wet > .1 || c.inPit || c.pen > 0) && now * 4 % 1 < .5) { g.fillStyle = '#ff2a2a'; g.fillRect(-2.2, sp.H / 2 - 4.6, 4.4, 2.4); } // rain light / pit limiter
    }
    g.restore(); }
  if (T.pit && pitOn()) for (const c of G.cars) crew(g, T, c, now, inV);
  if (T.bridge) drawBridge(T, cx, cy, vr, body);
  g.globalCompositeOperation = 'lighter';
  for (const c of G.cars) { if (!inV(c.rx, c.ry, 90) || ghost(c)) continue; const fx = Math.sin(c.rh), fy = -Math.cos(c.rh), rx = -fy, ry = fx;
    const at = (lx, ly, r, col, a) => { g.globalAlpha = a; g.drawImage(txGlow(col), c.rx + (rx * lx - fx * ly) * CS - r, c.ry + (ry * lx - fy * ly) * CS - r, r * 2, r * 2); };
    const heat = c.fxH || 0; if (heat > .05) { at(-9.6, -16.5, 13, '#ff6a1e', heat); at(9.6, -16.5, 13, '#ff6a1e', heat); at(-9.6, 15, 10, '#ff5a1e', heat * .7); at(9.6, 15, 10, '#ff5a1e', heat * .7); }
    if (c.fl > 0) at(0, 30, 16 + Math.random() * 8, '#ff9a3a', 1);
    if (c.bst) { at(0, 31, 26 + Math.random() * 10, '#4aa8ff', 1); at(0, 44, 40, '#2a6cff', .55); }
    if (c.pitS && Math.random() < .5) at(Math.random() < .5 ? -15 : 15, Math.random() < .5 ? -16.5 : 15, 9, '#ffe28a', 1); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function overhead(T, F, g, td, now, inV, cx, cy, vr) { // start gantry with live lights, sponsor bridges, canopies, the tunnel
  const on = G.phase === 'grid' && G.mode === 'race' ? Math.min(5, Math.floor(G.lt)) : 0, go = G.mode === 'race' && G.sess === 'race' && G.phase === 'race' && G.t < 1.8;
  for (const o of F.over) { if (!inV(o.x, o.y, o.l + o.r)) continue; const ca = Math.cos(o.a), sn = Math.sin(o.a), lx = (td.sh[0] * ca + td.sh[1] * sn) * 2.6, ly = (-td.sh[0] * sn + td.sh[1] * ca) * 2.6, w = o.k ? 30 : 15, len = o.l + o.r;
    g.save(); g.translate(o.x, o.y); g.rotate(o.a); g.fillStyle = `rgba(0,0,0,${td.sa * .8})`; g.fillRect(-o.l + lx, -w / 2 + ly, len, w);
    if (o.k) { g.fillStyle = F.L.ac[0]; g.fillRect(-o.l, -15, len, 30); g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(-o.l, -15, len, 2.5); g.fillRect(-o.l, 12.5, len, 2.5); g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(-o.l, 4, len, 8.5);
      g.fillStyle = '#fff'; g.font = '900 17px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.txt, -o.l / 2, .5); g.fillText('APEX GP', o.r / 2, .5); }
    else { g.fillStyle = '#1d2026'; g.fillRect(-o.l, -7.5, len, 15); g.fillStyle = 'rgba(255,255,255,.10)'; for (let x = -o.l + 6; x < o.r; x += 16) g.fillRect(x, -7.5, 2, 15);
      for (let k = 0; k < 5; k++) { const x = (k - 2) * 26, lit = go || k < on; g.fillStyle = '#0b0c0f'; rrect(g, x - 10, -6.5, 20, 13, 3); g.fill(); g.fillStyle = go ? '#2bff8a' : lit ? '#ff2a2a' : '#3a1414';
        g.beginPath(); g.arc(x - 4.4, 0, 3.2, 0, 7); g.moveTo(x + 7.6, 0); g.arc(x + 4.4, 0, 3.2, 0, 7); g.fill();
        if (lit) { g.globalCompositeOperation = 'lighter'; g.drawImage(txGlow(go ? '#2bff8a' : '#ff2a2a'), x - 24, -24, 48, 48); g.globalCompositeOperation = 'source-over'; } } }
    g.fillStyle = '#3a3f47'; g.fillRect(-o.l - 5, -10, 10, 20); g.fillRect(o.r - 5, -10, 10, 20); g.restore(); }
  if (T.over) txDrawOver(T.over);
  if (T.tunP && vis(T.tunB, cx, cy, vr)) { g.lineCap = 'butt'; g.strokeStyle = 'rgba(12,13,16,.62)'; g.lineWidth = (T.hw + T.wall) * 2 + 150; g.stroke(T.tunP);
    g.strokeStyle = 'rgba(255,210,140,.35)'; g.lineWidth = 6; g.setLineDash([12, 80]); g.stroke(T.tunP); g.setLineDash([]); g.lineCap = 'round'; }
}
function heliDraw(g, x, y, a, now, shadow, col) {
  g.save(); g.translate(x, y); g.rotate(a);
  if (shadow) { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 0, 25, 10, 0, 0, 7); g.fill(); g.fillRect(-52, -2, 34, 4); g.fillStyle = 'rgba(0,0,0,.07)'; g.beginPath(); g.arc(0, 0, 44, 0, 7); g.fill(); }
  else { g.fillStyle = '#d5d9df'; g.fillRect(-54, -2.2, 36, 4.4); g.fillStyle = '#22252b'; g.fillRect(-56, -9, 3, 18); g.fillStyle = '#f4f5f7'; g.beginPath(); g.ellipse(0, 0, 25, 10.5, 0, 0, 7); g.fill();
    g.fillStyle = col; g.fillRect(-12, -10, 9, 20); g.fillStyle = '#1c2732'; g.beginPath(); g.ellipse(13, 0, 9, 7.5, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.fill(); g.rotate(now * 31); g.fillStyle = 'rgba(28,30,34,.7)'; g.fillRect(-46, -1.7, 92, 3.4); g.fillRect(-1.7, -46, 3.4, 92); }
  g.restore();
}
function sky(T, F, g, dt, now, cx, cy, hx, hy) { // cloud shadows, a flock of birds, the TV helicopter
  const tod = F.L.tod;
  if (tod < 2 && T.clouds) { if (!CL) CL = soft('#0a0f1e', .2); for (const c of T.clouds) { const x = c.x + now * 22 % 4000, y = c.y + now * 8 % 3000; if (Math.abs(x - cx) > hx + c.r || Math.abs(y - cy) > hy + c.r) continue; g.drawImage(CL, x - c.r, y - c.r, c.r * 2, c.r * 2); } }
  if (tod < 3 && q) { let B = st.birds; if (!B || Math.hypot(B.x - cx, B.y - cy) > 2800) { const a = Math.random() * 6.283; B = st.birds = { x: cx - Math.cos(a) * 2000, y: cy - Math.sin(a) * 2000 + rand(-500, 500), a, n: 5 + Math.random() * 6 | 0 }; }
    B.x += Math.cos(B.a) * 150 * dt; B.y += Math.sin(B.a) * 150 * dt; g.lineCap = 'round'; g.lineWidth = 2.2;
    for (const [ox, oy, col] of [[36, 50, 'rgba(0,0,0,.17)'], [0, 0, F.L.bird || '#1d2127']]) { g.strokeStyle = col; g.beginPath();
      for (let k = 0; k < B.n; k++) { const row = (k + 1) >> 1, side = k & 1 ? 1 : -1, bx = B.x + ox - Math.cos(B.a) * row * 24 - Math.sin(B.a) * side * row * 15, by = B.y + oy - Math.sin(B.a) * row * 24 + Math.cos(B.a) * side * row * 15, fl = .5 + Math.sin(now * 9 + k * 1.7) * .5;
        g.moveTo(bx + Math.cos(B.a + 2 + fl) * 9, by + Math.sin(B.a + 2 + fl) * 9); g.lineTo(bx, by); g.lineTo(bx + Math.cos(B.a - 2 - fl) * 9, by + Math.sin(B.a - 2 - fl) * 9); }
      g.stroke(); } }
  if (G.mode === 'race' && G.cars.length > 1 && G.sess === 'race') { let lead = G.cars[0]; for (const c of G.cars) if (c.prog > lead.prog) lead = c;
    const H = st.heli || (st.heli = { x: lead.rx, y: lead.ry - 500, a: 0 }), tx = lead.rx + Math.cos(now * .33) * 280, ty = lead.ry + Math.sin(now * .33) * 210, k = 1 - Math.exp(-dt * 1.1), dx = (tx - H.x) * k, dy = (ty - H.y) * k;
    H.x += dx; H.y += dy; if (dx * dx + dy * dy > .01) H.a += wrapA(Math.atan2(dy, dx) - H.a) * Math.min(1, dt * 3);
    if (Math.abs(H.x - cx) < hx + 150 && Math.abs(H.y - cy) < hy + 150) { heliDraw(g, H.x + 78, H.y + 104, H.a, now, true); heliDraw(g, H.x, H.y, H.a, now, false, F.L.ac[0]); } }
}

/* =====================================================================
   LIGHT: a low-res light map multiplied over the frame, then everything that glows
   ===================================================================== */
function light(T, F, g, td, W, H, z, ox, oy, now, inV, vc) {
  const dark = td.amb; if (!dark) return; const wx = clamp((G.h - 8) / 60, 0, 1);
  if (q > 0) { const LQ = q > 1 ? 4 : 6, lw = Math.ceil(W / LQ), lh = Math.ceil(H / LQ); if (!lm || lm.width !== lw || lm.height !== lh) { lm = mk(lw, lh); lg = lm.getContext('2d'); }
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.globalAlpha = 1; lg.fillStyle = `rgb(${dark.map(v => Math.min(255, v * (1 - wx * .22) + st.flash * 150) | 0)})`; lg.fillRect(0, 0, lw, lh);
    lg.globalCompositeOperation = 'lighter'; const k = z / LQ; lg.setTransform(k, 0, 0, k, ox / LQ - cam.x * k, oy / LQ - cam.y * k);
    const P = new Path2D(); for (const c of vc) P.addPath(c.p); lg.lineCap = 'round'; lg.lineJoin = 'round'; lg.strokeStyle = `rgb(${td.band.map(v => v / 4 | 0)})`;
    for (let s = 0; s < 4; s++) { lg.lineWidth = (T.hw + T.wall) * 2 + 30 + s * 120; lg.stroke(P); } // the floodlit circuit: a soft band along the road
    lg.globalAlpha = .34; for (const l of F.lamps) if (inV(l.x, l.y, 240)) lg.drawImage(txGlow('#fff1d0'), l.x - 230, l.y - 230, 460, 460);
    lg.globalAlpha = .5; if (T.glows) for (const o of T.glows) if (inV(o.x, o.y, o.r * 2)) lg.drawImage(txGlow(o.c), o.x - o.r * 1.8, o.y - o.r * 1.8, o.r * 3.6, o.r * 3.6);
    if (st.heli && G.sess === 'race') lg.drawImage(txGlow('#ffffff'), st.heli.x - 150, st.heli.y - 130, 300, 300);
    lg.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.imageSmoothingEnabled = true; g.drawImage(lm, 0, 0, W, H);
  } else { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(${dark.map(v => Math.min(255, v + 62))})`; g.fillRect(0, 0, W, H); }
  g.setTransform(z, 0, 0, z, ox - cam.x * z, oy - cam.y * z); g.globalCompositeOperation = 'lighter';
  for (const l of F.lamps) if (inV(l.x, l.y, 40)) g.drawImage(txGlow('#fff6dc'), l.x - 26, l.y - 26, 52, 52);
  if (T.glows) { g.globalAlpha = .8; for (const o of T.glows) if (inV(o.x, o.y, o.r)) g.drawImage(txGlow(o.c), o.x - o.r, o.y - o.r, o.r * 2, o.r * 2); g.globalAlpha = 1; }
  for (const c of G.cars) { if (!inV(c.rx, c.ry, 160)) continue; const fx = Math.sin(c.rh), fy = -Math.cos(c.rh); g.drawImage(txGlow('#fff2c8'), c.rx + fx * 130 - 95, c.ry + fy * 130 - 95, 190, 190); g.drawImage(txGlow('#ff2030'), c.rx - fx * 54 - 30, c.ry - fy * 54 - 30, 60, 60); }
  if (F.L.beams && q) T.stands.slice(0, 6).forEach((s, k) => { if (!inV(s.x, s.y, 900)) return; const a = now * (.3 + k * .06) * (k & 1 ? -1 : 1) + k * 2, len = 780, wd = .085, ex = Math.cos(a) * len, ey = Math.sin(a) * len;
    const gr = g.createLinearGradient(s.x, s.y, s.x + ex, s.y + ey); gr.addColorStop(0, 'rgba(190,215,255,.28)'); gr.addColorStop(1, 'rgba(190,215,255,0)'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + Math.cos(a - wd) * len, s.y + Math.sin(a - wd) * len); g.lineTo(s.x + Math.cos(a + wd) * len, s.y + Math.sin(a + wd) * len); g.closePath(); g.fill(); });
  g.globalCompositeOperation = 'source-over';
}
/* ---------- screen space: grade, weather, drifting air, speed, celebrations ---------- */
function post(T, F, g, td, W, H, z, dt, now) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (td.mul) { g.globalCompositeOperation = 'multiply'; g.fillStyle = td.mul; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter'; const sg = g.createLinearGradient(0, 0, W * .75, H); sg.addColorStop(0, td.sun); sg.addColorStop(.75, 'rgba(255,160,70,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
  if (T.def.tint) { g.fillStyle = T.def.tint; g.fillRect(0, 0, W, H); }
  if (F.L.gr) { g.fillStyle = F.L.gr; g.fillRect(0, 0, W, H); }
  const h = G.h; if (h > 6) { g.fillStyle = `rgba(35,45,60,${Math.min(.36, (h - 5) * .011).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  if (h > 20) { const n = Math.min(q ? 230 : 110, (h - 20) * 4.6) | 0; g.lineCap = 'round'; // rain at two depths, sliding against the camera
    for (let ly = 0; ly < 2; ly++) { g.strokeStyle = ly ? 'rgba(212,230,250,.5)' : 'rgba(170,195,225,.3)'; g.lineWidth = (ly ? 1.5 : 1) * DPR; g.beginPath(); const len = (ly ? 30 : 18) * DPR, sp = ly ? 1.7 : 1.1, par = .35 * (ly + 1);
      for (let k = ly; k < n; k += 2) { const x = (((hash(k * 1.37) - now * .28 * sp - cam.x * z / W * par) % 1) + 1) % 1 * W, y = (((hash(k * 2.11 + 5) + now * sp * 1.6 - cam.y * z / H * par) % 1) + 1) % 1 * H; g.moveTo(x, y); g.lineTo(x - len * .27, y + len); }
      g.stroke(); } }
  if (h > 38 && (st.bolt -= dt) <= 0) { st.bolt = 5 + Math.random() * 9; st.flash = 1; }
  if (st.flash > .02) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(200,215,255,${(st.flash * .42).toFixed(3)})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
  st.flash *= Math.exp(-dt * 6);
  const A = F.L.air; if (A && q && h < 30) { const dust = F.L.dust; // petals, leaves, seeds or desert dust
    for (let k = 0; k < 30; k++) { const h1 = hash(k + .5), h2 = hash(k * 3.3 + 1), d = .5 + h1, x = (((h1 * 7 + now * .035 * d - cam.x * z / W * .5 * d) % 1) + 1) % 1 * W, y = (((h2 * 5 + now * .05 * d - cam.y * z / H * .5 * d) % 1) + 1) % 1 * H, s = (2.4 + h2 * 3.4) * DPR * d;
      g.fillStyle = A[k % A.length]; g.globalAlpha = dust ? .3 : .85; g.save(); g.translate(x, y); g.rotate(dust ? .5 : now * (1 + h1 * 2) + k); g.scale(dust ? 3 : 1, dust ? .3 : .5 + .4 * Math.sin(now * 3 + k)); g.beginPath(); g.arc(0, 0, s, 0, 7); g.fill(); g.restore(); }
    g.globalAlpha = 1; }
  const me = G.cars[G.follow];
  if (me && q) { const v = Math.hypot(me.vx, me.vy), s = clamp((v / VMAX - .6) / .4, 0, 1) * (me.bst ? 1.7 : 1);
    if (s > .02) { const dx = me.vx / v, dy = me.vy / v, D = Math.max(W, H); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,255,255,${(.12 * s).toFixed(3)})`; g.lineWidth = 1.4 * DPR; g.lineCap = 'round'; g.beginPath();
      for (let k = 0; k < 28; k++) { const h1 = hash(k * 1.9), h2 = hash(k * 4.3 + 2), side = h2 - .5; if (Math.abs(side) < .09) continue; const len = (40 + h1 * 130) * DPR * s, u = (h1 * 9 + now * (1.2 + h2)) % 1 - .5, px = W / 2 - dy * side * D * 1.1 - dx * u * D * 1.2, py = H / 2 + dx * side * D * 1.1 - dy * u * D * 1.2; g.moveTo(px, py); g.lineTo(px - dx * len, py - dy * len); }
      g.stroke(); g.globalCompositeOperation = 'source-over'; }
  }
  if (st.conf > 0) { st.conf -= dt; const t = 6 - st.conf, cols = ['#ff4a5a', '#ffd23a', '#4ad2ff', '#7dff8a', '#ff8ae0', '#ffffff'];
    for (let k = 0; k < 90; k++) { const h1 = hash(k * 1.7), h2 = hash(k * 2.9 + 3), y = ((h2 * 1.4 + t * (.22 + h1 * .2)) % 1.4 - .2) * H, x = h1 * W + Math.sin(t * 3 + k) * 24 * DPR; g.fillStyle = cols[k % 6]; g.save(); g.translate(x, y); g.rotate(t * (2 + h2 * 4) + k); g.fillRect(-4 * DPR, -2 * DPR, 8 * DPR, 4 * DPR); g.restore(); } }
}
function tags(g, W, H, z, ox, oy) { // name plates: mine (optional) and my friends'
  if (G.mode !== 'race') return; g.setTransform(1, 0, 0, 1, 0, 0); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(12 * DPR)}px ${FONT}`;
  for (const c of G.cars) { const mine = c.human === 'local'; if (!c.human || (mine && S.nick === false) || (G.sess === 'quali' && !mine)) continue;
    const x = ox + (c.rx - cam.x) * z, y = oy + (c.ry - cam.y) * z - (CAR_HALF * 2.7 * z + 15 * DPR); if (x < -60 || x > W + 60 || y < -30 || y > H + 30) continue;
    const w = g.measureText(c.name).width + 26 * DPR, h = 20 * DPR; g.fillStyle = 'rgba(12,14,18,.66)'; rrect(g, x - w / 2, y - h / 2, w, h, h / 2); g.fill();
    g.beginPath(); g.moveTo(x - 5 * DPR, y + h / 2 - 1); g.lineTo(x + 5 * DPR, y + h / 2 - 1); g.lineTo(x, y + h / 2 + 5 * DPR); g.closePath(); g.fill();
    g.fillStyle = TEAMS[c.team].ui; g.beginPath(); g.arc(x - w / 2 + 10 * DPR, y, 3.2 * DPR, 0, 7); g.fill();
    g.fillStyle = mine ? '#FFC400' : '#fff'; g.fillText(c.name, x + 5 * DPR, y + .5 * DPR); }
}

/* =====================================================================
   FRAME
   ===================================================================== */
function render(dt) {
  const T = G.track, g = ctx, W = cv.width, H = cv.height, z = cam.z * DPR, F = prep(T), td = TOD[F.L.tod], now = performance.now() / 1000; fN++;
  if (st.zoomT > 0 && (st.zoomT -= dt) <= 0) setRes();
  if (S.gfx === 'auto' || !S.gfx) { st.ema = lerp(st.ema, dt * 1000, .03); if (G.mode === 'race' && !st.cold && (st.settle += dt) > 4 && st.ema > 27 && q > 0) { q--; st.settle = 0; st.ema = 16; setRes(); } }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setLineDash([]);
  const sk = cam.shake, ox = W / 2 + rand(-sk, sk) * DPR, oy = H / 2 + rand(-sk, sk) * DPR;
  g.setTransform(z, 0, 0, z, ox - cam.x * z, oy - cam.y * z);
  const hx = W / 2 / z + 24, hy = H / 2 / z + 24, cx = cam.x, cy = cam.y, vr = Math.max(hx, hy), inV = (x, y, m) => Math.abs(x - cx) < hx + m && Math.abs(y - cy) < hy + m;
  world(T, cx - hx, cy - hy, cx + hx, cy + hy);
  const vc = T.chunks.filter(c => vis(c, cx, cy, vr + 300));
  g.lineCap = 'round'; g.lineJoin = 'round';
  alive(T, F, g, dt, now, inV, vc, hx, hy);
  pitLive(T, g, now, inV);
  if (S.line !== false && G.mode === 'race') guide(T, g);
  cars(T, F, g, td, now, inV, cx, cy, vr);
  parts(g, inV);
  overhead(T, F, g, td, now, inV, cx, cy, vr);
  sky(T, F, g, dt, now, cx, cy, hx, hy);
  light(T, F, g, td, W, H, z, ox, oy, now, inV, vc);
  post(T, F, g, td, W, H, z, dt, now);
  tags(g, W, H, z, ox, oy);
  const me = G.cars[G.me]; if (me && G.mode === 'race') { const e = Math.round((me.en == null ? 1 : me.en) * 50) + (me.bst ? 100 : 0) + (me.tow > 0 ? 200 : 0); if (e !== st.ers) { st.ers = e; const el = $('#ers'); if (el) { $('#ersB').style.width = (e % 100) * 2 + '%'; el.classList.toggle('on', !!me.bst); el.classList.toggle('tow', me.tow > 0); } } }
}

/* =====================================================================
   MECHANICS: the start, the battery, lift-to-brake
   ===================================================================== */
function pre(dt) {
  const me = G.cars[G.me]; if (!me || G.mode !== 'race') return; const now = performance.now(), gas = In.thr > 0;
  // the start: off the throttle until the lights go green
  if (G.phase === 'grid') { st.armed = G.sess === 'race'; st.wait = false; if (gas) st.gasAt = now; }
  else if (st.armed) { st.armed = false; st.t0 = now;
    if (gas || now - st.gasAt < 500) { me.pen = 2.6; banner('ФАЛЬСТАРТ', '#ff3b3b'); toast('Газ до зелёного — медленный старт'); } else st.wait = true; }
  else if (st.wait && gas) { st.wait = false; const rt = (now - st.t0) / 1000;
    if (rt < 3) { const top = rt < .22; if (top) me.lb = 1.8; banner((top ? 'ИДЕАЛЬНО ' : rt < .45 ? 'ОТЛИЧНО ' : 'СТАРТ ') + rt.toFixed(3), top ? '#b06cff' : rt < .45 ? '#24d07a' : '#ffffff'); } }
  // ERS: hold to deploy, it recharges under braking and off the throttle
  const key = In.boost || In.keys.ShiftLeft || In.keys.ShiftRight || In.keys.KeyE;
  me.bst = !!key && G.phase === 'race' && !me.fin && !me.pitS && !me.inPit && me.vF > 40 && (me.bst ? me.en > 0 : me.en > .04);
  // lifting off brakes for the corner ahead (touch screens have no brake pedal)
  if (S.abs !== false && !gas && !In.brk && G.phase === 'race' && me.vF > 150 && !me.inPit && !me.fin) { const T = G.track, N = T.N, B = stopDec(); let r = 0;
    for (let k = 4; k <= 150; k += 4) { const v1 = T.vt[(me.idx + k) % N] * 1.07; r = Math.max(r, me.vF / Math.sqrt(v1 * v1 + B * k * DS)); }
    if (r > .96) In.brk = clamp((r - .96) * 9, .12, 1); }
}
function onRace() {
  flush(); PS.length = 0; Object.assign(st, { armed: false, wait: false, gasAt: -1e9, fin: false, fw: 0, conf: 0, flash: 0, bolt: 6, birds: null, heli: null, settle: 0, ers: -1 });
  for (const c of G.cars) { c.en = 1; c.bst = false; c.pen = 0; c.lb = 0; }
  setRes();
  if (G.mode === 'race' && G.phase === 'grid' && G.me >= 0) setTimeout(() => G.phase === 'grid' && G.mode === 'race' && toast('Жми газ на зелёный — не раньше!'), 900);
}

/* =====================================================================
   UI: zoom, battery, settings
   ===================================================================== */
function zoomBy(d, quiet) { S.zoom = clamp((S.zoom || 1) * (d > 0 ? 1.1 : 1 / 1.1), .45, 1.6); st.zoomT = .45; saveS(); sync(); if (!quiet) toast('Масштаб ' + Math.round(S.zoom * 100) + '%'); }
function sync() {
  const on = (id, v) => { const e = $(id); if (e) e.classList.toggle('on', v); };
  on('#sNick', S.nick !== false); on('#sLine', S.line !== false); on('#sAbs', S.abs !== false);
  $$('#sZoom button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - (S.zoom || 1)) < .06)); $$('#sGfx button').forEach(b => b.classList.toggle('on', b.dataset.v === (S.gfx || 'auto')));
}
function ui() {
  $('#hud').insertAdjacentHTML('beforeend', `<div id="ers" class="glass"><b>ERS</b><u><s id="ersB"></s></u><em>${isDesk ? 'SHIFT' : '2× ГАЗ'}</em></div><div id="zoomBox" class="glass"><button data-z="1" aria-label="Ближе">+</button><button data-z="-1" aria-label="Дальше">−</button></div>`);
  $('#sClose').insertAdjacentHTML('beforebegin', `<div class="row" data-g="view"><span>Масштаб</span><div class="seg" id="sZoom"><button data-v="1.3">Близко</button><button data-v="1">Норма</button><button data-v="0.75">Дальше</button><button data-v="0.55">Обзор</button></div></div>
    <div class="row" data-g="ctrl"><span>Ник над машиной</span><button class="toggle" id="sNick"><i></i></button></div>
    <div class="row" data-g="ctrl"><span>Линия-подсказка</span><button class="toggle" id="sLine"><i></i></button></div>
    <div class="row" data-g="ctrl"><span>Автотормоз при сбросе газа</span><button class="toggle" id="sAbs"><i></i></button></div>
    <div class="row" data-g="view"><span>Графика</span><div class="seg" id="sGfx"><button data-v="auto">Авто</button><button data-v="hi">Макс</button><button data-v="lo">Лайт</button></div></div>`);
  const tog = (id, key) => { $(id).onclick = () => { S[key] = S[key] === false; saveS(); sync(); }; };
  tog('#sNick', 'nick'); tog('#sLine', 'line'); tog('#sAbs', 'abs');
  $('#sZoom').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.zoom = +b.dataset.v; st.zoomT = .05; saveS(); sync(); };
  $('#sGfx').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.gfx = b.dataset.v; q = -1; saveS(); setRes(); sync(); };
  $('#zoomBox').onclick = e => { const b = e.target.closest('button'); if (b) zoomBy(+b.dataset.z); };
  const racing = () => G.mode === 'race' && $('#sheet').classList.contains('hidden');
  addEventListener('wheel', e => { if (racing() && !e.ctrlKey && e.deltaY) zoomBy(-e.deltaY, true); }, { passive: true });
  addEventListener('keydown', e => { if (!racing()) return; if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomBy(-1); else if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomBy(1); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(flush);
  sync();
}
function resize() { lm = null; setRes(); }

return { render, effects, pre, onRace, ui, sync, resize, zoomK, puff, hit, bump, skid, flush, look: LOOK, get q() { return q; }, get res() { return RES; }, get tiles() { return tiles.size; }, get parts() { return PS.length; } };
})();
