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
const DS = 8, VMAX = 920, ACC = 736, BRAKE = 230, GRIP = 1450, KMH = 0.432, STEP = 1 / 120;
const CS = 1.85, CAR_HALF = 12 * CS, CAR_R = 10.5 * CS, WMAX = 2.0;
const GEARS = [.27, .39, .50, .60, .70, .80, .90, 1.0];

/* ---------- teams, fastest first. Solo: tiny pace ladder (±0.45%). With friends every car is identical (see carStats). ---------- */
const TEAMS = [
  { id: 'mercedes',    n: 'MERCEDES',     f: 'Mercedes-AMG Petronas F1', c1: '#C0C6CC', c2: '#111111', c3: '#00D2BE', ui: '#00D2BE', bg: '#2b2e33', num: 63, drv: 'George Russell',    code: 'RUS', ch: 'W17',      pu: 'Mercedes M17',  tit: 8,  spd: 1.0275, acc: 1.0400, grip: 1.0150, brk: 1.0100 },
  { id: 'ferrari',     n: 'FERRARI',      f: 'Scuderia Ferrari HP',      c1: '#DC0000', c2: '#FFFFFF', c3: '#FFD700', ui: '#FF2A2A', bg: '#9c000c', num: 16, drv: 'Charles Leclerc',   code: 'LEC', ch: 'SF-26',    pu: 'Ferrari 067',   tit: 16, spd: 1.0220, acc: 1.0320, grip: 1.0120, brk: 1.0080 },
  { id: 'redbull',     n: 'RED BULL',     f: 'Oracle Red Bull Racing',   c1: '#1E2B5C', c2: '#DB0A40', c3: '#FFC906', ui: '#FFC906', bg: '#16265e', num: 1,  drv: 'Max Verstappen',    code: 'VER', ch: 'RB22',     pu: 'Red Bull Ford', tit: 6,  spd: 1.0165, acc: 1.0240, grip: 1.0090, brk: 1.0060 },
  { id: 'mclaren',     n: 'MCLAREN',      f: 'McLaren Formula 1 Team',   c1: '#FF8000', c2: '#1A1B1F', c3: '#47C7FC', ui: '#FF8A1A', bg: '#d86400', num: 4,  drv: 'Lando Norris',      code: 'NOR', ch: 'MCL40',    pu: 'Mercedes M17',  tit: 10, spd: 1.0110, acc: 1.0160, grip: 1.0060, brk: 1.0040 },
  { id: 'alpine',      n: 'ALPINE',       f: 'BWT Alpine F1 Team',       c1: '#0A6BE8', c2: '#FF69B4', c3: '#FFFFFF', ui: '#FF79C0', bg: '#8a3fb0', num: 43, drv: 'Franco Colapinto',  code: 'COL', ch: 'A526',     pu: 'Mercedes M17',  tit: 2,  spd: 1.0055, acc: 1.0080, grip: 1.0030, brk: 1.0020 },
  { id: 'racingbulls', n: 'RACING BULLS', f: 'Visa Cash App Racing Bulls',c1: '#F2F2F2', c2: '#1634CC', c3: '#E4002B', ui: '#7d95ff', bg: '#2340b0', num: 6,  drv: 'Isack Hadjar',      code: 'HAD', ch: 'VCARB 03', pu: 'Red Bull Ford', tit: 0,  spd: 1.0000, acc: 1.0000, grip: 1.0000, brk: 1.0000 },
  { id: 'audi',        n: 'AUDI',         f: 'Audi F1 Team',             c1: '#BFC3C8', c2: '#101010', c3: '#FF3B1F', ui: '#FF4B2B', bg: '#6c7178', num: 27, drv: 'Nico Hülkenberg',   code: 'HUL', ch: 'R26',      pu: 'Audi AFR 26',   tit: 0,  spd: 0.9945, acc: 0.9920, grip: 0.9970, brk: 0.9980 },
  { id: 'haas',        n: 'HAAS',         f: 'MoneyGram Haas F1 Team',   c1: '#EDEDED', c2: '#1C1C1C', c3: '#E6002B', ui: '#FF3344', bg: '#a8101e', num: 31, drv: 'Esteban Ocon',      code: 'OCO', ch: 'VF-26',    pu: 'Ferrari 067',   tit: 0,  spd: 0.9890, acc: 0.9840, grip: 0.9940, brk: 0.9960 },
  { id: 'williams',    n: 'WILLIAMS',     f: 'Atlassian Williams Racing',c1: '#1F5FD6', c2: '#0B1A3A', c3: '#00A3E0', ui: '#4DA3FF', bg: '#1652c2', num: 55, drv: 'Carlos Sainz',      code: 'SAI', ch: 'FW48',     pu: 'Mercedes M17',  tit: 9,  spd: 0.9835, acc: 0.9760, grip: 0.9910, brk: 0.9940 },
  { id: 'astonmartin', n: 'ASTON MARTIN', f: 'Aston Martin Aramco F1',   c1: '#00594F', c2: '#CEDC00', c3: '#FFFFFF', ui: '#2fd3b5', bg: '#007a68', num: 14, drv: 'Fernando Alonso',   code: 'ALO', ch: 'AMR26',    pu: 'Honda RA626H',  tit: 0,  spd: 0.9780, acc: 0.9680, grip: 0.9880, brk: 0.9920 },
  { id: 'cadillac',    n: 'CADILLAC',     f: 'Cadillac Formula 1 Team',  c1: '#E9E9E9', c2: '#151515', c3: '#C9A24A', ui: '#E2C275', bg: '#2e2c28', num: 11, drv: 'Sergio Pérez',      code: 'PER', ch: 'MAC-26',   pu: 'Ferrari 067',   tit: 0,  spd: 0.9725, acc: 0.9600, grip: 0.9850, brk: 0.9900 },
];

/* ---------- tyres ----------
   pace: speed / acceleration / grip multiplier of a fresh tyre (soft 70% ≈ medium 85% ≈ hard 100%)
   w / wc: % of tread per lap in dry / overcast weather (each set gets ±20%, i.e. soft 15±3 and 18±3)
   Life to 50%: soft ≈ 3 laps, medium ≈ 4–5, hard ≈ 6–7. Wet = medium-like when the track is wet. */
const TY = [{ n: 'SOFT', l: 'S', c: '#ff3b3b', pace: 1, w: 15, wc: 18 }, { n: 'MEDIUM', l: 'M', c: '#ffd000', pace: .955, w: 10.5, wc: 12.6 }, { n: 'HARD', l: 'H', c: '#f2f2f2', pace: .925, w: 7.6, wc: 9.1 }, { n: 'WET', l: 'W', c: '#2a9dff', pace: .955, w: 10.5, wc: 10.5 }];
/* wear → multiplier on speed, acceleration and grip, relative to the tyre's own fresh pace:
   100–80% none · 80–60% −5% · 60–50% −10% · below 50% −20% (short blends so the car never jolts) */
const wearMul = w => { const st = (x, e) => clamp((e - x) / 2 + .5, 0, 1); return 1 - .05 * st(w, 80) - .05 * st(w, 60) - .10 * st(w, 50); };
const tab = (T, w) => { for (let i = 1; i < T.length; i++) if (w >= T[i][0]) return lerp(T[i][1], T[i - 1][1], (w - T[i][0]) / (T[i - 1][0] - T[i][0])); return T[T.length - 1][1]; };
const NEUTRAL = { spd: 1, acc: 1, grip: 1, brk: 1 }, PITV = 300, QK = 1.06;
const carStats = c => (G.net === 'host' || G.net === 'client') ? NEUTRAL : TEAMS[c.team];
const pitOn = () => G.opts.tyres && G.track.pit && G.sess !== 'quali' && G.sess !== 'attract';
/* the compound's behaviour at humidity h: [pace multiplier, extra grip multiplier, wear multiplier, slide 0..1] */
function tyreWx(k, h) {
  if (k === 3) { // wets: work on a wet track, cook on a drying one
    if (h > 30) return [1, 1, 1, 0];
    if (h > 20) return [.95, 1, 1.5, 0];
    return [.9, 1, 2, 0];
  }
  let p = 1, g = 1, wm = 1, sl = 0;
  if (h > 20) p = .95;                                    // 20%+ humidity: everything −5%, any tyre
  if (h > 30) { g = .9; sl = clamp((h - 30) / 25, .35, 1); } // 30%+: slicks lose grip and the car slides
  if (h > 35) wm = 2; else if (h > 20) wm = 1.5;           // wear ×1.5 from 20%, ×2 from 35%
  return [p, g, wm, sl];
}
const dryRate = (k, h) => lerp(TY[k].w, TY[k].wc, clamp((h - 5) / 10, 0, 1)); // dry → overcast
function tyreFx(c) {
  const fx = c.fx || (c.fx = { s: 1, a: 1, g: 1, f: 1, r: 0, sl: 0 }); if (!G.opts.tyres) { fx.s = fx.a = fx.g = fx.f = 1; fx.r = 0; fx.sl = 0; return fx; }
  const k = c.tyre, h = G.h, [p, g, wm, sl] = tyreWx(k, h), m = TY[k].pace * p * wearMul(c.wear);
  fx.s = fx.a = m; fx.g = m * g; fx.f = m; fx.sl = sl;
  fx.r = (k === 3 ? TY[3].w : dryRate(k, h)) * wm * (c.wv || 1);
  return fx;
}
/* ---------- strategy: lap-time cost (in laps of a perfect soft) of running compound k for n laps from a given wear ---------- */
function stintCost(k, wear, n, h, wv) {
  const [p, g, wm] = tyreWx(k, h), r = (k === 3 ? TY[3].w : dryRate(k, h)) * wm * (wv || 1); let cost = 0;
  for (let l = 0; l < n; l++) { const mid = wear - r * .5, m = TY[k].pace * p * Math.sqrt(g) * wearMul(mid); cost += 1 / Math.max(.3, m); wear = Math.max(0, wear - r); }
  return cost;
}
function pitLossLaps() { const T = G.track, P = T.pit; const s = 2.2 + (P ? P.len * DS / PITV - P.len * DS / 640 : 0) + 1.5; return s / Math.max(30, T.refLap); }
const compounds = h => h > 25 ? [3] : h > 18 ? [0, 1, 2, 3] : [0, 1, 2];
/* best plan from fresh tyres for `laps` laps with at most `stops` more stops → { cost, k, n } (n = laps of the first stint) */
const PLAN = new Map(); let planId = 0;
function bestPlan(laps, h, stops, noise) {
  const hb = Math.round(h / 3), nk = noise ? (noise.id || (noise.id = ++planId)) : 0, key = hb + '|' + nk;
  let P = PLAN.get(key);
  if (!P) { const hh = hb * 3, ks = compounds(hh), cum = {};
    for (const k of ks) { const a = [0]; let w = 100; const [p, g, wm] = tyreWx(k, hh), r = (k === 3 ? TY[3].w : dryRate(k, hh)) * wm; for (let n = 1; n <= 80; n++) { const m = TY[k].pace * p * Math.sqrt(g) * wearMul(w - r * .5); a.push(a[n - 1] + 1 / Math.max(.3, m) * (noise ? noise[k] : 1)); w = Math.max(0, w - r); } cum[k] = a; }
    P = { ks, cum, memo: new Map(), pl: pitLossLaps() }; PLAN.set(key, P); }
  const go = (L, s) => { const mk = L * 8 + s; let best = P.memo.get(mk); if (best) return best; best = { cost: 1e9, k: P.ks[0], n: L };
    for (const k of P.ks) for (let n = 1; n <= Math.min(L, 80); n++) { let c = P.cum[k][n]; if (n < L) { if (!s) continue; c += P.pl + go(L - n, s - 1).cost; } if (c < best.cost) best = { cost: c, k, n }; }
    P.memo.set(mk, best); return best; };
  return go(Math.max(1, laps), Math.max(0, stops));
}
const hEff = () => G.h + (G.wS >= 2 || G.opts.wx === 2 || G.opts.wx === 3 ? (G.h > 12 ? 14 : 0) : 0); // bots read the sky: rain coming = wet soon
const BOTNZ = Array.from({ length: 6 }, () => [rand(.985, 1.015), rand(.985, 1.015), rand(.985, 1.015), 1]);
function botTyre(lapsLeft, c) {
  if (!G.opts.tyres) return 0; const h = hEff(), nz = c && c.ai && c.ai.nz;
  const stops = Math.min(3, Math.floor(lapsLeft / 4)), plan = bestPlan(lapsLeft, h, stops, nz || BOTNZ[Math.random() * BOTNZ.length | 0]);
  return plan.k;
}
/* should this bot box this lap? compares "pit now" with "carry on at least one more lap" */
function botWantsPit(c) {
  const left = G.laps - c.lap; if (left <= 0) return false;
  const h = hEff(), nz = c.ai.nz, pl = pitLossLaps(), stops = Math.min(3, Math.floor(left / 4) + 1);
  if (!compounds(h).includes(c.tyre) && left >= 1 && (c.tyre === 3 ? h < 18 : h > 30)) return true;
  const now = pl + bestPlan(left, h, stops - 1, nz).cost;
  let stay = 1e9; for (let m = 1; m <= left; m++) { const s = stintCost(c.tyre, c.wear, m, h, c.wv) * (nz ? nz[c.tyre] : 1); const rest = m < left ? pl + bestPlan(left - m, h, stops - 1, nz).cost : 0; stay = Math.min(stay, s + rest); }
  return now + c.ai.pitBias < stay;
}
function fitTyre(c, k) { c.tyre = k; c.wear = 100; c.wv = rand(.8, 1.2); }
function weatherTick(dt) {
  const m = G.opts.wx; if (m == null || m < 0 || G.sess === 'quali') return;
  let st = m; if (m === 4) { const pick = () => { const cl = G.track.def.climate || [.5, .25, .2, .05]; let q = Math.random(); for (let k = 0; k < 4; k++) { q -= cl[k]; if (q < 0) return k; } return 0; };
    if (G.wS == null) { G.wS = pick(); G.wT = rand(25, 45); }
    G.wT -= dt; if (G.wT <= 0) { G.wT = rand(25, 50); if (Math.random() > .35) G.wS = pick(); } st = G.wS; } else G.wS = m;
  const target = [5, 15, 70, 90][st], rate = st === 3 ? 2 : st === 2 ? 1 : .6; // light rain +1%/s, storm +2%/s
  G.h = G.h < target ? Math.min(target, G.h + rate * dt) : Math.max(target, G.h - 1 * dt);
}

/* ---------- settings ---------- */
const S = Object.assign({ team: 0, diff: 1, laps: 3, lefty: false, sound: true, name: '', ctrl: 'wheel', track: 0, quali: false, bots: true, tyres: true, weather: false, wx: 4, zoom: 1, nick: true, line: true, abs: true, gfx: 'auto', tw: 1.2, mapS: 1, wheelS: 1, padS: 1, hudS: 1, spdFx: 1 },
  (() => { try { return JSON.parse(localStorage.getItem('apexgp') || '{}'); } catch (e) { return {}; } })());
const saveS = () => { try { localStorage.setItem('apexgp', JSON.stringify(S)); } catch (e) {} };

/* =====================================================================
   TRACK
   ===================================================================== */
const MONACO = {
  name: 'MONACO', sub: 'Circuit de Monaco · Monte Carlo', km: '3.34', scale: 2.2, hw: 130, wall: 14, theme: 'city',
  pts: [[0.0,1000.0],[0.0,978.2],[0.0,956.3],[0.0,934.5],[0.0,912.7],[0.0,890.8],[0.0,869.0],[0.0,847.2],[0.0,825.3],[0.0,803.5],[0.0,781.7],[0.0,759.9],[0.0,738.0],[0.0,716.2],[0.0,694.4],[0.0,672.5],[0.0,650.7],[0.0,628.9],[0.0,607.0],[0.0,585.2],[0.0,563.4],[0.0,541.5],[0.0,519.7],[0.0,497.9],[0.0,476.0],[0.0,454.2],[0.0,432.4],[-0.0,410.6],[-0.0,388.7],[-0.1,366.9],[-0.1,345.1],[-0.3,323.2],[-0.4,301.4],[-0.6,279.6],[-0.8,257.7],[-1.0,235.9],[-1.2,214.1],[-1.4,192.2],[-1.6,170.4],[-1.8,148.6],[-2.0,126.8],[-2.1,104.9],[-2.2,83.1],[-2.2,61.3],[-2.2,39.4],[-2.0,17.6],[-1.7,-4.2],[-1.2,-26.1],[-0.5,-47.9],[0.4,-69.7],[1.3,-91.5],[2.1,-113.3],[3.0,-135.1],[4.4,-156.9],[7.3,-178.5],[13.3,-199.5],[23.0,-219.1],[35.3,-237.0],[50.3,-252.9],[67.8,-266.0],[86.7,-276.8],[106.4,-286.3],[126.3,-295.2],[146.2,-304.1],[166.0,-313.3],[185.7,-322.7],[205.6,-331.8],[225.6,-340.4],[245.8,-348.7],[266.1,-356.8],[286.4,-364.8],[306.7,-372.8],[327.0,-380.8],[347.3,-389.0],[367.5,-397.2],[387.6,-405.7],[407.6,-414.4],[427.5,-423.4],[447.3,-432.7],[466.9,-442.4],[486.2,-452.5],[505.3,-463.0],[524.2,-473.9],[543.0,-485.0],[561.7,-496.4],[580.2,-507.9],[598.7,-519.6],[617.0,-531.4],[635.3,-543.3],[653.5,-555.4],[671.6,-567.6],[689.6,-579.9],[707.6,-592.3],[725.4,-604.9],[743.2,-617.5],[761.0,-630.3],[778.6,-643.2],[796.1,-656.2],[813.5,-669.4],[830.8,-682.7],[847.9,-696.3],[864.8,-710.1],[881.5,-724.1],[898.0,-738.5],[914.0,-753.3],[929.5,-768.7],[944.2,-784.8],[958.0,-801.7],[970.9,-819.3],[982.7,-837.7],[993.5,-856.7],[1002.1,-876.7],[1008.3,-897.6],[1013.0,-919.0],[1016.6,-940.5],[1019.9,-962.1],[1023.4,-983.6],[1027.9,-1005.0],[1034.2,-1025.9],[1042.9,-1045.9],[1052.8,-1065.3],[1063.4,-1084.4],[1074.8,-1103.0],[1087.3,-1120.9],[1101.0,-1137.9],[1116.1,-1153.7],[1132.6,-1167.9],[1150.6,-1180.3],[1169.7,-1190.8],[1189.6,-1199.7],[1210.1,-1207.4],[1230.9,-1213.9],[1252.1,-1219.3],[1273.5,-1223.7],[1295.0,-1227.0],[1316.8,-1229.1],[1338.6,-1230.0],[1360.4,-1229.5],[1382.1,-1227.3],[1403.6,-1223.7],[1424.9,-1218.9],[1446.0,-1213.3],[1466.8,-1206.7],[1487.4,-1199.3],[1507.6,-1191.1],[1527.4,-1182.0],[1546.8,-1171.8],[1565.0,-1159.9],[1581.6,-1145.7],[1596.3,-1129.6],[1609.3,-1112.0],[1620.9,-1093.5],[1631.7,-1074.6],[1642.4,-1055.6],[1652.0,-1036.0],[1660.0,-1015.6],[1666.6,-994.8],[1672.2,-973.7],[1677.4,-952.5],[1681.7,-931.1],[1686.9,-910.0],[1697.0,-890.7],[1711.3,-874.2],[1729.1,-861.7],[1749.3,-853.5],[1770.8,-850.3],[1792.5,-852.3],[1813.3,-859.1],[1831.7,-870.7],[1846.9,-886.3],[1858.6,-904.7],[1865.6,-925.3],[1870.9,-946.4],[1881.1,-965.7],[1893.6,-983.6],[1908.0,-1000.0],[1925.0,-1013.7],[1944.6,-1023.0],[1965.9,-1027.7],[1987.7,-1027.4],[2008.9,-1022.4],[2028.7,-1013.3],[2047.3,-1001.8],[2064.5,-988.3],[2080.3,-973.3],[2094.8,-957.0],[2107.9,-939.6],[2119.5,-921.1],[2129.2,-901.5],[2137.4,-881.3],[2144.4,-860.6],[2150.0,-839.5],[2153.6,-818.0],[2154.7,-796.2],[2152.9,-774.5],[2148.0,-753.2],[2141.1,-732.5],[2132.8,-712.3],[2123.0,-692.8],[2111.9,-674.0],[2099.6,-655.9],[2086.3,-638.7],[2071.9,-622.2],[2056.7,-606.6],[2040.8,-591.6],[2024.2,-577.4],[2007.2,-563.8],[1989.8,-550.6],[1972.1,-537.7],[1954.3,-525.2],[1936.2,-512.9],[1918.0,-500.9],[1899.6,-489.1],[1881.1,-477.5],[1862.5,-466.1],[1843.7,-455.0],[1824.9,-444.0],[1805.9,-433.3],[1786.7,-422.9],[1767.2,-413.0],[1747.5,-403.6],[1727.5,-394.8],[1707.4,-386.3],[1687.1,-378.1],[1666.8,-370.3],[1646.3,-362.6],[1625.9,-355.0],[1605.4,-347.4],[1585.0,-339.7],[1564.6,-331.8],[1544.3,-323.8],[1524.0,-315.9],[1503.6,-308.1],[1483.1,-300.4],[1462.7,-292.8],[1442.2,-285.2],[1421.8,-277.5],[1401.3,-269.9],[1380.9,-262.1],[1360.6,-254.2],[1340.4,-245.8],[1320.9,-236.1],[1301.9,-225.2],[1282.7,-214.9],[1261.9,-208.6],[1240.2,-206.9],[1218.7,-210.8],[1198.7,-219.3],[1179.6,-230.0],[1158.8,-236.4],[1137.1,-238.2],[1115.6,-235.0],[1095.2,-227.2],[1076.7,-215.6],[1057.4,-205.5],[1036.5,-199.5],[1014.8,-197.0],[993.0,-196.3],[971.1,-196.4],[949.3,-196.8],[927.5,-197.1],[905.6,-196.9],[883.9,-195.7],[862.2,-192.8],[841.1,-187.3],[820.4,-180.3],[800.3,-171.9],[781.0,-161.7],[763.1,-149.2],[747.3,-134.2],[734.2,-116.8],[724.0,-97.5],[716.7,-76.9],[711.2,-55.8],[707.1,-34.4],[704.0,-12.7],[701.9,9.0],[700.5,30.8],[699.9,52.6],[699.9,74.4],[701.4,96.2],[705.4,117.6],[711.3,138.7],[718.2,159.4],[725.4,180.0],[732.0,200.8],[737.1,222.0],[739.7,243.7],[738.9,265.5],[734.1,286.7],[726.1,307.1],[717.9,327.3],[711.1,348.0],[706.2,369.3],[702.7,390.8],[700.5,412.6],[699.2,434.3],[698.3,456.2],[697.6,478.0],[697.1,499.8],[696.7,521.6],[696.4,543.5],[696.3,565.3],[696.2,587.1],[696.2,609.0],[696.2,630.8],[696.3,652.6],[696.4,674.4],[696.6,696.3],[696.8,718.1],[697.1,739.9],[697.4,761.8],[697.7,783.6],[698.1,805.4],[698.5,827.3],[698.9,849.1],[699.4,870.9],[699.8,892.7],[700.4,914.6],[701.3,936.4],[702.4,958.2],[703.8,980.0],[705.3,1001.7],[707.0,1023.5],[708.8,1045.3],[710.6,1067.0],[712.5,1088.8],[714.4,1110.5],[716.2,1132.3],[717.9,1154.0],[719.4,1175.8],[720.6,1197.6],[721.4,1219.4],[721.7,1241.3],[721.1,1263.1],[719.4,1284.8],[715.7,1306.3],[709.3,1327.2],[700.2,1347.0],[688.8,1365.6],[676.1,1383.4],[663.9,1401.4],[655.2,1421.4],[651.4,1442.9],[652.8,1464.6],[658.6,1485.6],[667.2,1505.7],[676.7,1525.4],[685.8,1545.2],[693.6,1565.6],[698.7,1586.8],[700.2,1608.5],[700.4,1630.4],[699.9,1652.2],[698.6,1674.0],[696.3,1695.7],[692.7,1717.2],[687.3,1738.4],[679.8,1758.9],[669.3,1778.0],[655.3,1794.7],[638.3,1808.4],[619.7,1819.7],[600.0,1829.1],[579.6,1837.0],[558.8,1843.6],[537.7,1849.0],[516.3,1853.4],[494.7,1856.8],[473.0,1859.1],[451.2,1860.3],[429.4,1860.0],[407.6,1858.3],[386.0,1855.4],[364.5,1851.3],[343.3,1846.2],[322.4,1840.1],[301.7,1833.0],[281.5,1824.9],[261.6,1815.9],[242.2,1805.8],[223.2,1795.0],[204.7,1783.5],[186.7,1771.2],[169.2,1758.1],[152.3,1744.2],[136.2,1729.5],[121.0,1713.9],[106.6,1697.4],[93.3,1680.1],[81.2,1662.0],[70.2,1643.1],[60.1,1623.8],[50.9,1604.0],[42.6,1583.8],[35.1,1563.3],[28.4,1542.5],[22.5,1521.5],[17.2,1500.3],[12.6,1479.0],[8.5,1457.5],[4.9,1436.0],[1.8,1414.4],[-0.8,1392.7],[-2.9,1371.0],[-4.3,1349.2],[-5.3,1327.4],[-5.8,1305.6],[-5.9,1283.7],[-5.8,1261.9],[-5.4,1240.1],[-4.9,1218.2],[-4.3,1196.4],[-3.6,1174.6],[-2.9,1152.8],[-2.3,1131.0],[-1.6,1109.1],[-1.1,1087.3],[-0.6,1065.5],[-0.3,1043.7],[-0.1,1021.8]],
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

MONACO.id = 'monaco'; MONACO.flag = 'mc'; MONACO.climate = [.6, .25, .13, .02]; MONACO.sec = [.31, .69];
const TRK = [MONACO, ...(window.EXTRA_TRACKS || [])], TRK_C = [];
const normTw = w => clamp(+w || 1.2, .8, 1.6);
const getTrack = (i, w) => { w = normTw(w == null ? S.tw : w); const t = TRK_C[i]; return t && t.tw === w ? t : (TRK_C[i] = buildTrack(TRK[i], w)); };
function buildTrack(def, tw) {
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
  const N = X.length, hw = Math.round(def.hw * tw);
  const T = { def, N, hw, tw, wall: def.wall, city: def.theme === 'city', len: N * DS, x: Float32Array.from(X), y: Float32Array.from(Y),
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
  const wideR = (hw - def.hw) * 1.5, kEff = q => Math.abs(q) / Math.max(.45, 1 + Math.abs(q) * wideR); // a wider road lets a car open the corner up, bots included
  for (let i = 0; i < N; i++) T.vt[i] = Math.min(VMAX * 1.08, Math.sqrt(GRIP * .93 / Math.max(kEff(ks[i]) * .8, 1e-6)));
  // corners that turn more than 90°: T.vc = the most speed they take with the throttle still open
  T.vc = new Float32Array(N);
  { const inC = i => Math.abs(ks[i]) > 1 / 900; let s0 = 0; while (s0 < N && inC(s0)) s0++;
    for (let n = 0; n < N;) { const i0 = (s0 + n) % N; if (!inC(i0)) { n++; continue; } const sg = Math.sign(ks[i0]); let m = 0, turn = 0, km = 0;
      while (n + m < N && inC((s0 + n + m) % N) && Math.sign(ks[(s0 + n + m) % N]) === sg) { const q = Math.abs(ks[(s0 + n + m) % N]); turn += q * DS; km = Math.max(km, q); m++; }
      if (turn > 1.35) { const lim = Math.sqrt(GRIP * .93 / (kEff(km) * .8)) * .9; for (let e = 0; e < m; e++) T.vc[(s0 + n + e) % N] = lim; } n += m; } }
  for (let it = 0; it < 2; it++) for (let i = N - 1; i >= 0; i--) { const j = (i + 1) % N; T.vt[i] = Math.min(T.vt[i], Math.sqrt(T.vt[j] ** 2 + 2 * BRAKE * .8 * DS)); }
  { let v = 200, t = 0; for (let l = 0; l < 2; l++) { t = 0; for (let i = 0; i < N; i++) { const r = Math.max(0, v) / VMAX; v = Math.min(Math.min(T.vt[i], VMAX), Math.sqrt(v * v + 2 * ACC * Math.max(.05, 1 - r * r) * DS)); t += DS / Math.max(v, 30); } } T.refLap = t; }
  { const vh = new Float32Array(N); for (let i = 0; i < N; i++) { vh[i] = Math.min(VMAX, Math.sqrt(GRIP * 1.27 * .93 / Math.max(kEff(ks[i]) * .8, 1e-6))); if (T.vc[i] > 0) vh[i] = Math.min(vh[i], T.vc[i] * 1.16); } // the best lap a human could drive
    for (let it = 0; it < 2; it++) for (let i = N - 1; i >= 0; i--) { const j = (i + 1) % N; vh[i] = Math.min(vh[i], Math.sqrt(vh[j] ** 2 + 2 * BRAKE * DS)); }
    let v = 200, t = 0; for (let l = 0; l < 2; l++) { t = 0; for (let i = 0; i < N; i++) { const r = Math.max(0, v) / VMAX; v = Math.min(vh[i], Math.sqrt(v * v + 2 * ACC * Math.max(.05, 1 - r * r) * (r < .25 ? 1.6 : 1) * DS)); t += DS / Math.max(v, 30); } } T.humLap = t; }
  { const sq = def.sec || [1 / 3, 2 / 3]; T.sec = [Math.floor(sq[0] * N), Math.floor(sq[1] * N)]; let v = 400; const st = [0, 0, 0]; for (let i = 0; i < N; i++) { const r = Math.max(0, v) / VMAX; v = Math.min(Math.min(T.vt[i], VMAX), Math.sqrt(v * v + 2 * ACC * Math.max(.05, 1 - r * r) * DS)); st[i < T.sec[0] ? 0 : i < T.sec[1] ? 1 : 2] += DS / Math.max(v, 30); } const su = st[0] + st[1] + st[2]; T.secF = st.map(x => x / su); }
  // spatial hash
  T.cell = 256; T.grid = new Map();
  for (let i = 0; i < N; i += 2) { const key = Math.floor(X[i] / 256) + ',' + Math.floor(Y[i] / 256); (T.grid.get(key) || T.grid.set(key, []).get(key)).push(i); }
  // kerbs / gravel masks
  T.kerb = new Uint8Array(N); T.grav = new Int8Array(N); // grav: -1 left side, +1 right side
  for (let i = 0; i < N; i++) {
    if (Math.abs(ks[i]) > 1 / 1100) for (let e = -5; e <= 5; e++) T.kerb[(i + e + N) % N] = 1;
    if (def.theme !== 'city' && !def.zones && Math.abs(ks[i]) > 1 / 650) for (let e = -4; e <= 14; e++) T.grav[(i + e + N) % N] = -Math.sign(ks[i]);
  }
  buildRunoff(T);
  buildScenery(T);
  // nothing with a footprint may stand on, or hide, any part of the circuit
  const clearOf = (o, hx, hy) => { const ca = Math.cos(o.a), sa = Math.sin(o.a); for (const [u, v] of [[0, 0], [-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy], [0, -hy], [0, hy], [-hx, 0], [hx, 0]]) { const qx = o.x + u * ca - v * sa, qy = o.y + u * sa + v * ca; if (clearTrack(T, qx, qy)[0] < hw + T.wall + 14 || (T.pit && T.pit.block(qx, qy))) return false; } return true; };
  const settle = (L, hx, hy) => L.filter(o => { const [, bi] = nearTrack(T, o.x, o.y); let ux = o.x - T.x[bi], uy = o.y - T.y[bi]; const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l;
    for (let k = 0; k < 9; k++) { if (clearOf(o, hx, hy)) return true; o.x += ux * 25; o.y += uy * 25; } return false; });
  T.stands = settle(T.stands, 146, 78); if (!T.pit) T.pits = settle(T.pits, 72, 84);
  return T;
}
const ss = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
/* Pit lane: a band beside the start straight, expressed in the track's own (idx, lateral) coordinates */
function buildPit(T) {
  const N = T.N, hw = T.hw, W = T.wall, G0 = 44, slot = 13, len = 2 * G0 + 11 * slot + 16, inner = hw + W + 10, dP = inner + 75, outer = inner + 150;
  const fit = (a, sd) => { for (let r = 0; r <= len; r += 4) { const i = (a + r + N) % N;
      if (T.k[i] * sd > 0 && 1 / Math.abs(T.k[i]) < outer + 140) return false;
      for (const o of [hw + W + 60, outer, outer + 125]) { const [d, b] = nearTrack(T, T.x[i] + T.nx[i] * o * sd, T.y[i] + T.ny[i] * o * sd); let di = Math.abs(b - i); di = Math.min(di, N - di); if (di > 45 && d < hw + W + 18) return false; } }
    return true; };
  let a = -1, sd = 1;
  search: for (let s = 0; s <= 420; s += 20) for (const sg of s ? [-1, 1] : [1]) for (const side of [1, -1]) { const c = (N - (len >> 1) + sg * s + N) % N; if (fit(c, side)) { a = c; sd = side; break search; } }
  if (a < 0) return null;
  const P = { a, len, G: G0, sd, inner, dP, outer, box: [], boxP: [] };
  P.c = rel => { const e = rel < G0 ? ss(rel / G0) : rel > len - G0 ? ss((len - rel) / G0) : 1; return lerp(hw + W - 75, dP, e); };
  P.at = (rel, off) => { const i = (a + rel + N) % N; return [T.x[i] + T.nx[i] * off * sd, T.y[i] + T.ny[i] * off * sd, i]; };
  P.path = new Path2D(); P.edge = new Path2D(); P.gate = new Path2D(); P.mouth = new Path2D();
  for (const [r0, r1] of [[0, G0 + 2], [len - G0 - 2, len]]) for (let r = r0; r <= r1; r += 2) { const [x, y] = P.at(r, P.c(r)); r === r0 ? P.mouth.moveTo(x, y) : P.mouth.lineTo(x, y); }
  const wall = { p: new Path2D(), x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, n: 0 };
  for (let r = 0; r <= len; r += 2) { const c = P.c(r), [x, y] = P.at(r, c), [ox, oy] = P.at(r, c + 75);
    r ? P.path.lineTo(x, y) : P.path.moveTo(x, y); r ? wall.p.lineTo(ox, oy) : wall.p.moveTo(ox, oy); wall.n++;
    wall.x0 = Math.min(wall.x0, ox); wall.y0 = Math.min(wall.y0, oy); wall.x1 = Math.max(wall.x1, ox); wall.y1 = Math.max(wall.y1, oy); }
  P.wall = wall;
  for (const [r0, r1] of [[0, G0], [len - G0, len]]) for (let r = r0; r <= r1; r += 2) { const [x, y] = P.at(r, hw + W); r === r0 ? P.gate.moveTo(x, y) : P.gate.lineTo(x, y); }
  P.garages = [];
  for (let t = 0; t < 11; t++) { const r = G0 + 8 + slot * t, [bx, by, i] = P.at(r, dP + 28), [gx, gy] = P.at(r, outer + 48);
    P.box[t] = r; P.boxP[t] = { x: bx, y: by, h: Math.atan2(T.tx[i], -T.ty[i]), a: T.ang[i] };
    P.garages.push({ x: gx, y: gy, a: T.ang[i] + (sd < 0 ? Math.PI : 0), t }); }
  P.zone = []; for (let r = 0; r <= len; r += 7) { const [x, y] = P.at(r, dP + 60); P.zone.push([x, y]); }
  P.block = (x, y) => P.zone.some(q => (q[0] - x) ** 2 + (q[1] - y) ** 2 < 205 * 205);
  P.rel = i => (i - a + N) % N;
  return P;
}
function nearTrack(T, x, y) {
  const cx = Math.floor(x / 256), cy = Math.floor(y / 256); let best = Infinity, bi = -1;
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
    const l = T.grid.get((cx + a) + ',' + (cy + b)); if (!l) continue;
    for (const i of l) { const d = (x - T.x[i]) ** 2 + (y - T.y[i]) ** 2; if (d < best) { best = d; bi = i; } }
  }
  return [Math.sqrt(best), bi];
}
/* grass run-off: the barrier moves back wherever the circuit has room (never onto another part of the lap) */
function buildRunoff(T) {
  const N = T.N, hw = T.hw, def = T.def, RO = def.ro != null ? def.ro : (def.theme === 'city' ? 0 : 190);
  T.roP = new Float32Array(N); T.roN = new Float32Array(N); if (RO <= 0) return;
  const ks = smooth(T.k, 6, 3);
  for (const sd of [1, -1]) {
    const raw = new Float32Array(N);
    for (let i = 0; i < N; i += 2) {
      let ro = RO;
      if (Math.sign(ks[i]) === sd) ro = Math.min(ro, .7 / Math.max(1e-6, Math.abs(ks[i])) - hw - T.wall);
      for (let s = hw + 30; s <= 2 * (hw + T.wall + RO) + 60; s += 12) {
        const px = T.x[i] + T.nx[i] * s * sd, py = T.y[i] + T.ny[i] * s * sd, [d, bi] = nearTrack(T, px, py); let di = Math.abs(bi - i); di = Math.min(di, N - di);
        if (di > 25 && d < s) { ro = Math.min(ro, (s + d) / 2 - 28 - hw - T.wall); break; }
      }
      raw[i] = raw[(i + 1) % N] = Math.max(0, ro);
    }
    const mn = new Float32Array(N); for (let i = 0; i < N; i++) { let m = 1e9; for (let e = -14; e <= 14; e++) m = Math.min(m, raw[(i + e + N) % N]); mn[i] = m; }
    const sm = smooth(mn, 6, 3); for (let i = 0; i < N; i++) sm[i] = sm[i] < 16 ? 0 : sm[i];
    (sd > 0 ? T.roP : T.roN).set(sm);
  }
}
const roAt = (T, i, sd) => sd > 0 ? T.roP[i] : T.roN[i];
/* distance to the circuit measured from the barrier line, not the kerb: anything placed by this stays off the grass */
function clearTrack(T, x, y) { const r = nearTrack(T, x, y), bi = r[1]; if (bi < 0) return r; const sd = (x - T.x[bi]) * T.nx[bi] + (y - T.y[bi]) * T.ny[bi] > 0 ? 1 : -1; return [r[0] - roAt(T, bi, sd), bi]; }
function offsetRuns(T, off, mask, minClear) { // builds polylines at lateral offset (number or (i, side) => offset); mask(i) => side (+1/-1) or 0
  const runs = []; let cur = null;
  for (let i = 0; i <= T.N; i++) {
    const j = i % T.N, side = i < T.N ? mask(j) : 0;
    let ok = side !== 0;
    let px, py;
    if (ok) { const o = typeof off === 'function' ? off(j, side) : off; px = T.x[j] + T.nx[j] * o * side; py = T.y[j] + T.ny[j] * o * side; if (minClear) { const [dd, bi] = nearTrack(T, px, py); let di = Math.abs(bi - j); di = Math.min(di, T.N - di); if (dd < minClear || di > 16) ok = false; } }
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
      { const px = T.x[i] + T.nx[i] * (hw + 2) * sd, py = T.y[i] + T.ny[i] * (hw + 2) * sd, [dd, bi] = nearTrack(T, px, py); let di = Math.abs(bi - i); di = Math.min(di, N - di); if (di > 16 && dd < hw + 14) continue; } // no kerb on top of another part of the track
      const q = (k, o) => [T.x[k] + T.nx[k] * o * sd, T.y[k] + T.ny[k] * o * sd], a1 = q(i, hw - 7), a2 = q(i, hw + 12), a3 = q(j, hw + 12), a4 = q(j, hw - 7);
      K.moveTo(a1[0], a1[1]); K.lineTo(a2[0], a2[1]); K.lineTo(a3[0], a3[1]); K.lineTo(a4[0], a4[1]); K.closePath();
    }
    if (Math.abs(T.k[i]) > 1 / 520) { const sd = -Math.sign(T.k[i]);
      for (const o of [Wl + 10 + roAt(T, i, sd), Wl + 21 + roAt(T, i, sd)]) { const x = T.x[i] + T.nx[i] * (hw + o) * sd, y = T.y[i] + T.ny[i] * (hw + o) * sd; T.tyres.moveTo(x + 6, y); T.tyres.arc(x, y, 6, 0, 7); } }
  }
  T.zebra = [.1, .3, .45, .62, .9].map(f => Math.round(f * N)).filter(i => Math.abs(T.k[i]) < 1 / 1500);
  T.gravel = T.city ? [] : offsetRuns(T, hw + 70, j => T.grav[j], hw + 40);
  const PT = T.pit = buildPit(T);
  if (PT) { const arr = PT.sd > 0 ? T.roP : T.roN; for (let r = -70; r <= PT.len + 70; r++) { const i = (PT.a + r + N) % N, e = r < 0 ? -r / 70 : r > PT.len ? (r - PT.len) / 70 : 0; arr[i] *= ss(e); } }
  // no run-off under the start grid stands either: keep the start straight a street-like corridor
  T.grassC = [];
  for (const sd of [1, -1]) for (let s0 = 0; s0 < N; s0 += 48) {
    let any = false; for (let i = s0; i <= s0 + 48; i++) if (roAt(T, i % N, sd) > 0) { any = true; break; } if (!any) continue;
    const p = new Path2D(), e = new Path2D(), c = { p, e, x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    for (let i = s0; i <= s0 + 48; i++) { const j = i % N, o = hw - 4, x = T.x[j] + T.nx[j] * o * sd, y = T.y[j] + T.ny[j] * o * sd; i === s0 ? p.moveTo(x, y) : p.lineTo(x, y); }
    for (let i = s0 + 48; i >= s0; i--) { const j = i % N, o = hw + Wl + roAt(T, j, sd) + 4, x = T.x[j] + T.nx[j] * o * sd, y = T.y[j] + T.ny[j] * o * sd; p.lineTo(x, y); i === s0 + 48 ? e.moveTo(x, y) : e.lineTo(x, y);
      c.x0 = Math.min(c.x0, x); c.y0 = Math.min(c.y0, y); c.x1 = Math.max(c.x1, x); c.y1 = Math.max(c.y1, y); }
    p.closePath(); T.grassC.push(c);
  }
  const gate = (j, sd) => { if (!PT || sd !== PT.sd) return false; const r = PT.rel(j); return r <= PT.len && (r < PT.G || r > PT.len - PT.G); };
  const bOff = (j, sd) => hw + Wl + roAt(T, j, sd);
  T.barrier = [...offsetRuns(T, bOff, j => gate(j, 1) ? 0 : 1, hw + Wl - 30), ...offsetRuns(T, bOff, j => gate(j, -1) ? 0 : -1, hw + Wl - 30)];
  if (PT) T.barrier.push(PT.wall);
  T.stands = []; T.pits = PT ? PT.garages : []; const standSd = PT ? -PT.sd : -1;
  for (let i = -60; i < 140; i += 30) {
    const j = (i + N) % N, so = hw + Wl + 90 + roAt(T, j, standSd), po = hw + Wl + 60;
    T.stands.push({ x: T.x[j] + T.nx[j] * so * standSd, y: T.y[j] + T.ny[j] * so * standSd, a: T.ang[j] + (standSd > 0 ? Math.PI : 0) });
    if (!PT) T.pits.push({ x: T.x[j] + T.nx[j] * po, y: T.y[j] + T.ny[j] * po, a: T.ang[j], t: ((i + 60) / 30 | 0) % 11 });
  }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < N; i++) { x0 = Math.min(x0, T.x[i]); y0 = Math.min(y0, T.y[i]); x1 = Math.max(x1, T.x[i]); y1 = Math.max(y1, T.y[i]); }
  T.bbox = [x0, y0, x1, y1];
  const R = rng(7); T.trees = []; T.blds = []; T.yachts = []; T.palms = [];
  if (T.def.zones) { buildThemed(T); return; }
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
    if (T.pit && T.pit.block(x, y)) continue;
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
  PAT.grassN = ctx.createPattern(makePattern(512, (g, s) => {
    g.fillStyle = '#21452a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 64) { g.fillStyle = (i / 64) % 2 ? 'rgba(120,255,170,.04)' : 'rgba(0,0,0,.06)'; g.fillRect(0, i, s, 64); }
  }), 'repeat');
  PAT.asph =ctx.createPattern(makePattern(256, (g, s) => {
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
const cv = $('#c'); let ctx = cv.getContext('2d'); // `let`: the FX engine points it at a tile while baking
let DPR = 1, isDesk = matchMedia('(hover:hover) and (pointer:fine)').matches;
if (isDesk) document.body.classList.add('desktop');
const G = { mode: 'menu', net: null, track: null, cars: [], me: -1, follow: 0, laps: 3, t: 0, lt: 0, phase: 'grid', lightsOut: 5.8, paused: false,
  skids: new Float32Array(2400 * 4), skidN: 0, parts: [], order: [], resT: -1, snaps: [], bs: [0, 0, 0], sess: 'attract', opts: { tyres: false, wx: -1 }, h: 5, qb: [], qdone: false };
const cam = { x: 0, y: 0, a: 0, z: .8, shake: 0 };

function slotPos(T, slot) {
  const i = ((-(slot >> 1) * 17 - 7 - (slot & 1) * 8) % T.N + T.N) % T.N, off = ((slot & 1) ? 1 : -1) * T.hw * .45;
  return { i, x: T.x[i] + T.nx[i] * off, y: T.y[i] + T.ny[i] * off, h: Math.atan2(T.tx[i], -T.ty[i]), off };
}
function makeCar(team, slot, o) {
  const p = slotPos(G.track, slot);
  return Object.assign({ team, slot, x: p.x, y: p.y, h: p.h, vx: 0, vy: 0, vF: 0, vL: 0, steer: 0, thr: 0, brk: 0, idx: p.i, d: p.off,
    lap: 0, half: true, prog: 0, fin: false, finT: 0, best: Infinity, last: 0, lapStart: 0, human: null, name: TEAMS[team].code,
    kx: 0, ky: 0, ai: null, wallT: 0, sc: [0, 0, 0], ls: [0, 0, 0], bs: [0, 0, 0], secI: 0, sLast: 0, tyre: 0, wear: 100, pitS: 0, pitSel: null, pitT: 0, inPit: false, pitDone: false, qt: 0, qs: 0, warn: 0, skill: 1, sk: 1, react: rand(.03, .2), avoid: 0, mist: 0, stuck: 0, slide: 0, tow: 0, surf: 0, wl: null, rx: p.x, ry: p.y, rh: p.h }, o);
}
function botSkill(team) { const [lo, hi] = difficultyRange(); return G.net === 'host' ? lerp(hi, lo, Math.random()) : clamp(lerp(hi, lo, team / 10) + rand(-.002, .002), lo, hi); }
function difficultyRange() { return [[.95, 1.025], [1.0, 1.07], [1.09, 1.17]][S.diff]; }

function startRace(grid, laps, net, trk, o) {
  o = o || {}; G.sess = o.sess || (net === 'attract' ? 'attract' : 'race'); G.opts = { tyres: !!o.tyres, wx: o.wx == null ? -1 : o.wx }; G.qb = o.qb || []; G.qdone = false; G.wS = null; G.wT = 0; G.bs = [0, 0, 0];
  G.h = G.opts.wx === 1 ? 15 : 5; G.net = net; closeTyreUI();
  G.track = getTrack(trk == null ? S.track : trk, o.tw); PLAN.clear(); RP.reset();
  G.cars = grid.map((g, slot) => {
    const c = makeCar(g.team, slot, { human: g.human, name: g.name || TEAMS[g.team].code, id: slot });
    if (!g.human) c.skill = g.skill || botSkill(g.team);
    if (g.t != null) c.tyre = g.t; else if (!g.human && G.opts.tyres) c.tyre = botTyre(laps); fitTyre(c, c.tyre);
    return c;
  });
  G.me = G.cars.findIndex(c => c.human === 'local'); G.follow = Math.max(0, G.me);
  G.pRef = 0; G.paV = 1; { const bots = G.cars.filter(c => !c.human); bots.forEach(c => { c.pa = 1; c.spread = lerp(.985, 1.02, c.team / 10) + rand(-.002, .002); if (S.diff === 2 && G.sess === 'race') c.pa = clamp(G.track.refLap / (G.track.humLap * PRO_FLOOR * c.spread) / c.skill, .8, 1.1); }); if (bots.length) G.paV = bots.reduce((s, q) => s + q.pa, 0) / bots.length; }
  G.laps = laps; G.net = net; G.t = 0; G.lt = 0; G.phase = (net === 'attract' || G.sess === 'quali' || G.sess === 'practice') ? 'race' : 'grid'; G.lightsOut = 5 + rand(.4, 1.3);
  G.rated = false; G.skidN = 0; G.parts.length = 0; G.order = []; G.resT = -1; G.snaps = []; G.paused = false; G.shownLights = -1;
  G.mode = net === 'attract' ? 'attract' : 'race';
  FX.onRace();
  if (G.sess === 'race' && net !== 'client' && net !== 'attract' && Math.random() < .2) { const b = G.cars.filter(c => !c.human); if (b.length) { const j = b[Math.random() * b.length | 0]; j.fs = 1; j.react = 0; } } // now and then a bot jumps the start
  if (G.sess === 'quali') { const T = G.track, i = (T.N - 60) % T.N; for (const q of G.cars) { q.idx = i; q.x = T.x[i]; q.y = T.y[i]; q.d = 0; q.h = Math.atan2(T.tx[i], -T.ty[i]); q.vx = T.tx[i] * 380; q.vy = T.ty[i] * 380; q.vF = 380; q.tyre = 0; q.rx = q.x; q.ry = q.y; q.rh = q.h; } }
  const c = G.cars[G.follow]; cam.x = c.x; cam.y = c.y; cam.a = c.h;
  if (G.mode === 'race') {
    show(null); $('#hud').classList.remove('hidden'); $('#lights').classList.remove('hidden');
    $$('#lights i').forEach(i => i.classList.remove('on'));
    $('#hLapN').textContent = G.sess === 'quali' ? '' : G.sess === 'practice' ? '/∞' : '/' + laps; if (G.sess !== 'race') setTimeout(() => G.sess !== 'race' && banner(G.sess === 'quali' ? 'QUALIFYING' : 'PRACTICE', '#FFC400'), 200); $('#hPosN').textContent = '/' + G.cars.length;
    if (isDesk) { $('#deskHint').classList.remove('hidden'); setTimeout(() => $('#deskHint').classList.add('hidden'), 6000); }
    buildMini();
  } else $('#hud').classList.add('hidden');
}
const soloOpts = () => ({ tyres: S.tyres, wx: S.tyres && S.weather ? S.wx : -1, tw: S.tw });
function startSolo() { flowStart('solo'); }
function startPractice() { startRace([{ team: S.team, human: 'local', name: myName() }], 9999, null, S.track, { sess: 'practice', ...soloOpts() }); }
/* ---------- race weekend flow: [qualifying] -> [tyre choice] -> race ---------- */
let Flow = null;
function flowStart(kind) {
  const solo = kind === 'solo', humans = solo ? [{ team: S.team, human: 'local', name: myName() }] : Net.players.map(p => ({ team: p.team, human: p.id === Net.me ? 'local' : p.id, name: p.name }));
  const used = humans.map(h => h.team), withBots = solo || Net.o.b, bots = withBots ? TEAMS.map((_, i) => i).filter(i => !used.includes(i)).sort(() => Math.random() - .5) : [];
  const o = Net.o, opts = solo ? soloOpts() : { tyres: o.t, wx: o.t && o.w ? o.m : -1, tw: o.tw };
  clearTimeout(Flow && Flow.tm);
  Flow = { kind, humans, bots, laps: solo ? S.laps : Net.laps, trk: solo ? S.track : Net.track, opts, picks: {} };
  G.net = solo ? null : 'host';
  if (solo ? S.quali : o.q) return startQuali();
  const order = bots.map(t => ({ team: t, human: null })); humans.slice().sort(() => Math.random() - .5).forEach((h, k) => order.splice(Math.min(order.length, (solo ? 5 : 4) + k), 0, h));
  flowPick(order);
}
const netGrid = l => l.map(g => ({ team: g.team, human: g.human === 'local' ? Net.me : g.human, name: g.name, t: g.t, skill: g.skill }));
function startQuali() {
  const F = Flow, T = getTrack(F.trk, F.opts.tw); G.net = F.kind === 'solo' ? null : 'host';
  const qb = F.bots.map(t => { const st = G.net ? NEUTRAL : TEAMS[t], perf = (st.spd + st.acc + st.grip + st.brk) / 4; const sk = botSkill(t); return { team: t, name: TEAMS[t].code, skill: sk, t: T.refLap * QK / (lerp(1, sk, .8) * perf) * rand(.99, 1.015), f: T.secF.map(x => x * rand(.985, 1.015)) }; });
  F.qb = qb;
  if (G.net) bcast({ t: 'start', sess: 'quali', grid: netGrid(F.humans), laps: 1, track: F.trk, opts: F.opts });
  startRace(F.humans, 1, G.net, F.trk, { sess: 'quali', ...F.opts, qb });
}
function qEnd() {
  G.qdone = true; const F = Flow;
  const hs = G.cars.filter(c => c.human || F.humans.some(h => h.team === c.team)).map(c => ({ team: c.team, name: c.name, human: c.human, time: c.qt || 999, sec: c.qt ? c.ls : null })).sort((a, b) => a.time - b.time);
  let bs = (F.qb || []).map(b => ({ team: b.team, name: b.name, human: null, time: b.t, skill: b.skill, f: b.f })).sort((a, b) => a.time - b.time), rows;
  if (G.net && hs.length > 1 && bs.length) { // friends spread evenly through the field: winner on pole, last at the back
    const n = hs.length + bs.length, m = hs.length; rows = new Array(n); hs.forEach((h, k) => rows[Math.round(k * (n - 1) / (m - 1))] = h);
    let bi = 0; for (let p = 0; p < n; p++) if (!rows[p]) rows[p] = bs[bi++];
    let lastH = 0; for (let p = 1; p < n; p++) { if (rows[p].human) { const a = rows[lastH].time, top = rows[p].time >= 999 ? a + (p - lastH) * .35 : rows[p].time; for (let q = lastH + 1; q < p; q++) rows[q].time = lerp(a, top, (q - lastH) / (p - lastH)); lastH = p; } }
  } else rows = [...hs, ...bs].sort((a, b) => a.time - b.time);
  for (const r of rows) if (r.f) { const su = r.f[0] + r.f[1] + r.f[2]; r.sec = r.f.map(x => x / su * r.time); }
  F.rows = rows;
  const wire = rows.map(r => ({ team: r.team, name: r.name, time: +r.time.toFixed(3), sec: r.sec && r.sec.map(x => +x.toFixed(3)), human: r.human === 'local' ? Net.me : r.human }));
  if (G.net) bcast({ t: 'qres', rows: wire });
  showQuali(rows.map(r => ({ ...r, me: r.human === 'local' })), true);
  if (G.net) { clearTimeout(F.tm); F.tm = setTimeout(qGo, 20000); }
}
function showQuali(rows, canGo) {
  $('#hud').classList.add('hidden'); show('quali');
  const best = rows[0].time, bestS = [0, 1, 2].map(k => Math.min(...rows.map(r => r.sec && r.sec[k] > 0 ? r.sec[k] : 1e9)));
  const sc = (r, k) => r.sec && r.sec[k] > 0 ? `<td class="t s${r.sec[k] <= bestS[k] + 1e-6 ? ' pb' : ''}">${r.sec[k].toFixed(3)}</td>` : '<td class="t s">—</td>';
  $('#qTable').innerHTML = `<tr class="hd"><td></td><td>ПИЛОТ</td><td class="t s">S1</td><td class="t s">S2</td><td class="t s">S3</td><td class="t">КРУГ</td></tr>` + rows.map((r, k) => `<tr class="${r.me ? 'me' : ''}"><td>${k + 1}</td><td><i style="background:${TEAMS[r.team].c1}"></i>${r.human ? esc(r.name) : TEAMS[r.team].code}</td>${sc(r, 0)}${sc(r, 1)}${sc(r, 2)}<td class="t">${r.time >= 999 ? 'НЕТ' : k ? '+' + (r.time - best).toFixed(3) : fmt(r.time)}</td></tr>`).join('');
  $('#qGo').classList.toggle('hidden', !canGo); $('#qWait').classList.toggle('hidden', canGo);
}
function qGo() {
  const F = Flow; if (!F || !F.rows) return; clearTimeout(F.tm); const rows = F.rows; F.rows = null;
  flowPick(rows.map(r => ({ team: r.team, human: r.human, name: r.name, skill: r.skill })));
}
function flowPick(order) {
  const F = Flow; F.order = order;
  if (!F.opts.tyres) return flowGo();
  const go = k => { F.picks.local = k; if (!G.net) return flowGo(); if (F.order.filter(h => h.human).every(h => F.picks[h.human] != null)) flowGo(); };
  openPick(F.opts.wx >= 0, G.net ? 12 : 0, go);
  if (G.net) { bcast({ t: 'tpick', wet: F.opts.wx >= 0, secs: 12 }); clearTimeout(F.tm); F.tm = setTimeout(flowGo, 12500); }
}
function flowGo() {
  const F = Flow; if (!F || !F.order) return; clearTimeout(F.tm);
  const live = h => !h.human || h.human === 'local' || Net.players.some(p => p.id === h.human), lapsL = F.laps;
  const save = G.h, saveT = G.track, saveO = G.opts; G.h = F.opts.wx === 1 ? 15 : 5; G.track = getTrack(F.trk, F.opts.tw); G.opts = { tyres: F.opts.tyres, wx: F.opts.wx }; PLAN.clear();
  const grid = F.order.map(h => { const hu = live(h) ? h.human : null, t = hu ? (F.picks[hu] != null ? F.picks[hu] : G.h > 22 ? 3 : 1) : botTyre(lapsL); return { team: h.team, human: hu, name: h.name, t, skill: h.skill || (hu ? 0 : .95) }; });
  G.h = save; G.track = saveT; G.opts = saveO; F.order = null;
  if (G.net) bcast({ t: 'start', sess: 'race', grid: netGrid(grid), laps: F.laps, track: F.trk, opts: F.opts });
  startRace(grid, F.laps, G.net, F.trk, { sess: 'race', ...F.opts });
}
/* ---------- tyre pickers ---------- */
function tyreCards(el, wet, cb) {
  const life = ['≈3 круга', '≈4–5 кругов', '≈6–7 кругов', 'дождь: влажность 30%+'], pace = ['самые быстрые', '−4.5% темп', '−7.5% темп', 'как медиум на мокром'];
  el.innerHTML = TY.slice(0, wet ? 4 : 3).map((t, k) => `<button class="tcard" data-k="${k}"><i style="border-color:${t.c};color:${t.c}">${t.l}</i><b>${t.n}</b><span>${pace[k]}</span><span>${life[k]}</span><span>${k === 3 ? 'на сухом ×2 износ' : '−' + t.w + '% за круг'}</span></button>`).join('');
  el.onclick = e => { const b = e.target.closest('.tcard'); if (b) cb(+b.dataset.k); };
}
let pickT = 0;
function openPick(wet, secs, cb) {
  show('tyrepick'); tyreCards($('#tpCards'), wet, k => { $$('#tpCards .tcard').forEach((b, i) => b.classList.toggle('on', i === k)); S.lastTy = k; clearInterval(pickT); $('#tpTimer').textContent = secs ? 'Ждём остальных…' : ''; cb(k); });
  clearInterval(pickT); $('#tpTimer').textContent = secs ? secs + ' сек' : ''; if (secs) { let s = secs; pickT = setInterval(() => { s--; $('#tpTimer').textContent = Math.max(0, s) + ' сек'; if (s <= 0) clearInterval(pickT); }, 1000); }
}
function closeTyreUI() { clearInterval(pickT); const a = document.getElementById('pitSheet'); if (a) a.classList.add('hidden'); PitUI.open = false; }
const PitUI = { open: false };
function pitPick(k) { const me = G.cars[G.me]; if (!me) return; me.pitSel = k; if (G.net === 'client' && Net.hc) Net.hc.send({ t: 'pit', k }); $('#pitSheet').classList.add('hidden'); }
function startAttract() {
  const grid = TEAMS.map((_, i) => ({ team: i, human: null, skill: rand(.9, 1) }));
  startRace(grid, 999, 'attract', S.track);
  G.follow = G.cars.findIndex(c => c.team === S.team);
  const c = G.cars[G.follow]; cam.x = c.x; cam.y = c.y; cam.a = c.h;
  show('menu');
}

/* =====================================================================
   PHYSICS
   ===================================================================== */
function trackPos(c, forced) {
  const T = G.track, N = T.N; let best = 1e18, bi = forced != null ? forced : c.idx;
  if (forced == null) for (let k = -22; k <= 22; k++) { const i = (c.idx + k + N) % N, dx = c.x - T.x[i], dy = c.y - T.y[i], d = dx * dx + dy * dy; if (d < best) { best = d; bi = i; } }
  const prev = c.idx; c.idx = bi; c.d = (c.x - T.x[bi]) * T.nx[bi] + (c.y - T.y[bi]) * T.ny[bi];
  if (c.secI < 2 && prev < T.sec[c.secI] && bi >= T.sec[c.secI] && bi - prev < N * .5) { secMark(c); c.secI++; }
  if (bi > N * .3 && bi < N * .7) c.half = true;
  if (prev > N * .8 && bi < N * .2) { if (c.back) { c.lap++; c.half = false; c.back = false; } else if (c.half) { c.lap++; c.half = false; onLap(c); } }
  else if (prev < N * .2 && bi > N * .8) { c.lap--; c.half = true; c.back = true; }
  c.prog = c.lap * N + bi;
}
function secMark(c) { const k = c.secI, v = G.t - c.sLast; adaptSec(c, k, v); c.sc[k] = v; c.sLast = G.t; if (!c.bs[k] || v < c.bs[k]) c.bs[k] = v; if (!G.bs[k] || v < G.bs[k]) G.bs[k] = v; }
function onLap(c) {
  if (c.secI === 2) { secMark(c); c.ls = c.sc; } c.sc = [0, 0, 0]; c.secI = 0; c.sLast = G.t;
  if (G.sess === 'quali') { if (c.lap === 1) c.qs = G.t; else if (c.lap === 2 && !c.qt) { c.qt = G.t - c.qs; c.fin = true; c.finT = c.qt; if (c.human === 'local') banner(fmt(c.qt), '#FFC400'); } return; }
  if (c.lap >= 2) { c.last = G.t - c.lapStart; c.best = Math.min(c.best, c.last); c.lapStart = G.t;
    if (c.human === 'local' && c.lap <= G.laps) banner(c.last <= c.best ? 'BEST LAP' : (c.lap === G.laps ? 'FINAL LAP' : 'LAP ' + c.lap), c.last <= c.best ? '#b06cff' : '#fff'); }
  if (c.lap > G.laps && !c.fin) {
    c.fin = true; c.finT = G.t; G.order.push(c);
    if (c.human === 'local') { banner('FINISH', '#FFC400'); G.resT = 2.6; }
  }
}
function physics(c, dt) {
  const T = G.track, tm = carStats(c), tf = tyreFx(c), P = pitOn() ? T.pit : null;
  let thr = c.thr, brk = c.brk, steer = c.steer;
  if (G.phase !== 'race' || c.pitS) { c.vx = c.vy = c.vF = c.vL = 0; return; }
  const v0F = c.vF;
  // steering → yaw
  const hum = !!c.human, kSteer = steer / (55 + Math.abs(v0F) * (hum ? .135 : .18));
  const slip = Math.atan2(Math.abs(c.vL), Math.abs(v0F) + 1);
  const push = hum && thr > .2 && !c.inPit && T.vc[c.idx] > 0 ? clamp((v0F / T.vc[c.idx] - 1) / .12, 0, 1) * .3 : 0; // over 90° on the throttle the front washes out: lift to make it
  c.push = push; c.h += v0F * kSteer * Math.max(.15, 1 - slip / .7) * (1 - .75 * push) * dt;
  const fx = Math.sin(c.h), fy = -Math.cos(c.h), rx = -fy, ry = fx;
  let vF = c.vx * fx + c.vy * fy, vL = c.vx * rx + c.vy * ry;
  // surface
  const ad = Math.abs(c.d), pa = hum ? 1 : (c.pa || 1), pv = hum ? 1 : (G.paV || 1); let grip = GRIP * tm.grip * tf.g * (hum ? 1.27 : Math.max(1, c.skill * c.skill)) * pa, vmax = VMAX * tm.spd * tf.s * pv, drag = 0; // pace on straights is shared by the whole field, so the car order holds
  grip *= 1 - .6 * push; c.surf = 0;
  if (ad > T.hw + 13 && !c.inPit && !(P && P.rel(c.idx) <= P.len && c.d * P.sd > 0)) {
    const ro = c.d > 0 ? T.roP[c.idx] : T.roN[c.idx];
    if (ro > 12 && ad > T.hw + 16) { c.surf = 1; grip *= .7; vmax *= .55; drag = 140; } // grass run-off: 40–50% slower
    else if (T.city || T.def.zones) { c.surf = 3; grip *= .92; vmax *= .94; drag = 20; }
    else if (T.grav[c.idx] === Math.sign(c.d) && ad < T.hw + 130) { c.surf = 2; grip *= .42; vmax = 170; drag = 900; }
    else { c.surf = 1; grip *= .55; vmax = 330; drag = 260; }
  } else if (ad > T.hw - 6 && T.kerb[c.idx]) { c.surf = 3; grip *= .96; }
  const lvl = hum ? 1 : 1 + Math.max(0, c.skill - 1) * .7 + Math.min(0, c.skill - .95) * .5; vmax *= lvl; // difficulty also sets bot pace on the straights
  if (c.tow > 0) vmax *= 1 + .045 * c.tow;
  if (c.bst) vmax *= 1.05; // ERS deployed
  const rb = hum ? (c.rub || 0) : 0; vmax *= 1 + rb; grip *= 1 + rb * .6; // far behind: an unseen helping hand until the car ahead is back in reach
  if (c.inPit) vmax = Math.min(vmax, PITV);
  if (hum && ad > T.hw + T.wall + (c.d > 0 ? T.roP[c.idx] : T.roN[c.idx]) - 80 && !(P && P.rel(c.idx) <= P.len && c.d * P.sd > 0)) { // wall guard: gently turns the nose away before contact
    const s = Math.sign(c.d), tg = Math.atan2(T.tx[c.idx], -T.ty[c.idx]), e = wrapA(tg - c.h);
    if (Math.abs(e) < 1.1 && (c.vx * T.nx[c.idx] + c.vy * T.ny[c.idx]) * s > 0) c.h += e * 2.4 * (1 - push) * dt;
  }
  // longitudinal
  let a = 0; if (c.pen > 0) c.pen -= dt; if (c.lb > 0) c.lb -= dt; // pen: jump-start penalty, lb: perfect-launch bonus
  if (thr > 0 && vF > -5) { const r = Math.max(0, vF) / vmax; a += thr * ACC * tm.acc * lvl * tf.a * pv * Math.max(0, 1 - r * r) * (r < .25 ? 1.6 : 1) * (c.bst ? 1.3 : 1) * (c.pen > 0 ? .4 : c.lb > 0 ? 1.12 : 1) * (1 + rb * 1.6); }
  if (brk > 0) { if (vF > 8) a -= brk * BRAKE * tm.brk; else if (thr === 0) a -= brk * 260; }
  if (vF < -110) a = Math.max(a, 0);
  a -= 55 * Math.sign(vF) + drag * Math.sign(vF);
  if (T.sl) a -= T.sl[c.idx] * 900;
  if (vF > vmax) a -= (vF - vmax) * (c.inPit ? 8 : 1.6);
  if (thr === 0 && brk === 0 && Math.abs(vF) < 8) vF = 0;
  vF += a * dt;
  // lateral grip
  if (tf.sl > 0 && vF > 120) { const o = tf.sl * Math.abs(steer) * Math.min(1, vF / 520); c.h += steer * o * .35 * dt; vL -= Math.sign(steer) * o * 200 * dt; } // wet track on slicks: the rear steps out
  const corr = Math.min(Math.abs(vL), grip * dt); vL -= Math.sign(vL) * corr;
  if (Math.abs(vL) > 28) vF -= Math.sign(vF) * Math.abs(vL) * .9 * dt;
  c.vF = vF; c.vL = vL; c.vx = fx * vF + rx * vL; c.vy = fy * vF + ry * vL;
  c.x += (c.vx + c.kx) * dt; c.y += (c.vy + c.ky) * dt;
  const kd = Math.exp(-dt * 4.5); c.kx *= kd; c.ky *= kd;
  c.slide = clamp((Math.abs(vL) - 40) / 120, 0, 1) + (brk > .5 && vF > 420 && c.surf === 0 ? .4 : 0);
}
function collide() {
  if (G.sess === 'quali') return; // qualifying: everyone else is a ghost
  const cs = G.cars;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const A = cs[i], B = cs[j]; if (Math.abs(A.x - B.x) > 120 || Math.abs(A.y - B.y) > 120) continue;
    if (A.inPit || B.inPit) continue; // no jams in the pit lane
    const gi = Math.abs(A.idx - B.idx); if (Math.min(gi, G.track.N - gi) > 100) continue; // other level / other part of the lap
    const soft = G.phase === 'race' && G.t < 3.5;
    for (let p = -1; p <= 1; p += 2) for (let q = -1; q <= 1; q += 2) {
      const ax = A.x + Math.sin(A.h) * CAR_HALF * p, ay = A.y - Math.cos(A.h) * CAR_HALF * p;
      const bx = B.x + Math.sin(B.h) * CAR_HALF * q, by = B.y - Math.cos(B.h) * CAR_HALF * q;
      let dx = bx - ax, dy = by - ay; const d = Math.hypot(dx, dy);
      if (d >= CAR_R * 2 || d < 1e-3) continue;
      dx /= d; dy /= d; const ov = CAR_R * 2 - d;
      A.x -= dx * ov / 2; A.y -= dy * ov / 2; B.x += dx * ov / 2; B.y += dy * ov / 2;
      const vn = (B.vx - A.vx) * dx + (B.vy - A.vy) * dy;
      // knock: separation that grip cannot cancel, so cars spring apart instead of locking together
      const want = soft ? 45 : clamp(110 + Math.abs(vn) * .35, 110, 260), rel = (B.kx - A.kx) * dx + (B.ky - A.ky) * dy;
      if (rel < want) { const e = (want - rel) / 2; A.kx -= dx * e; A.ky -= dy * e; B.kx += dx * e; B.ky += dy * e; }
      if (vn < 0) {
        const J = -(soft ? .12 : .28) * vn; A.vx -= J * dx; A.vy -= J * dy; B.vx += J * dx; B.vy += J * dy;
        if (A.human === 'local' || B.human === 'local') cam.shake = Math.min(5, cam.shake + 1 + J * .04); FX.bump((ax + bx) / 2, (ay + by) / 2, J);
      }
    }
  }
}
function barrier(c) {
  const T = G.track, P = pitOn() ? T.pit : null, limP = T.hw + T.wall + T.roP[c.idx] - 15, limN = T.hw + T.wall + T.roN[c.idx] - 15;
  let dmax = limP, dmin = -limN; const lim = P && P.sd < 0 ? limN : limP;
  if (P) { const r = P.rel(c.idx), ds = c.d * P.sd;
    if (r > P.len) c.inPit = false;
    else if (r < P.G || r > P.len - P.G) { c.inPit = ds > T.hw + T.wall - 10; if (ds > 0) { const u = P.c(r) + 75 - 15; if (P.sd > 0) dmax = Math.max(lim, u); else dmin = -Math.max(lim, u); } }
    else if (c.inPit) { const lo = P.inner, hi = P.outer - 15; if (P.sd > 0) { dmin = lo; dmax = hi; } else { dmax = -lo; dmin = -hi; } }
  } else c.inPit = false;
  if (c.d <= dmax && c.d >= dmin) return;
  const s = c.d > dmax ? 1 : -1, nx = T.nx[c.idx] * s, ny = T.ny[c.idx] * s, ex = s > 0 ? c.d - dmax : dmin - c.d;
  c.x -= nx * ex; c.y -= ny * ex;
  const kn = c.kx * nx + c.ky * ny; if (kn > 0) { c.kx -= nx * kn; c.ky -= ny * kn; }
  const vn = c.vx * nx + c.vy * ny;
  if (vn > 0) {
    FX.hit(c, nx, ny, vn);
    const sp = Math.hypot(c.vx, c.vy), tx = T.tx[c.idx], ty = T.ty[c.idx], sg = (c.vx * tx + c.vy * ty) >= 0 ? 1 : -1;
    const keep = sp * (1 - (c.human ? Math.max((c.push || 0) * .4, Math.min(.07, vn / (sp + 1) * .16)) : Math.min(.55, vn / (sp + 1) * 1.1)));
    if (!c.human && vn > 45 && !c.inPit) { c.wallT = .55; for (let k = 0; k < 4; k++) puff(c.x + nx * 14, c.y + ny * 14, c, 0); }
    c.vx = tx * sg * keep; c.vy = ty * sg * keep; c.vL = 0;
    c.h += wrapA(Math.atan2(tx * sg, -ty * sg) - c.h) * .5;
    if (c.human === 'local') cam.shake = Math.min(6, 1 + vn * .0125);
    if (c.human && vn > 60) c.hits = (c.hits || 0) + 1;
  }
  c.d = s > 0 ? dmax : dmin;
}
/* pit stop: docking, the 4.5–5.5 s service, tyre change */
function pitTick(c, dt) {
  const T = G.track, P = pitOn() ? T.pit : null; if (!P) return;
  if (c.pitS) { const b = P.boxP[c.team], k = 1 - Math.exp(-dt * 9); c.x = lerp(c.x, b.x, k); c.y = lerp(c.y, b.y, k); c.h += wrapA(b.h - c.h) * k; c.kx = c.ky = 0;
    if (c.pitS === 2 && c.pitSel == null) c.pitSel = botTyre(Math.max(1, G.laps - c.lap), c);
    c.pitT -= dt; if (c.pitSel == null && c.pitT < -6) c.pitSel = c.tyre;
    if (c.pitSel != null && !c.pitSv) { c.pitSv = 1; c.pitD = c.pitT = Math.max(c.pitT, 2.1); } // tyres chosen: now the crew does its work
    if (c.pitSv && c.pitT <= 0) { fitTyre(c, c.pitSel); c.pitS = 0; c.pitSv = 0; c.pitSel = null; c.pitDone = true; c.warn = 0; if (c.ai) c.ai.pit = false; }
    return; }
  if (!c.inPit) { c.pitDone = false; return; }
  if (c.pitDone || c.fin) return;
  if (Math.abs(P.rel(c.idx) - P.box[c.team]) <= 3 && (c.human || (c.ai && c.ai.pit))) { c.pitS = c.human ? 1 : 2; c.pitT = c.human ? .7 : rand(1.9, 2.5); c.pitSel = null; c.vx = c.vy = c.vF = c.vL = 0; }
}
function towCalc() {
  const N = G.track.N;
  for (const c of G.cars) { if (!c.human || G.sess !== 'race' || G.phase !== 'race' || c.fin) { c.rub = 0; continue; } let ah = Infinity; for (const o of G.cars) if (o !== c && o.prog > c.prog) ah = Math.min(ah, o.prog - c.prog); c.rub = lerp(c.rub || 0, ah === Infinity ? 0 : clamp((ah * DS - 1800) / 5200, 0, 1) * .08, .06); }
  for (const c of G.cars) {
    c.tow = 0;
    if (c.vF < 300) continue;
    for (const o of G.cars) {
      if (o === c) continue; let ds = o.idx - c.idx; if (ds < -N / 2) ds += N; if (ds > N / 2) ds -= N;
      if (ds > 3 && ds < 34 && Math.abs(o.d - c.d) < 40) { c.tow = 1 - ds / 40; break; }
    }
  }
}

/* ---------- adaptive bots: the field is paced from the human's own sector times (clean and messy laps alike) ---------- */
const DIFF_K = [1.045, 1.005, .975]; // easy: bots ~4.5% slower than you · normal: a touch slower · pro: 2.5% quicker — you have to drive well
const PRO_FLOOR = 1.025; // pro bots follow you only down to this pace (× the best lap a human could drive): get close to it and you can win
const tyreM = c => G.opts.tyres ? tyreFx(c).s : 1;
function adaptSec(c, k, v) {
  if (G.sess !== 'race' && G.sess !== 'practice' || G.phase !== 'race' || !G.track || v < 1) return;
  const T = G.track, f = T.secF[k], lapEq = v / f;
  if (c.human) { if (c.rub > .012 || c.inPit || c.pitS || c.pitDone || lapEq > T.refLap * 2.2 || (G.t < 8 && k === 0)) return;
    const n = lapEq * tyreM(c); G.pRef = G.pRef ? Math.min(G.pRef * 1.06, lerp(G.pRef, n, n < G.pRef ? .55 : .3)) : n; return; }
  if ((!G.pRef && S.diff !== 2) || c.inPit || c.pitDone || c.ai && c.ai.pit || (G.pRef && lapEq > G.pRef * 1.6)) return;
  const want = Math.max(G.pRef * DIFF_K[S.diff], S.diff === 2 ? T.humLap * PRO_FLOOR : 0) * (c.spread || 1), have = lapEq * tyreM(c), r = clamp(Math.pow(have / want, .7), .955, 1.045);
  c.pa = clamp((c.pa || 1) * r, .7, 1.3);
  const bots = G.cars.filter(q => !q.human); G.paV = bots.reduce((s, q) => s + (q.pa || 1), 0) / Math.max(1, bots.length);
}
/* ---------- AI: no fixed line — every bot improvises each corner and sometimes gets it wrong ---------- */
function aiInit() {
  return { wan: 0, wanTo: rand(-.5, .5), wanT: rand(.5, 3), corner: 0, lineK: rand(.2, 1.1), pace: rand(.93, 1.02), look: rand(.85, 1.25),
    err: null, errT: 0, side: 0, nudge: 0, sm: 0, ph: rand(0, 7), f: rand(.3, .7), bias: rand(-.22, .22),
    nz: [rand(.985, 1.015), rand(.985, 1.015), rand(.985, 1.015), 1], pitBias: rand(-.03, .05), rev: 0 };
}
function aiError(c, a, onStraight) {
  const r = Math.random();
  if (onStraight) { a.err = 'drift'; a.errT = rand(.5, 1.1); a.side = Math.random() < .5 ? -1 : 1; }
  else if (r < .45) { a.err = 'late'; a.errT = rand(1.1, 2); a.over = rand(1.14, 1.34); }
  else if (r < .8) { a.err = 'wide'; a.errT = rand(.8, 1.5); a.side = -a.corner; }
  else { a.err = 'twitch'; a.errT = rand(.5, 1); }
}
function ai(c, dt) {
  const T = G.track, N = T.N, i = c.idx, v = Math.max(0, c.vF), a = c.ai || (c.ai = aiInit());
  if ((G.phase === 'race' && G.t < c.react && G.mode !== 'attract') || c.pitS) { c.thr = 0; c.brk = 0; c.steer = 0; return; }
  const P = pitOn() && !c.fin ? T.pit : null, fx = tyreFx(c), toGate = P ? (P.a - i + N) % N : 1e9;
  if (P && toGate > 200) a.chk = false;
  if (P && !a.chk && toGate < 140 && toGate > 75 && !c.inPit) { a.chk = true; if (G.laps - c.lap > 0 && G.laps < 999 && botWantsPit(c)) a.pit = true; }
  const la = Math.round((34 + v * .24 * a.look) / DS), j = (i + la) % N, kj = T.k[j], cs = Math.abs(kj) > 1 / 1500 ? Math.sign(kj) : 0;
  const errRate = clamp((1.12 - c.skill) * .45, .03, .2) * [1.15, .8, .35][S.diff];
  // a new corner = a new decision: how close to the apex, how brave on the brakes
  if (cs && cs !== a.corner) {
    const pro = S.diff === 2; a.corner = cs; a.lineK = pro ? rand(.6, 1.1) : rand(.05, 1.15); a.pace = pro ? rand(.97, 1.02) : rand(.91, 1.03); a.bias = pro ? rand(-.15, .15) : rand(-.3, .3);
    if (!a.err && G.phase === 'race' && G.t > 4 && Math.random() < errRate) aiError(c, a, false);
  } else if (!cs) { a.corner = 0; if (!a.err && G.phase === 'race' && G.t > 6 && Math.random() < dt * errRate * .08) aiError(c, a, true); }
  a.wanT -= dt; if (a.wanT <= 0) { a.wanT = rand(1, 4.5); a.wanTo = rand(-.75, .75); }
  a.wan = lerp(a.wan, a.wanTo, 1 - Math.exp(-dt * .9));
  if (a.err && (a.errT -= dt) <= 0) a.err = null;
  const lin = T.line[j] * a.lineK, room = T.hw * (1 - Math.min(.75, Math.abs(lin) / T.hw));
  let base = lin + (a.wan + a.bias) * room;
  // traffic: pick the side with room, keep off a car alongside
  let block = null, bds = 99, nudge = 0;
  for (const o of G.cars) {
    if (o === c || o.pitS || o.inPit !== c.inPit) continue; let ds = o.idx - i; if (ds < -N / 2) ds += N; if (ds > N / 2) ds -= N;
    if (ds > 0 && ds < 32 && Math.abs(o.d - c.d) < 62 && o.vF < c.vF + 25 && ds < bds) { block = o; bds = ds; }
    if (Math.abs(ds) < 10 && Math.abs(o.d - c.d) < 70) nudge += (c.d >= o.d ? 1 : -1) * 60;
  }
  let aT = nudge;
  if (block) { let sd = c.d >= block.d ? 1 : -1; if (Math.abs(block.d + sd * 95) > T.hw - 20) sd = -sd; aT = block.d + sd * 95 - base; }
  c.avoid = lerp(c.avoid, aT, 1 - Math.exp(-dt * 3));
  let off = clamp(base + c.avoid, -T.hw + 20, T.hw - 20);
  if (a.err === 'wide' || a.err === 'drift') off = a.side * (T.hw + Math.min(T.wall, 30) + .6 * (a.side > 0 ? T.roP[j] : T.roN[j]));
  if (P && a.pit) { a.err = null; const rj = P.rel(j); if (rj <= P.len && (c.inPit || rj < P.G)) off = P.sd * (rj < P.G || rj > P.len - P.G ? P.c(rj) : (Math.abs(rj - P.box[c.team]) < 22 ? P.dP + 28 : P.dP - 22)); else if (toGate < 80) off = P.sd * (T.hw - 12); }
  else if (c.inPit && P) { const rj = P.rel(j); if (rj <= P.len) off = P.sd * (rj > P.len - P.G ? P.c(rj) : P.dP - 22); }
  const tx = T.x[j] + T.nx[j] * off, ty = T.y[j] + T.ny[j] * off;
  const herr = wrapA(Math.atan2(tx - c.x, -(ty - c.y)) - c.h);
  let st = herr * (2.6 + c.skill) + Math.sin(G.t * a.f + a.ph) * .025;
  if (a.err === 'twitch') st += Math.sin(G.t * 11 + a.ph) * .75;
  a.sm = lerp(a.sm, clamp(st, -1, 1), 1 - Math.exp(-dt * 13)); c.steer = a.sm;
  const tm = carStats(c); let target = T.vt[(i + 2) % N] * c.skill * a.pace * (.5 + .5 * tm.grip) * fx.s * Math.sqrt(fx.g / Math.max(.5, fx.s)) * (c.pa || 1);
  if (P && (c.inPit || (a.pit && toGate < 70))) target = Math.min(target, PITV - 15);
  else if (P && a.pit && toGate < 160) target = Math.min(target, PITV + 40 + toGate * 1.5);
  if (a.err === 'late') target *= a.over;
  if (c.wallT > 0) { c.wallT -= dt; target = Math.min(target, v * .8); c.steer = clamp(c.steer - Math.sign(c.d) * .6, -1, 1); }
  if (Math.abs(c.d) > T.hw + 10) target *= .85;
  if (block && bds < 10 && Math.abs(c.avoid - aT) > 24) target = Math.min(target, block.vF);
  if (v < target - 6) { c.thr = 1; c.brk = 0; } else if (v > target + 12) { c.thr = 0; c.brk = clamp((v - target) / 80, .25, 1); } else { c.thr = .35; c.brk = 0; }
  // recovery
  const wrong = Math.abs(wrapA(c.h - Math.atan2(T.tx[i], -T.ty[i]))) > 1.7;
  if (G.phase === 'race' && !c.inPit && !(a.rev > 0) && (v < 25 || wrong || Math.abs(c.d) > T.hw + T.wall + Math.max(T.roP[i], T.roN[i]) + 60)) c.stuck += dt; else c.stuck = Math.max(0, c.stuck - dt);
  if (c.stuck > .9 && !a.rev && G.phase === 'race' && v < 40) a.rev = .9; // back off the wall before giving up
  if (a.rev > 0) { a.rev -= dt; c.thr = 0; c.brk = 1; const tg = Math.atan2(T.tx[i], -T.ty[i]); c.steer = clamp(-wrapA(tg - c.h) * 2 - Math.sign(c.d) * .4, -1, 1); if (a.rev <= 0) a.rev = -1.5; }
  else if (a.rev < 0) a.rev = Math.min(0, a.rev + dt);
  if (c.stuck > 2.2) { a.rev = 0;
    const k = (i + 2) % N; c.x = T.x[k]; c.y = T.y[k]; c.h = Math.atan2(T.tx[k], -T.ty[k]); c.vx = c.vy = c.vF = c.vL = 0; c.kx = c.ky = 0; c.stuck = 0; c.idx = k; a.err = null; c.inPit = false; a.pit = false;
  }
}

function simStep(dt) {
  if (G.phase === 'grid') {
    G.lt += dt;
    for (const c of G.cars) if (c.fs && G.lightsOut - G.lt < .4) { const T = G.track; c.x += T.tx[c.idx] * 60 * dt; c.y += T.ty[c.idx] * 60 * dt; } // the jump: rolling before the lights
    if (G.lt >= G.lightsOut) { G.phase = 'race'; G.t = 0; for (const c of G.cars) if (c.fs) { c.pen = 2.6; const n = TEAMS[c.team].code; toast('Фальстарт: ' + n); if (G.net === 'host') bcast({ t: 'fs', n }); } }
  } else G.t += dt;
  for (const c of G.cars) {
    const remote = c.human && c.human !== 'local' && !c.fin && c.pose;
    if (remote && !c.pitS) netFollow(c, dt);
    pitTick(c, dt);
    if (G.opts.tyres && G.sess !== 'quali' && G.phase === 'race' && c.wear > 0) c.wear = Math.max(0, c.wear - tyreFx(c).r * Math.max(0, c.vF) * dt / G.track.len * (c.surf === 1 || c.surf === 2 ? 4 : 1)); // grass and gravel chew the rubber
    if (c.human === 'local' && !c.fin) { c.thr = In.thr; c.brk = In.brk; c.steer = In.steer; }
    else if (!c.human || c.fin) ai(c, dt);
    if (!remote) physics(c, dt);
  }
  weatherTick(dt);
  collide();
  for (const c of G.cars) { const rm = c.human && c.human !== 'local' && !c.fin && c.pose && !c.pitS; trackPos(c, rm ? c.pose[6] : null); if (!rm) barrier(c); else c.inPit = !!c.pose[9]; }
  if (G.sess === 'quali' && !G.qdone && G.net !== 'client' && (G.cars.every(c => !c.human || c.qt) || G.t > 150)) qEnd();
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
    const wx = 9.55 * CS, wy = 15 * CS, w = [c.x + rx * wx - fx * wy, c.y + ry * wx - fy * wy, c.x - rx * wx - fx * wy, c.y - ry * wx - fy * wy];
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
  return FX.puff(x, y, c, kind);
  G.parts.push({ x, y, vx: c.vx * .25 + rand(-20, 20), vy: c.vy * .25 + rand(-20, 20), r: 5, l: kind ? .5 : 1.1, m: kind ? .5 : 1.1, k: kind });
}

/* =====================================================================
   RENDER
   ===================================================================== */
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * DPR; cv.height = innerHeight * DPR; FX.resize();
}
addEventListener('resize', resize);
addEventListener('resize', () => { if (!$('#menu').classList.contains('hidden')) refreshMenu(); });
function camera(dt) {
  const c = G.cars[G.follow]; if (!c) return;
  const sp = Math.hypot(c.vx, c.vy), base = Math.min(innerHeight / 560, innerWidth / 305) * (G.mode === 'attract' ? .8 : 1) * (isDesk ? 1 : .5) * FX.zoomK();
  const sfx = S.spdFx == null ? 1 : S.spdFx; cam.z = lerp(cam.z, base * (1 - (.3 - .2 * Math.min(1, sfx)) * Math.min(1, sp / VMAX)) * (c.bst ? 1 - .05 * sfx : 1), 1 - Math.exp(-dt * (c.bst ? 4 : 1.5)));
  let lx = c.vx * .3, ly = c.vy * .3; const lim = Math.min(innerWidth, innerHeight) * .36 / cam.z, l = Math.hypot(lx, ly);
  if (l > lim) { lx *= lim / l; ly *= lim / l; }
  const k = 1 - Math.exp(-dt * 5); cam.lx = lerp(cam.lx || 0, lx, k); cam.ly = lerp(cam.ly || 0, ly, k);
  cam.x = c.x + cam.lx; cam.y = c.y + cam.ly; cam.a = 0;
  if (c.surf === 1 || c.surf === 2) cam.shake = Math.max(cam.shake, sp > 40 ? 1 + sp / VMAX * 3 : 0);
  else if (c.surf === 3) cam.shake = Math.max(cam.shake, .5 + sp / VMAX * 1.2);
  if (G.mode === 'race' && sp > VMAX * .5) cam.shake = Math.max(cam.shake, (sp / VMAX - .5) * 2.4 * sfx * (c.bst ? 1.5 : 1));
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
  } else if (T.def.zones) {
    drawThemedGround(T, cx, cy, vr, vc);
  } else {
    ctx.fillStyle = PAT.grass; ctx.fillRect(cx - vr, cy - vr, vr * 2, vr * 2);
    ctx.strokeStyle = PAT.grav; ctx.lineWidth = 112;
    for (const r of T.gravel) if (vis(r, cx, cy, vr + 60)) ctx.stroke(r.p);
  }
  if (T.grassC.length) { ctx.fillStyle = T.def.night ? PAT.grassN : PAT.grass; for (const g of T.grassC) if (vis(g, cx, cy, vr + 200)) ctx.fill(g.p);
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 10; for (const g of T.grassC) if (vis(g, cx, cy, vr + 200)) ctx.stroke(g.e); }
  drawTrees(T, cx, cy, vr); if (T.palms) drawPalms(T, cx, cy, vr);
  if (T.pit) drawPitLane(T, cx, cy, vr);
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
  if (T.pit && pitOn()) drawPitMouth(T, cx, cy, vr);
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
  const ghost = c => G.sess === 'quali' && c !== G.cars[G.follow];
  const drawCar = c => { const sp = SPR[c.team]; ctx.save(); ctx.translate(c.rx, c.ry); ctx.rotate(c.rh); ctx.scale(CS, CS); ctx.drawImage(sp.car, -sp.W / 2, -sp.H / 2, sp.W, sp.H); ctx.restore(); };
  for (const c of G.cars) {
    if (Math.abs(c.rx - cx) > vr || Math.abs(c.ry - cy) > vr || ghost(c)) continue;
    const sp = SPR[c.team];
    ctx.save(); ctx.translate(c.rx + 6, c.ry + 9); ctx.rotate(c.rh); ctx.scale(CS, CS); ctx.drawImage(sp.sh, -sp.W / 2 - sp.P, -sp.H / 2 - sp.P, sp.W + sp.P * 2, sp.H + sp.P * 2); ctx.restore();
  }
  for (const c of G.cars) {
    if (Math.abs(c.rx - cx) > vr || Math.abs(c.ry - cy) > vr) continue;
    const sp = SPR[c.team];
    ctx.save(); ctx.globalAlpha = ghost(c) ? .5 : 1; ctx.translate(c.rx, c.ry); ctx.rotate(c.rh); ctx.scale(CS, CS); ctx.drawImage(sp.car, -sp.W / 2, -sp.H / 2, sp.W, sp.H); ctx.restore();
    if (c.human && c.human !== 'local' && G.mode === 'race') {
      ctx.save(); ctx.translate(c.rx, c.ry); ctx.font = '600 13px Titillium Web'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.55)'; const w = ctx.measureText(c.name).width + 12; ctx.fillRect(-w / 2, -52, w, 18);
      ctx.fillStyle = '#fff'; ctx.fillText(c.name, 0, -39); ctx.restore();
    }
  }
  if (T.bridge) drawBridge(T, cx, cy, vr, drawCar);
  for (const p of G.parts) {
    const a = p.l / p.m;
    ctx.fillStyle = p.k === 2 ? `rgba(200,170,110,${a * .45})` : p.k === 1 ? `rgba(120,115,105,${a * .4})` : `rgba(225,225,228,${a * .3})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  }
  if (T.def.zones) drawThemedTop(T, cx, cy, vr);
  if (T.tunP && vis(T.tunB, cx, cy, vr)) {
    ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(12,13,16,.62)'; ctx.lineWidth = (T.hw + T.wall) * 2 + 150; ctx.stroke(T.tunP);
    ctx.strokeStyle = 'rgba(255,210,140,.35)'; ctx.lineWidth = 6; ctx.setLineDash([12, 80]); ctx.stroke(T.tunP); ctx.setLineDash([]); ctx.lineCap = 'round';
  }
  drawWeather();
}
function drawPitLane(T, cx, cy, vr) {
  const P = T.pit, b0 = P.boxP[5]; if (Math.abs(b0.x - cx) > vr + 1500 || Math.abs(b0.y - cy) > vr + 1500) return;
  ctx.lineCap = 'butt'; ctx.strokeStyle = '#d3d2cb'; ctx.lineWidth = 158; ctx.stroke(P.path); ctx.strokeStyle = PAT.asph; ctx.lineWidth = 146; ctx.stroke(P.path);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.setLineDash([22, 18]); ctx.stroke(P.path); ctx.setLineDash([]);
  const on = pitOn(), me = G.cars[G.me], pulse = .55 + .45 * Math.sin(performance.now() / 180);
  for (let t = 0; t < 11; t++) { const q = P.boxP[t], mine = on && me && me.team === t; if (Math.abs(q.x - cx) > vr + 100 || Math.abs(q.y - cy) > vr + 100) continue;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.h); ctx.fillStyle = hexA(TEAMS[t].c1, .28); ctx.fillRect(-27, -46, 54, 92); ctx.strokeStyle = mine ? `rgba(255,214,0,${pulse})` : TEAMS[t].c1; ctx.lineWidth = mine ? 7 : 3; ctx.strokeRect(-27, -46, 54, 92);
    if (mine) { ctx.fillStyle = `rgba(255,214,0,${pulse})`; ctx.font = '900 20px Titillium Web'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BOX', 0, 0); } ctx.restore(); }
  for (const r of [10, P.len - 10]) { const [x, y, i] = P.at(r, P.c(r)); if (Math.abs(x - cx) > vr || Math.abs(y - cy) > vr) continue; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(T.tx[i], -T.ty[i])); ctx.fillStyle = on ? '#FFC400' : 'rgba(255,255,255,.35)'; ctx.font = '900 34px Titillium Web'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PIT', 0, 0); ctx.restore(); }
  if (!on) { ctx.strokeStyle = '#cdd0d4'; ctx.lineWidth = 8; ctx.stroke(P.gate); ctx.strokeStyle = '#6f757c'; ctx.lineWidth = 1.5; ctx.stroke(P.gate); }
  ctx.lineCap = 'round';
}
function drawPitMouth(T, cx, cy, vr) { // no kerb or edge line across the entry and exit, plus arrows leading in
  const P = T.pit, q = P.boxP[5]; if (Math.abs(q.x - cx) > vr + 1800 || Math.abs(q.y - cy) > vr + 1800) return;
  ctx.lineCap = 'butt'; ctx.strokeStyle = PAT.asph; ctx.lineWidth = 146; ctx.stroke(P.mouth); ctx.lineCap = 'round';
  const me = G.cars[G.me], hot = me && (me.wear <= 50 || (G.h > 30 && me.tyre !== 3)), N = T.N; ctx.fillStyle = hot ? `rgba(255,214,0,${.55 + .45 * Math.sin(performance.now() / 150)})` : 'rgba(255,214,0,.45)';
  for (let k = 8; k <= 56; k += 12) { const i = (P.a - k + N) % N, o = (T.hw - 36) * P.sd, x = T.x[i] + T.nx[i] * o, y = T.y[i] + T.ny[i] * o; if (Math.abs(x - cx) > vr || Math.abs(y - cy) > vr) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(T.ang[i] + P.sd * .4); ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, -20); ctx.lineTo(-4, 0); ctx.lineTo(-12, 20); ctx.closePath(); ctx.fill(); ctx.restore(); }
}
const Rain = { p: [] };
function drawWeather() {
  const h = G.h; if (h <= 6) return; const W = cv.width, H = cv.height; ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(35,45,60,${Math.min(.34, (h - 5) * .011)})`; ctx.fillRect(0, 0, W, H);
  if (h <= 20) return; const n = Math.min(150, (h - 20) * 3.2) | 0; if (!Rain.p.length) for (let k = 0; k < 150; k++) Rain.p.push([Math.random(), Math.random(), .6 + Math.random() * .8]);
  ctx.strokeStyle = 'rgba(200,220,245,.42)'; ctx.lineWidth = 1.4 * DPR; ctx.lineCap = 'round'; ctx.beginPath(); const t = performance.now() / 1000;
  for (let k = 0; k < n; k++) { const q = Rain.p[k], x = ((q[0] - t * .25 * q[2]) % 1 + 1) % 1 * W, y = ((q[1] + t * 1.5 * q[2]) % 1) * H; ctx.moveTo(x, y); ctx.lineTo(x - 7 * DPR, y + 26 * DPR); } ctx.stroke();
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
    ctx.scale(.74, 1); ctx.fillStyle = '#d9dce0'; ctx.fillRect(-64, -40, 136, 120);
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
  { const k = lw / 4; g.fillStyle = '#fff'; g.beginPath(); g.arc(T.x[0] * s + ox, T.y[0] * s + oy, 4 * Math.max(1, k), 0, 7); g.fill(); }
  return { s, ox, oy };
}
function miniPx() { return Math.max(220, Math.round(110 * (S.mapS || 1) * DPR)); }
function buildMini() {
  const px = miniPx(), k = px / 220, base = document.createElement('canvas'), c = $('#mini'); base.width = base.height = px; c.width = c.height = px;
  MINI = Object.assign(trackOutline(base, 14 * k, 5 * k, 'rgba(255,255,255,.85)'), { base, k });
}
function drawMini() {
  const m = MINI, c = $('#mini'), g = c.getContext('2d'); if (!m) return; const k = m.k;
  g.clearRect(0, 0, c.width, c.height); g.drawImage(m.base, 0, 0);
  for (const car of G.cars) {
    const me = car.human === 'local', r = (me ? 7 : 5) * k;
    g.fillStyle = TEAMS[car.team].c1; g.strokeStyle = me ? '#FFC400' : 'rgba(0,0,0,.6)'; g.lineWidth = (me ? 3 : 1.5) * k;
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
  Snd.update(G.phase === 'race' ? rpm : .25 + In.thr * .5, In.thr, !G.paused && !RP.on);
  // lights
  if (G.phase === 'grid') {
    const on = Math.min(5, Math.floor(G.lt)); if (on !== G.shownLights) { G.shownLights = on; $$('#lights i').forEach((e, i) => e.classList.toggle('on', i < on)); if (on > 0) Snd.beep(440); }
  } else if (G.shownLights !== 99) { G.shownLights = 99; const le = $('#lights'); // race start: the five reds turn green, then the panel leaves
    if (G.sess === 'race') { le.classList.add('go'); setTimeout(() => { if (G.shownLights === 99) le.classList.add('hidden'); le.classList.remove('go'); }, 900); } else le.classList.add('hidden');
    banner('GO!', '#24d07a'); Snd.beep(880); }
  // pit stop UI
  if (me.pitS === 1 && !PitUI.open && !me.fin) { PitUI.open = true; if (me.pitSel == null) { tyreCards($('#pitCards'), G.opts.wx >= 0, pitPick); $('#pitSheet').classList.remove('hidden'); } }
  if (!me.pitS && PitUI.open) { PitUI.open = false; $('#pitSheet').classList.add('hidden'); me.pitSel = null; }
  $('#pitTimer').classList.add('hidden'); // no service countdown any more: stop, pick tyres, go
  hudT -= dt; if (hudT > 0) return; hudT = .1;
  const ch = $('#tyreChip'), tyOn = G.opts.tyres && G.sess !== 'quali'; ch.classList.toggle('hidden', !tyOn);
  if (tyOn) { const ty = TY[me.tyre], w = Math.round(me.wear); $('#tyL').textContent = ty.l; $('#tyL').style.borderColor = $('#tyL').style.color = ty.c; $('#tyW').textContent = w + '%'; $('#tyB').style.width = w + '%'; $('#tyB').style.background = w > 60 ? '#24d07a' : w > 40 ? '#ffc400' : '#ff3b3b'; ch.classList.toggle('low', w <= 40);
    const wxOn = G.opts.wx >= 0, hv = Math.round(G.h); $('#wxT').classList.toggle('hidden', !wxOn); if (wxOn) $('#wxT').textContent = (hv > 40 ? 'ШТОРМ ' : hv > 20 ? 'ДОЖДЬ ' : hv > 10 ? 'ОБЛАЧНО ' : 'СУХО ') + hv + '%';
    if (G.sess === 'race' || G.sess === 'practice') { if (w <= 50 && me.warn < 1) { me.warn = 1; banner('ШИНЫ 50%', '#ffc400'); } else if (w <= 40 && me.warn < 2) { me.warn = 2; banner('BOX BOX', '#ff3b3b'); } } }
  { const cell = k => { const cur = me.sc[k], v = cur || me.ls[k], cl = !cur ? 'old' : cur <= G.bs[k] + 1e-4 ? 'pb' : cur <= me.bs[k] + 1e-4 ? 'pp' : 'std'; return `<span class="${v ? cl : 'old'}">S${k + 1} ${v ? v.toFixed(2) : '—'}</span>`; }; $('#hSec').innerHTML = cell(0) + cell(1) + cell(2); }
  { const P = pitOn() ? G.track.pit : null, pw = $('#pitWarn'); let on = false; if (P && !me.inPit && !me.pitS && !me.fin) { const to = (P.a - me.idx + G.track.N) % G.track.N; if (to < 400) { on = true; const hot = me.wear <= 50 || (G.h > 30 && me.tyre !== 3) || (G.h < 20 && me.tyre === 3); pw.classList.toggle('hot', hot); pw.textContent = `${hot ? 'BOX BOX · ' : ''}ПИТ-ЛЕЙН ${P.sd > 0 ? 'СПРАВА →' : '← СЛЕВА'} · ${Math.round(to * DS * .12 / 10) * 10} М`; if (hot && !me.pwB) { me.pwB = 1; Snd.beep(660); } } else me.pwB = 0; } pw.classList.toggle('hidden', !on); }
  { const nc = $('#netChip'); if (G.net === 'client' && Net.hc) { const v = Math.round(Net.rtt || 0); nc.textContent = (Net.hc.broker ? 'СЕРВЕР' : 'ПРЯМОЙ') + ' · ' + (v ? v + ' МС' : '…'); nc.style.color = v > 350 ? '#ff5a5a' : v > 180 ? '#ffc400' : '#24d07a'; nc.classList.remove('hidden'); } else if (G.net === 'host' && G.cars.some(c => c.human && c.human !== 'local')) { const m = Math.max(0, ...G.cars.filter(c => c.human && c.human !== 'local' && c.poseR).map(c => c.poseR)); nc.textContent = 'ГОСТИ · ' + (m ? m + ' МС' : '…'); nc.style.color = m > 350 ? '#ff5a5a' : m > 180 ? '#ffc400' : '#24d07a'; nc.classList.remove('hidden'); } else nc.classList.add('hidden'); }
  if (G.sess === 'quali') {
    $('#hPos').textContent = '–'; $('#hLap').textContent = 'Q'; $('#hTime').textContent = fmt(me.qt || (me.qs ? G.t - me.qs : 0)).replace('—', '0:00.000'); $('#hBest').textContent = me.qs ? 'ЗАЧЁТНЫЙ КРУГ' : 'РАЗГОН';
    const friends = G.net && G.cars.length > 1, list = [...G.cars.filter(c => c.qt).map(c => ({ code: c.human && c.human !== 'local' ? c.name.slice(0, 3).toUpperCase() : TEAMS[c.team].code, team: c.team, t: c.qt, me: c === me })), ...(friends ? [] : G.qb.filter(b => G.t > b.t + 1).map(b => ({ code: b.name, team: b.team, t: b.t })))].sort((a, b) => a.t - b.t).slice(0, 5);
    $('#tower').innerHTML = list.map((r, k) => `<div class="${r.me ? 'me' : ''}"><b>${k + 1}</b><i style="background:${TEAMS[r.team].c1}"></i><span>${r.code}</span><em>${r.t.toFixed(2)}</em></div>`).join('') || '<div><span>НЕТ ВРЕМЁН</span></div>';
    drawMini(); return;
  }
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
  show('results'); $('#hud').classList.add('hidden'); renderResults(); RP.start(); fitUI();
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
addEventListener('mousemove', e => { In.mx = e.clientX; In.mAcc = (In.mAcc || 0) + Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); if (In.mAcc > 12) { In.kbd = false; document.body.classList.remove('nocur'); } });
function pedal(el, key) {
  const on = e => { el.setPointerCapture?.(e.pointerId); In[key] = true; el.classList.add('on'); Snd.init(); };
  const off = () => { In[key] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
}
pedal($('#gas'), 'gas'); pedal($('#aL'), 'left'); pedal($('#aR'), 'right'); pedal($('#brake'), 'brake');
(() => { // boost on a phone: tap the gas twice and keep it held
  const g = $('#gas'); let last = -1e9, off = () => { In.boost = false; g.classList.remove('boost'); };
  g.addEventListener('pointerdown', () => { const n = performance.now(); if (n - last < 320) { In.boost = true; g.classList.add('boost'); } last = n; });
  g.addEventListener('pointerup', off); g.addEventListener('pointercancel', off); g.addEventListener('lostpointercapture', off);
})();
(() => { // direction wheel: the wheel points where the car should go (world = screen)
  const z = $('#wheelZone'); let id = null;
  const aim = e => { const r = z.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); if (Math.hypot(dx, dy) > 14) In.wheelA = Math.atan2(dx, -dy); };
  z.addEventListener('pointerdown', e => { z.setPointerCapture?.(e.pointerId); id = e.pointerId; In.wa = true; In.wheelA = null; aim(e); Snd.init(); });
  z.addEventListener('pointermove', e => { if (e.pointerId === id) aim(e); });
  const end = e => { if (e.pointerId === id) { id = null; In.wa = false; } };
  z.addEventListener('pointerup', end); z.addEventListener('pointercancel', end); z.addEventListener('lostpointercapture', end);
})();
/* no browser zoom: double tap, pinch, ctrl+wheel */
(() => {
  let lastT = 0; const typing = e => /INPUT|TEXTAREA/.test(e.target.tagName || '');
  document.addEventListener('touchend', e => { const n = performance.now(); if (n - lastT < 400 && !typing(e)) e.preventDefault(); lastT = n; }, { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, e => e.preventDefault(), { passive: false });
  addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
})();
const wheelEl = $('#wheel');
/* keys and on-screen arrows: the lock is limited to what the grip can take, and a released key lets the nose settle along the road */
function arrowSteer(ks, dt) {
  const me = G.mode === 'race' ? G.cars[G.me] : null, v = me ? Math.max(0, me.vF) : 0, cap = v < 150 ? .95 : clamp(1750 / v * (55 + v * .135) / v, .27, .95), rise = lerp(3.4, 2.5, clamp(v / 800, 0, 1));
  if (ks) { const t = ks * cap, up = Math.sign(In.kst) === -ks ? rise * 2.2 : rise; In.kst += clamp(t - In.kst, -up * dt, up * dt); return; }
  let want = 0;
  if (me && G.phase === 'race' && v > 120 && !me.inPit && !me.pitS) { const T = G.track, i = me.idx, e = wrapA(Math.atan2(T.tx[i], -T.ty[i]) - me.h); if (Math.abs(e) < 1) want = clamp(e * 1.6, -.22, .22) * cap; if (Math.abs(me.d) > T.hw * .82) want -= Math.sign(me.d) * .1 * cap; }
  In.kst = lerp(In.kst, want, 1 - Math.exp(-dt * 9)); if (Math.abs(In.kst) < .004) In.kst = 0;
}
function readInput(dt) {
  const K = In.keys;
  if (isDesk) {
    const ks = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
    if (ks) { In.kbd = true; In.mAcc = 0; if (G.mode === 'race') document.body.classList.add('nocur'); }
    if (In.kbd || S.ctrl === 'arrows') { arrowSteer(ks, dt); In.steer = In.kst; }
    else if (In.mx != null) { const d = (In.mx - innerWidth / 2) / (innerWidth * .2); In.steer = clamp(Math.sign(d) * Math.max(0, Math.abs(d) - .03), -1, 1); }
    wheelEl.style.transform = `rotate(${In.steer * WMAX * .8}rad)`;
  } else {
    if (S.ctrl === 'arrows') {
      const ks = (In.right ? 1 : 0) - (In.left ? 1 : 0);
      arrowSteer(ks, dt);
      In.steer = In.kst; In.wheel = 0;
    } else {
    const me = G.cars[G.me], h = me ? me.h : 0, aim = In.wa && In.wheelA != null;
    In.steer = aim ? clamp(wrapA(In.wheelA - h) * 2.8, -1, 1) : 0;
    In.wheel += wrapA((aim ? In.wheelA : h) - In.wheel) * (1 - Math.exp(-dt * 16));
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
/* Two independent signalling routes so one dead server cannot kill the lobby:
   PeerJS cloud + Nostr relays (Trystero). Whichever finds the other side first wins. */
const Net = { o: { q: false, b: true, t: true, w: false, m: 4 }, peer: null, links: [], kaT: 0, hiT: 0, lateT: 0, seen: {}, rooms: [], host: false, conns: new Map(), hc: null, players: [], me: null, code: '', laps: 3, track: 0, sendT: 0, tm: 0, fails: 0 };
const PREFIX = 'apexgp-r-';
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }] };
const RELAYS = [['vendor/trystero-nostr.mjs', 'https://esm.sh/trystero@0.26.0/nostr'], ['vendor/trystero-torrent.mjs', 'https://esm.sh/@trystero-p2p/torrent@0.26.0']];
const loadRelays = () => Net.relayMods || (Net.relayMods = RELAYS.map(([l, r]) => import(new URL(l, location.href).href).catch(() => import(r))));
/* Last-resort route with no WebRTC at all: public MQTT brokers over plain WebSocket (works where UDP/TURN are blocked) */
const BROKERS = ['wss://broker-cn.emqx.io:8084/mqtt', 'wss://broker.emqx.io:8084/mqtt', 'wss://mqtt.eclipseprojects.io/mqtt', 'wss://mqtt-dashboard.com:8884/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
const MQ_T = 'apexgp/v3/';
function mqttLink(url, topic, onMsg, onUp) {
  const enc = new TextEncoder(), dec = new TextDecoder(), vl = n => { const o = []; do { let b = n % 128; n = Math.floor(n / 128); if (n) b |= 128; o.push(b); } while (n); return o; }, str = s => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
  const L = { url, open: false, closed: false, pub(t, obj, ret) { if (!this.open) return; const tb = str(t), pl = enc.encode(JSON.stringify(obj)), head = [ret ? 49 : 48, ...vl(tb.length + pl.length), ...tb], out = new Uint8Array(head.length + pl.length); out.set(head); out.set(pl, head.length); try { w.send(out); } catch (e) {} }, close() { this.closed = true; this.open = false; clearInterval(ping); clearTimeout(rt); try { w && w.close(); } catch (e) {} } };
  let w = null, ping = 0, rt = 0, buf = new Uint8Array(0);
  const again = () => { L.open = false; clearInterval(ping); if (!L.closed) { clearTimeout(rt); rt = setTimeout(go, 3000); } };
  const packet = a => { const ty = a[0] >> 4; let i = 1, b; do { b = a[i++]; } while (b & 128);
    if (ty === 2) { if (a[i + 1]) return; const v = [0, 1, ...str(topic), 0]; w.send(new Uint8Array([130, ...vl(v.length), ...v])); }
    else if (ty === 9) { L.open = true; onUp && onUp(L); }
    else if (ty === 3) { const tl = a[i] << 8 | a[i + 1]; i += 2 + tl; try { onMsg(JSON.parse(dec.decode(a.subarray(i))), L); } catch (e) {} } };
  const go = () => { if (L.closed) return; try { w = new WebSocket(url, 'mqtt'); } catch (e) { return again(); } w.binaryType = 'arraybuffer'; buf = new Uint8Array(0);
    const guard = setTimeout(() => { if (!L.open) try { w.close(); } catch (e) {} }, 12000);
    w.onopen = () => { const p = [...str('MQTT'), 4, 2, 0, 60, ...str('apx' + Math.random().toString(36).slice(2, 12))]; w.send(new Uint8Array([16, ...vl(p.length), ...p])); clearInterval(ping); ping = setInterval(() => { try { w.send(new Uint8Array([192, 0])); } catch (e) {} }, 25000); };
    w.onmessage = e => { const n = new Uint8Array(e.data), j = new Uint8Array(buf.length + n.length); j.set(buf); j.set(n, buf.length); buf = j;
      for (;;) { if (buf.length < 2) break; let i = 1, m = 1, len = 0, b, ok = true; do { if (i >= buf.length) { ok = false; break; } b = buf[i++]; len += (b & 127) * m; m *= 128; } while (b & 128); if (!ok || buf.length < i + len) break; packet(buf.subarray(0, i + len)); buf = buf.slice(i + len); } };
    w.onclose = () => { clearTimeout(guard); again(); }; w.onerror = () => {}; };
  go(); return L;
}
function myName() { return (S.name || 'Player').slice(0, 12); }
function netClose() {
  clearTimeout(Net.tm);
  try { Net.hc && Net.hc.close(); } catch (e) {}
  for (const c of Net.conns.values()) try { c.close(); } catch (e) {}
  try { Net.peer && Net.peer.destroy(); } catch (e) {}
  if (Net.hc && Net.hc.broker) try { Net.hc.send({ t: 'bye' }); } catch (e) {}
  clearInterval(Net.kaT); clearInterval(Net.hiT); clearTimeout(Net.lateT); for (const l of Net.links) try { l.close(); } catch (e) {}
  for (const r of Net.rooms) try { r.leave(); } catch (e) {}
  Object.assign(Net, { links: [], rooms: [], peer: null, host: false, conns: new Map(), hc: null, players: [], me: null, code: '', fails: 0, joining: null, hosting: false, cOff: null, rtt: 0, run: (Net.run || 0) + 1 }); joinBusy(false); hostBusy(false);
}
function genCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.random() * a.length | 0]; return s; }
const genId = () => 'u' + Math.random().toString(36).slice(2, 10);
const MY_UID = (() => { try { let u = sessionStorage.getItem('apexgp-uid'); if (!u) sessionStorage.setItem('apexgp-uid', u = genId()); return u; } catch (e) { return genId(); } })(); // one id per tab, across reloads: joining twice is the same player, never a phantom
function joinBusy(on) { const b = $('#btnJoin'); if (!b) return; b.disabled = on; b.classList.toggle('loading', on); b.textContent = on ? 'ПОДКЛЮЧЕНИЕ' : 'ПРИСОЕДИНИТЬСЯ'; }
function hostBusy(on) { const b = $('#btnHost'); if (!b) return; b.disabled = on; b.classList.toggle('loading', on); b.textContent = on ? 'СОЗДАЁМ' : 'СОЗДАТЬ ЛОББИ'; }
function freeTeam(pref) { const used = Net.players.map(p => p.team); if (!used.includes(pref)) return pref; return TEAMS.findIndex((_, i) => !used.includes(i)); }
function netStatus(t) { const e = $('#fStatus'); if (e) e.textContent = t; }
function relayConn(action, pid, room) { return { open: true, viaRelay: true, room, send(m) { if (this.open) action.send(m, { target: pid }); }, close() { this.open = false; } }; }
function hostDrop(uid, conn) {
  if (Net.conns.get(uid) !== conn) return;
  Net.conns.delete(uid); Net.players = Net.players.filter(x => x.id !== uid);
  const car = G.cars.find(c => c.human === uid); if (car) { car.human = null; car.skill = .95; toast(car.name + ' отключился'); }
  bcastLobby();
}
function hostLobby() {
  if (Net.hosting) return; // already opening: another tap must not open another room
  netClose(); Net.o = { q: S.quali, b: S.bots, t: S.tyres, w: S.weather, m: S.wx, tw: S.tw }; const code = genCode(), me = genId(); $('#fStatus').textContent = 'Создаём лобби…'; hostBusy(true);
  Object.assign(Net, { host: true, hosting: true, code, laps: S.laps, track: S.track, me, players: [{ id: me, name: myName(), team: S.team, host: 1, rk: RT.pub, dv: RT.dev }] });
  let ready = false, fails = 0;
  const up = () => { if (ready || Net.code !== code) return; ready = true; hostBusy(false); show('lobby'); renderLobby(); $('#fStatus').textContent = ''; };
  const down = why => { if (++fails >= 3 && !ready && Net.code === code) { hostBusy(false); Net.hosting = false; $('#fStatus').textContent = 'Нет связи с серверами (' + why + '). Проверь интернет или VPN и попробуй снова.'; } };
  if (typeof Peer !== 'undefined') {
    const p = new Peer(PREFIX + code, { debug: 0, config: ICE }); Net.peer = p;
    p.on('open', up); p.on('disconnected', () => { try { p.reconnect(); } catch (e) {} });
    p.on('connection', conn => { let uid = null;
      conn.on('data', d => { if (d.t === 'hi') uid = String(d.uid); hostData(conn, uid, d); });
      const drop = () => uid && hostDrop(uid, conn); conn.on('close', drop); conn.on('error', drop); });
    p.on('error', e => { console.warn('peerjs', e.type); if (!ready) down(e.type); });
  } else down('peerjs');
  loadRelays().forEach(mod => mod.then(M => {
    if (Net.code !== code) return;
    const room = M.joinRoom({ appId: 'apexgp-v2', rtcConfig: ICE }, code); Net.rooms.push(room);
    const act = room.makeAction('m'), byPid = new Map();
    act.onMessage = (d, ctx) => { const pid = ctx && ctx.peerId || ctx; let e = byPid.get(pid);
      if (!e) { e = { conn: relayConn(act, pid, room), uid: null }; byPid.set(pid, e); }
      if (d.t === 'hi') e.uid = String(d.uid); if (e.uid) hostData(e.conn, e.uid, d); };
    room.onPeerLeave = pid => { const e = byPid.get(pid); if (e && e.uid) hostDrop(e.uid, e.conn); byPid.delete(pid); };
    up();
  }).catch(e => { console.warn('relay', e); down('relay'); }));
  const byUid = new Map();
  Net.links = BROKERS.map(url => mqttLink(url, MQ_T + code + '/h', (msg, L) => { const uid = String(msg.u), key = url + uid; let c = byUid.get(key);
      if (!c) { c = { open: true, viaRelay: true, broker: true, send(m) { L.pub(MQ_T + code + '/c/' + uid, { m }); }, close() { this.open = false; } }; byUid.set(key, c); }
      Net.seen[uid] = performance.now(); if (msg.m.t === 'bye') return hostDrop(uid, Net.conns.get(uid)); hostData(c, uid, msg.m); }, up));
  Net.kaT = setInterval(() => { const n = performance.now(); for (const [uid, c] of Net.conns) if (c.broker) { c.send({ t: 'ka' }); if (n - (Net.seen[uid] || n) > 12000) hostDrop(uid, c); } }, 3000);
}
function hostData(conn, uid, d) {
  if (d.t === 'ka') return;
  if (d.t === 'pg') { conn.send({ t: 'po', c: d.c }); return; }
  if (d.t === 'hi') {
    if (Net.players.some(p => p.id === uid)) { const old = Net.conns.get(uid); if (!old || (old !== conn && (old.open === false || (old.broker && !conn.broker)))) Net.conns.set(uid, conn); bcastLobby(); return; }
    { const nm = String(d.name || 'Player').slice(0, 12), now = performance.now(), dup = Net.players.find(p => p.name === nm && !p.host && Net.conns.get(p.id) && Net.conns.get(p.id).broker && now - (Net.seen[p.id] || 0) > 5000); if (dup) hostDrop(dup.id, Net.conns.get(dup.id)); } // a reloaded page: its silent old self leaves
    if (G.mode === 'race' && G.net === 'host') { conn.send({ t: 'busy' }); return; }
    if (Net.players.length >= 11) { conn.send({ t: 'full' }); return; }
    Net.conns.set(uid, conn);
    Net.players.push({ id: uid, name: String(d.name || 'Player').slice(0, 12), team: freeTeam(d.team | 0), rk: /^[0-9a-f]{64}$/.test(d.rk || '') ? d.rk : '', dv: d.dv === 'm' ? 'm' : 'p' });
    bcastLobby();
  } else if (d.t === 'pick') {
    const pl = Net.players.find(p => p.id === uid);
    if (pl && d.team >= 0 && d.team < 11 && !Net.players.some(p => p.team === d.team)) pl.team = d.team;
    bcastLobby();
  } else if (d.t === 'tp') {
    if (Flow && Flow.order) { Flow.picks[uid] = clamp(d.k | 0, 0, 3); if (Flow.order.filter(h => h.human).every(h => Flow.picks[h.human] != null)) flowGo(); }
  } else if (d.t === 'pit') {
    const c = G.cars.find(c => c.human === uid); if (c && c.pitS) c.pitSel = clamp(d.k | 0, 0, 3);
  } else if (d.t === 'in') {
    const c = G.cars.find(c => c.human === uid);
    if (c) { c.thr = clamp(+d.a || 0, 0, 1); c.brk = clamp(+d.b || 0, 0, 1); c.steer = clamp(+d.s || 0, -1, 1); if (Array.isArray(d.p) && d.p.length >= 10 && d.p[6] >= 0 && d.p[6] < G.track.N) { const n = performance.now(), ts = +d.ts || n; if (ts >= (c.poseTs || 0)) { if (c.pose && ts > c.poseTs + 5) c.poseW = clamp(wrapA(d.p[2] - c.pose[2]) / ((ts - c.poseTs) / 1000), -4, 4); const off = n - ts; c.poseO = c.poseO == null || off < c.poseO ? off : c.poseO + (off - c.poseO) * .02; c.poseS = ts + c.poseO; c.pose = d.p; c.poseTs = ts; c.poseR = +d.r || 0; } } }
  }
}
function bcast(m) { for (const c of Net.conns.values()) if (c.open) c.send(m); }
function bcastLobby() { bcast({ t: 'lobby', players: Net.players, laps: Net.laps, code: Net.code, track: Net.track, o: Net.o }); renderLobby(); }
function joinLobby(code) {
  code = code.toUpperCase().trim(); if (code.length !== 4) return toast('Введите код из 4 букв');
  if (Net.joining === code && !Net.hc) return; // already connecting: one more tap must not become one more player
  netClose(); const me = MY_UID, run = Net.run; Object.assign(Net, { me, code, joining: code }); joinBusy(true); netStatus('Подключаемся…');
  const hi = { t: 'hi', uid: me, name: myName(), team: S.team, rk: RT.pub, dv: RT.dev }, live = () => Net.run === run;
  const shutRest = conn => { if (conn.viaRelay) { try { Net.peer && Net.peer.destroy(); } catch (e) {} Net.peer = null; }
    for (const r of Net.rooms) if (r !== conn.room) try { r.leave(); } catch (e) {} Net.rooms = conn.room ? [conn.room] : [];
    clearInterval(Net.hiT); for (const l of Net.links) if (l !== conn.link) l.close(); Net.links = conn.link ? [conn.link] : []; };
  const win = (conn, d) => { // first route that hears the host becomes the link; a direct channel found later replaces a broker
    if (Net.hc && Net.hc.broker && !conn.broker) { Net.hc = conn; clearInterval(Net.kaT); Net.rtt = 0; shutRest(conn); toast('Прямой канал: пинг ниже'); }
    if (!Net.hc) { Net.hc = conn; clearTimeout(Net.tm); netStatus(''); joinBusy(false);
      if (!conn.broker) shutRest(conn);
      else { clearInterval(Net.hiT); for (const l of Net.links) if (l !== conn.link) l.close(); Net.links = [conn.link]; Net.hostSeen = performance.now(); Net.kaT = setInterval(() => { if (!Net.hc || !Net.hc.broker) return; conn.send({ t: 'ka' }); if (performance.now() - Net.hostSeen > 60000) { toast('Хост отключился'); netClose(); startAttract(); show('friends'); } }, 3000); } }
    if (conn.broker) Net.hostSeen = performance.now();
    if (Net.hc === conn) clientData(d);
  };
  if (typeof Peer !== 'undefined') {
    const p = new Peer({ debug: 0, config: ICE }); Net.peer = p;
    const dial = () => { if (!live() || (Net.hc && !Net.hc.broker)) return; const conn = p.connect(PREFIX + code, { serialization: 'json' });
      conn.on('open', () => conn.send(hi)); conn.on('data', d => win(conn, d));
      conn.on('close', () => { if (Net.hc === conn) { toast('Хост отключился'); netClose(); startAttract(); } }); };
    p.on('open', dial); p.on('error', e => { console.warn('peerjs', e.type); if (e.type === 'peer-unavailable') setTimeout(dial, 3000); });
  }
  loadRelays().forEach(mod => mod.then(M => {
    if (!live() || (Net.hc && !Net.hc.broker)) return;
    const room = M.joinRoom({ appId: 'apexgp-v2', rtcConfig: ICE }, code); Net.rooms.push(room);
    const act = room.makeAction('m'); let conn = null, hostPid = null;
    room.onPeerJoin = pid => act.send(hi, { target: pid });
    act.onMessage = (d, ctx) => { const pid = ctx && ctx.peerId || ctx; if (d.t === 'hi') return; if (!conn) { conn = relayConn(act, pid, room); hostPid = pid; } win(conn, d); };
    room.onPeerLeave = pid => { if (conn && Net.hc === conn && hostPid === pid) { toast('Хост отключился'); netClose(); startAttract(); } };
  }).catch(e => console.warn('relay', e)));
  // every route starts at once: the brokers answer in a second or two, a direct channel upgrades the link if it ever comes up
  const seen = {};
  Net.links = BROKERS.map(url => { let conn = null; return mqttLink(url, MQ_T + code + '/c/' + me, (msg, L) => { if (!live()) return; if (!conn) conn = { open: true, viaRelay: true, broker: true, link: L, send(m) { L.pub(MQ_T + code + '/h', { u: me, m }); }, close() { this.open = false; } }; win(conn, msg.m); }, L => { seen[url] = 1; L.pub(MQ_T + code + '/h', { u: me, m: hi }); if (!Net.hc) netStatus('Сервер найден, ждём ответа хоста…'); }); });
  Net.hiT = setInterval(() => { if (Net.hc) return clearInterval(Net.hiT); for (const l of Net.links) l.pub(MQ_T + code + '/h', { u: me, m: hi }); }, 800);
  Net.tm = setTimeout(() => { if (!live() || Net.hc) return; Net.joining = null; joinBusy(false); netStatus(Object.keys(seen).length ? 'Хост не отвечает. Проверь код и что вкладка хоста открыта на экране.' : 'Нет связи ни с одним сервером. Похоже, сеть всё блокирует: попробуй другую сеть или Wi-Fi.'); }, 15000);
}
function clientData(d) {
  if (d.t === 'ka') return;
  if (d.t === 'lobby') { Net.players = d.players; Net.laps = d.laps; Net.code = d.code; Net.track = d.track | 0; if (d.o) Net.o = d.o; if (G.mode !== 'race' && $('#garage').classList.contains('hidden')) show('lobby'); renderLobby(); }
  else if (d.t === 'busy') { toast('Гонка уже идёт — подождите'); }
  else if (d.t === 'full') { toast('Лобби заполнено'); netClose(); }
  else if (d.t === 'start') { startRace(d.grid.map(g => ({ ...g, human: g.human === Net.me ? 'local' : g.human })), d.laps, 'client', d.track | 0, { sess: d.sess, ...d.opts }); }
  else if (d.t === 'qres') { showQuali(d.rows.map(r => ({ ...r, me: r.human === Net.me })), false); }
  else if (d.t === 'tpick') { openPick(d.wet, d.secs, k => Net.hc && Net.hc.send({ t: 'tp', k })); }
  else if (d.t === 's') pushSnap({ ...d });
  else if (d.t === 'f') { const l = G.snaps[G.snaps.length - 1]; if (l) pushSnap({ ...l, tm: d.tm, ck: d.ck, ph: d.ph, lt: d.lt, c: l.c.map((r, i) => { const f = d.c[i], n = r.slice(); if (f) { n[0] = f[0]; n[1] = f[1]; n[2] = f[2]; n[3] = f[3]; n[5] = f[4]; n[4] = f[5]; n[13] = f[6] || 0; n[14] = f[7] || 0; } return n; }) }); }
  else if (d.t === 'po') { const v = performance.now() - d.c; Net.rtt = Net.rtt ? lerp(Net.rtt, v, .25) : v; }
  else if (d.t === 'fs') toast('Фальстарт: ' + d.n);
  else if (d.t === 'rt') { RT.accept(d.ev); setTimeout(RT.sync, 1500); }
  else if (d.t === 'back') { G.mode = 'lobbywait'; startAttract(); show('lobby'); renderLobby(); }
}
function hostStart() { flowStart('host'); }
/* friends' rating: a race counts when at least two people drove it; the host signs the result */
function rateRace(force) {
  if (G.net !== 'host' || G.sess !== 'race' || G.rated || G.mode !== 'race') return; const hs = G.cars.filter(c => c.human), me = G.cars[G.me]; if (hs.length < 2) return;
  if (!hs.every(c => c.fin) && !(force && me && me.fin)) return; G.rated = true;
  const T = G.track, km = parseFloat(T.def.km) || 5, rows = standings().filter(c => c.human).map((c, i) => { const p = Net.players.find(q => q.id === (c.human === 'local' ? Net.me : c.human)); return p && p.rk ? { k: p.rk, n: c.human === 'local' ? myName() : p.name, d: p.dv, p: i + 1, t: c.fin ? +c.finT.toFixed(3) : 0, b: isFinite(c.best) ? +c.best.toFixed(3) : 0, km: +(Math.max(0, c.prog / T.N - 1) * km).toFixed(2) } : null; }).filter(Boolean);
  if (rows.length < 2) return; RT.publishRace({ v: 1, tr: T.def.name, laps: G.laps, res: rows }).then(ev => bcast({ t: 'rt', ev })).catch(e => console.warn('rating', e));
}
/* snapshots are placed on the host's own clock, so a burst of late packets never reads as a burst of motion */
function pushSnap(s) {
  const n = performance.now(), L = G.snaps[G.snaps.length - 1]; if (L && s.ck != null && L.ck != null && s.ck <= L.ck) return; s.rt = n;
  if (s.ck != null) { const off = n - s.ck; Net.cOff = Net.cOff == null || off < Net.cOff ? off : Net.cOff + (off - Net.cOff) * .02; s.st = s.ck + Net.cOff; } else s.st = n;
  G.snaps.push(s); if (G.snaps.length > 12) G.snaps.shift();
}
/* a friend's car on the host's screen: predicted forward to "now" from its last pose, then eased in */
function netFollow(c, dt) {
  const p = c.pose, now = performance.now(), t = clamp((now - (c.poseS || now)) / 1000 + (c.poseR || 0) / 2000, 0, .4), om = c.poseW || 0, sp = Math.hypot(p[3], p[4]), va = Math.atan2(p[3], -p[4]) + om * t / 2;
  const tx = p[0] + Math.sin(va) * sp * t, ty = p[1] - Math.cos(va) * sp * t, q = Math.hypot(tx - c.x, ty - c.y) > 450 ? 1 : 1 - Math.exp(-dt * 13);
  c.x = lerp(c.x, tx, q); c.y = lerp(c.y, ty, q); c.h += wrapA(p[2] + om * t - c.h) * q; c.vx = p[3]; c.vy = p[4]; c.vF = p[5]; c.slide = p[7]; c.surf = p[8];
}
function netTick(dt) {
  if (G.net === 'host') {
    Net.sendT -= dt; if (Net.sendT > 0) return; const cs = [...Net.conns.values()]; Net.sendT = cs.some(c => c.broker) ? 1 / 15 : 1 / 20; const ck = Math.round(performance.now());
    const full = { t: 's', ck, bs: G.bs, h: +G.h.toFixed(1), ph: G.phase, lt: +G.lt.toFixed(2), tm: +G.t.toFixed(3), c: G.cars.map(c => [Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10, +c.h.toFixed(3), Math.round(c.vF), c.lap, c.idx, c.fin ? +c.finT.toFixed(3) : 0, +c.slide.toFixed(2), isFinite(c.best) ? +c.best.toFixed(3) : 0, c.surf, +(c.lapStart).toFixed(3), c.tyre, Math.round(c.wear), c.pitS ? (c.pitSv ? 2 : 1) : 0, +c.pitT.toFixed(1), +(c.qt || 0).toFixed(3), +c.qs.toFixed(3), c.human ? c.sc : 0, c.human ? c.ls : 0, c.human ? c.bs : 0]) };
    Net.fr = (Net.fr || 0) + 1; let fast = null;
    for (const c of cs) if (c.open) c.send(c.broker && Net.fr % 15 ? fast || (fast = { t: 'f', ck, ph: G.phase, lt: +G.lt.toFixed(2), tm: +G.t.toFixed(2), c: G.cars.map(q => { const r = [Math.round(q.x), Math.round(q.y), +q.h.toFixed(2), Math.round(q.vF), q.idx, q.lap]; if (q.pitS) r.push(q.pitSv ? 2 : 1, +q.pitT.toFixed(1)); return r; }) }) : full);
  } else if (G.net === 'client' && Net.hc && Net.hc.open) {
    Net.sendT -= dt; if (Net.sendT > 0) return; Net.sendT = Net.hc.broker ? 1 / 20 : 1 / 30; const m = G.cars[G.me], n = performance.now();
    if (n - (Net.pgAt || 0) > 1000) { Net.pgAt = n; Net.hc.send({ t: 'pg', c: n }); }
    Net.hc.send({ r: Math.round(Net.rtt || 0), ts: Math.round(n), t: 'in', a: +In.thr.toFixed(2), b: In.brk, s: +In.steer.toFixed(3), p: m ? [+m.x.toFixed(1), +m.y.toFixed(1), +m.h.toFixed(3), +m.vx.toFixed(1), +m.vy.toFixed(1), Math.round(m.vF), m.idx, +m.slide.toFixed(2), m.surf, m.inPit ? 1 : 0] : null });
  }
}
function clientStep(dt) { // the local player's car: instant response whatever the network delay
  const c = G.cars[G.me]; if (!c || c.fin || G.mode !== 'race') return; c.thr = In.thr; c.brk = In.brk; c.steer = In.steer;
  physics(c, dt); collide(); const T = G.track, N = T.N; let best = 1e18, bi = c.idx;
  for (let k = -22; k <= 22; k++) { const i = (c.idx + k + N) % N, dx = c.x - T.x[i], dy = c.y - T.y[i], d = dx * dx + dy * dy; if (d < best) { best = d; bi = i; } }
  c.idx = bi; c.d = (c.x - T.x[bi]) * T.nx[bi] + (c.y - T.y[bi]) * T.ny[bi]; barrier(c);
  if ((G.step = (G.step || 0) + 1) % 6 === 0) towCalc();
}
function applySnaps() {
  const S2 = G.snaps; if (!S2.length) return;
  const now = performance.now(), broker = Net.hc && Net.hc.broker, rt = now - 110, d0 = now - (G.snapT || now); G.snapT = now; let a = S2[0], b = S2[S2.length - 1];
  for (let i = 0; i < S2.length - 1; i++) if (S2[i].st <= rt && S2[i + 1].st >= rt) { a = S2[i]; b = S2[i + 1]; break; }
  const k = b === a ? 1 : clamp((rt - a.st) / (b.st - a.st), 0, 1), L = S2[S2.length - 1];
  G.h = L.h == null ? 5 : L.h; if (L.bs) G.bs = L.bs;
  if (now - L.rt > 4000) return; // stale
  const prevPhase = G.phase; G.phase = L.ph; G.lt = L.lt; G.t = L.tm;
  if (prevPhase === 'grid' && G.phase === 'race') G.t = L.tm;
  G.cars.forEach((c, i) => {
    const A = a.c[i], B = b.c[i], Lc = L.c[i]; if (!A || !B) return;
    const mine = i === G.me && !c.fin && !Lc[6];
    if (!mine && broker && S2.length > 1) { // broker link: dead-reckon to "now" from the two latest states, then blend so nothing jumps
      const P0 = S2[S2.length - 2], p = P0.c[i] || Lc, gap = Math.max(.03, (L.st - P0.st) / 1000), om = clamp(wrapA(Lc[2] - p[2]) / gap, -3, 3), t = clamp((now - L.st) / 1000 + (Net.rtt || 200) / 2000, 0, .5), hm = Lc[2] + om * t / 2, hold = Lc[13] || G.phase !== 'race';
      const tx = hold ? Lc[0] : Lc[0] + Math.sin(hm) * Lc[3] * t, ty = hold ? Lc[1] : Lc[1] - Math.cos(hm) * Lc[3] * t, th = hold ? Lc[2] : Lc[2] + om * t;
      const q = Math.hypot(tx - c.x, ty - c.y) > 500 ? 1 : 1 - Math.exp(-d0 / 1000 * 11); c.x = lerp(c.x, tx, q); c.y = lerp(c.y, ty, q); c.h += wrapA(th - c.h) * q; c.vF = Lc[3]; const f = Math.sin(c.h), g = -Math.cos(c.h); c.vx = f * c.vF; c.vy = g * c.vF; c.idx = Lc[5]; c.slide = Lc[7]; c.surf = Lc[9]; }
    else if (!mine) { c.x = lerp(A[0], B[0], k); c.y = lerp(A[1], B[1], k); c.h = A[2] + wrapA(B[2] - A[2]) * k; c.vF = lerp(A[3], B[3], k);
      const f = Math.sin(c.h), g = -Math.cos(c.h); c.vx = f * c.vF; c.vy = g * c.vF; c.idx = Lc[5]; c.slide = Lc[7]; c.surf = Lc[9]; }
    else if (Lc[13]) { const q = 1 - Math.exp(-.2); c.x = lerp(c.x, Lc[0], q); c.y = lerp(c.y, Lc[1], q); c.h += wrapA(Lc[2] - c.h) * q; c.vx = c.vy = c.vF = c.vL = 0; c.idx = Lc[5]; }
    c.prog = Lc[4] * G.track.N + Lc[5]; c.best = Lc[8] || Infinity; c.lapStart = Lc[10]; c.tyre = Lc[11]; c.wear = Lc[12]; c.pitS = Lc[13] ? 1 : 0; c.pitSv = Lc[13] === 2 ? 1 : 0; c.pitT = Lc[14]; if (c.pitSv && !c.pitD) c.pitD = Math.max(1, c.pitT); if (!c.pitS) c.pitD = 0; c.qt = Lc[15]; c.qs = Lc[16]; if (Lc[17]) { c.sc = Lc[17]; c.ls = Lc[18]; c.bs = Lc[19]; }
    if (Lc[4] !== c.lap) { const was = c.lap; c.lap = Lc[4]; if (c.human === 'local' && G.sess !== 'quali' && c.lap > was && c.lap >= 2 && c.lap <= G.laps) banner(c.lap === G.laps ? 'FINAL LAP' : 'LAP ' + c.lap); }
    if (Lc[6] && !c.fin) { c.fin = true; c.finT = Lc[6]; if (c.human === 'local' && G.sess === 'quali') banner(fmt(c.finT), '#FFC400'); else if (c.human === 'local') { banner('FINISH', '#FFC400'); G.resT = 2.6; } }
  });
}

/* =====================================================================
   UI / SCREENS
   ===================================================================== */
const SCREENS = ['menu', 'garage', 'friends', 'lobby', 'results', 'quali', 'tyrepick', 'rating'];
function show(id) { SCREENS.forEach(s => $('#' + s).classList.toggle('hidden', s !== id)); if (id === 'menu') refreshMenu(); if (id) document.body.classList.remove('nocur'); fitUI(); }
/* no page ever scrolls: a screen that does not fit the window is scaled down until it does */
function fit1(el, room) { el.style.zoom = ''; let z = 1; for (let k = 0; k < 7; k++) { const hh = room ? room / z : el.clientHeight, r = Math.min(1, hh / Math.max(1, el.scrollHeight), el.clientWidth / Math.max(1, el.scrollWidth)); if (r >= .9995) break; z = Math.max(.45, z * r * .995); el.style.zoom = z; } }
let fitQ = 0;
function fitUI() { if (fitQ) return; fitQ = requestAnimationFrame(() => { fitQ = 0; for (const el of $$('.screen')) if (!el.classList.contains('hidden')) fit1(el); if (!$('#sheet').classList.contains('hidden')) fit1($('.sheet-body'), innerHeight - 24); }); }
addEventListener('resize', () => { fitUI(); if (G.mode === 'race' && !$('#tracks').classList.contains('hidden')) tgCols(); });
function tgCols() { const g = $('#tgGrid'), n = TRK.length, r = g.getBoundingClientRect(); g.style.setProperty('--cols', clamp(Math.round(Math.sqrt(n * (r.width || innerWidth) / (r.height || innerHeight) / 1.25)), 3, 9)); }
let toastT = 0;
/* ---------- all tracks at once ---------- */
function defOutline(cvs, def, col) {
  const g = cvs.getContext('2d'), W = cvs.width, H = cvs.height, P = def.pts; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const pad = 12, s = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (y1 - y0)), ox = (W - (x1 - x0) * s) / 2 - x0 * s, oy = (H - (y1 - y0) * s) / 2 - y0 * s;
  g.clearRect(0, 0, W, H); g.lineJoin = g.lineCap = 'round'; g.beginPath(); P.forEach(([x, y], i) => i ? g.lineTo(x * s + ox, y * s + oy) : g.moveTo(x * s + ox, y * s + oy)); g.closePath();
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 7; g.stroke(); g.strokeStyle = col; g.lineWidth = 3.2; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(P[0][0] * s + ox, P[0][1] * s + oy, 3.5, 0, 7); g.fill();
}
function openTracks(lobby) {
  const cur = lobby ? Net.track : S.track; $('#tgCount').textContent = TRK.length + ' трасс';
  $('#tgGrid').innerHTML = TRK.map((d, i) => `<button class="tg-card${i === cur ? ' on' : ''}" data-i="${i}"><canvas width="240" height="160"></canvas><b><i class="flag ${d.flag || 'mc'}"></i>${d.name}</b><span>${d.km} км · ${d.sub.split('·')[0].trim()}</span>${d.night ? '<em class="night">НОЧЬ</em>' : ''}</button>`).join('');
  $$('#tgGrid .tg-card').forEach(b => defOutline(b.querySelector('canvas'), TRK[+b.dataset.i], +b.dataset.i === cur ? '#FFC400' : '#d9dce2'));
  $('#tgGrid').onclick = e => { const b = e.target.closest('.tg-card'); if (!b) return; const i = +b.dataset.i; $('#tracks').classList.add('hidden');
    if (lobby) { if (Net.host) { Net.track = i; bcastLobby(); } } else if (i !== S.track) { S.track = i; saveS(); startAttract(); } };
  $('#tracks').classList.remove('hidden'); tgCols();
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600); }

function refreshMenu() {
  const t = TEAMS[S.team];
  $('#mcTeam').textContent = t.n; $('#mcTeam').style.color = t.ui;
  $('#mcDriver').textContent = '#' + t.num + ' · ' + t.drv;
  const c = $('#menuCar'), g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.translate(c.width / 2, c.height / 2); g.scale(5, 5); drawCarArt(g, S.team);
  const td = TRK[S.track]; $('#tcName').textContent = td.name; $('#tcSub').textContent = td.sub; $('#tcFlag').className = 'flag ' + (td.flag || 'mc');
  $('#tcLaps').textContent = S.laps; $('#tcLen').textContent = td.km;
  { const tc = $('#trackThumb'), r = tc.getBoundingClientRect(), d = Math.min(3, devicePixelRatio || 1); // match the CSS box so the outline is never stretched
    if (r.width > 0) { tc.width = Math.round(r.width * d); tc.height = Math.round(r.height * d); }
    trackOutline(tc, 12 * d, 3.5 * d, '#FFC400'); }
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
    brk: 5.2 * t.brk + .1 * h(3), kg: 798 + Math.round(h(4) * 6), drs: 11 + h(5) * 4, lat: 5.1 * t.grip, tit: t.tit,
    p: [22.5 + h(6) * .8, 22.5 + h(7) * .8, 20.5 + h(8) * .8, 20.5 + h(9) * .8], bars: [t.acc, t.grip, t.brk, (t.acc + t.spd) / 2] };
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
  ['bBrk', 'bPow', 'bAero', 'bErs'].forEach((id, k) => { const e = $('#' + id); e.style.width = '8%'; void e.offsetWidth; e.style.width = clamp(55 + (s.bars[[2, 0, 1, 3][k]] - .986) / .028 * 45, 30, 100) + '%'; });
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
  const lt = TRK[Net.track] || TRK[0]; $('#lTrackName').textContent = lt.name; $('#lTrack').classList.toggle('nohost', !Net.host);
  $('#lStart').classList.toggle('hidden', !Net.host); $('#lLaps').classList.toggle('hidden', !Net.host); $('#lWait').classList.toggle('hidden', Net.host);
  $$('#lLaps button').forEach(b => b.classList.toggle('on', +b.dataset.v === Net.laps));
  const lo = Net.o; for (const [id, key] of [['lQ', 'q'], ['lB', 'b'], ['lT', 't'], ['lW', 'w']]) $('#' + id).classList.toggle('on', !!lo[key]);
  { const v = Math.round((lo.tw || 1.2) * 100); $('#lTw').value = v; $('#lTwV').textContent = v + '%'; }
  fitUI();
  $('#lOpts').classList.toggle('nohost', !Net.host); $('#lWxRow').classList.toggle('hidden', !lo.w); $$('#lWx button').forEach(b => b.classList.toggle('on', +b.dataset.v === lo.m));
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- sheet (settings / pause) ---------- */
function openSheet(pause) {
  $('#sheetTitle').textContent = pause ? 'ПАУЗА' : 'НАСТРОЙКИ'; $('#sQuit').classList.toggle('hidden', !pause);
  $('#sheet').classList.remove('hidden'); if (pause && !G.net) G.paused = true; document.body.classList.remove('nocur'); syncSettings(); setTab(sTab); fitUI();
}
let sTab = 'race';
function setTab(t) { sTab = t; $$('#sTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); $$('.sheet-body [data-g]').forEach(r => r.classList.toggle('off', r.dataset.g !== t)); fitUI(); }
const SLIDERS = [['sTw', 'tw', 1.2], ['sMap', 'mapS', 1], ['sWheel', 'wheelS', 1], ['sPad', 'padS', 1], ['sHud', 'hudS', 1], ['sSpd', 'spdFx', 1]];
function applyUI() { const r = document.documentElement.style; r.setProperty('--mapS', S.mapS); r.setProperty('--wheelS', S.wheelS); r.setProperty('--padS', S.padS); r.setProperty('--hudS', S.hudS); if (G.track && G.mode === 'race' && MINI) buildMini(); for (const [id, k] of SLIDERS) { const e = $('#' + id); if (e) { const v = Math.round(S[k] * 100); e.value = v; e.nextElementSibling.textContent = v + '%'; } } }
/* drag handles on the mini-map and the wheel */
function grip(el, key, lo, hi, base, dirs) {
  el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); el.setPointerCapture?.(e.pointerId); const x0 = e.clientX, y0 = e.clientY, s0 = S[key], d = dirs();
    const mv = v => { S[key] = clamp(s0 + ((v.clientX - x0) * d[0] + (v.clientY - y0) * d[1]) / (2 * base), lo, hi); applyUI(); };
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); saveS(); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); });
}
function syncSettings() {
  applyUI();
  $$('#sDiff button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.diff));
  $$('#sLaps button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.laps));
  $('#sTyres').classList.toggle('on', S.tyres); $('#sWeather').classList.toggle('on', S.weather); $('#sQuali').classList.toggle('on', S.quali); $('#mQuali').classList.toggle('on', S.quali);
  $('#rowWx').classList.toggle('hidden', !S.weather); $$('#sWx button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.wx));
  $('#sLeft').classList.toggle('on', S.lefty); $('#sSound').classList.toggle('on', S.sound);
  $('#controls').classList.toggle('lefty', S.lefty);
  $$('#sCtrl button').forEach(b => b.classList.toggle('on', b.dataset.v === S.ctrl));
  $('#wheelZone').classList.toggle('hidden', S.ctrl === 'arrows'); $('#arrows').classList.toggle('hidden', S.ctrl !== 'arrows');
  FX.sync();
}
function wireUI() {
  $('#btnSettings').onclick = () => openSheet(false);
  $('#btnPause').onclick = () => openSheet(true);
  $('#sClose').onclick = () => { $('#sheet').classList.add('hidden'); G.paused = false; if (G.mode === 'attract' && G.track.tw !== normTw(S.tw)) startAttract(); if ($('#menu').classList.contains('hidden') === false) refreshMenu(); };
  $('#sTabs').onclick = e => { const b = e.target.closest('button'); if (b) setTab(b.dataset.t); };
  for (const [id, k] of SLIDERS) { const e = $('#' + id); e.oninput = () => { S[k] = +e.value / 100; applyUI(); }; e.onchange = () => saveS(); }
  $('#lTw').oninput = e => { if (!Net.host) return; Net.o.tw = +e.target.value / 100; $('#lTwV').textContent = e.target.value + '%'; }; $('#lTw').onchange = () => { if (Net.host) bcastLobby(); };
  grip($('#mapGrip'), 'mapS', .6, 3, 110, () => [-1, 1]);
  grip($('#wheelGrip'), 'wheelS', .5, 2, 200, () => [S.lefty ? 1 : -1, -1]);
  $('#mapbox').addEventListener('wheel', e => { e.stopPropagation(); e.preventDefault(); S.mapS = clamp(S.mapS * (e.deltaY < 0 ? 1.06 : .94), .6, 3); applyUI(); saveS(); }, { passive: false });
  $('#sQuit').onclick = () => { $('#sheet').classList.add('hidden'); if (G.net) netClose(); startAttract(); };
  $('#sDiff').onclick = e => { const v = e.target.dataset.v; if (v != null) { S.diff = +v; saveS(); syncSettings(); } };
  $('#sLaps').onclick = e => { const v = e.target.dataset.v; if (v != null) { S.laps = +v; saveS(); syncSettings(); } };
  $('#sCtrl').onclick = e => { const v = e.target.dataset.v; if (v) { S.ctrl = v; saveS(); syncSettings(); } };
  const setTyres = v => { S.tyres = v; if (!v) S.weather = false; saveS(); syncSettings(); }, setWx = v => { S.weather = v; if (v) S.tyres = true; saveS(); syncSettings(); };
  $('#sTyres').onclick = () => setTyres(!S.tyres); $('#sWeather').onclick = () => setWx(!S.weather);
  $('#sWx').onclick = e => { const v = e.target.dataset.v; if (v != null) { S.wx = +v; saveS(); syncSettings(); } };
  const tq = () => { S.quali = !S.quali; saveS(); syncSettings(); }; $('#sQuali').onclick = tq; $('#mQuali').onclick = tq;
  $('#btnPractice').onclick = () => { Snd.init(); startPractice(); };
  $('#qGo').onclick = () => qGo();
  for (const [id, key] of [['lQ', 'q'], ['lB', 'b'], ['lT', 't'], ['lW', 'w']]) $('#' + id).onclick = () => { if (!Net.host) return; Net.o[key] = !Net.o[key]; if (key === 't' && !Net.o.t) Net.o.w = false; if (key === 'w' && Net.o.w) Net.o.t = true; bcastLobby(); };
  $('#lWx').onclick = e => { const v = e.target.dataset.v; if (v != null && Net.host) { Net.o.m = +v; bcastLobby(); } };
  addEventListener('keydown', e => { const n = '1234'.indexOf(e.key); if (n < 0) return; const box = !$('#pitSheet').classList.contains('hidden') ? '#pitCards' : !$('#tyrepick').classList.contains('hidden') ? '#tpCards' : null; if (box) { const b = $$(box + ' .tcard')[n]; if (b) b.click(); } });
  $('#sLeft').onclick = () => { S.lefty = !S.lefty; saveS(); syncSettings(); };
  $('#sSound').onclick = () => { S.sound = !S.sound; saveS(); syncSettings(); };
  $('#carCard').onclick = () => openGarage('solo');
  $('#btnRace').onclick = () => { Snd.init(); startSolo(); };
  $('#btnFriends').onclick = () => { $('#fName').value = S.name; show('friends'); };
  $('#fBack').onclick = () => show('menu');
  $('#btnHost').onclick = () => { S.name = $('#fName').value.trim(); saveS(); RT.setNick(S.name); hostLobby(); };
  $('#btnJoin').onclick = () => { S.name = $('#fName').value.trim(); saveS(); RT.setNick(S.name); joinLobby($('#fCode').value); };
  $('#lBack').onclick = () => { netClose(); show('menu'); };
  $('#lCar').onclick = () => openGarage('lobby');
  $('#lCopy').onclick = () => { const url = location.origin + location.pathname + '#join=' + Net.code; (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => toast('Ссылка скопирована'), () => toast(url)); };
  $('#lLaps').onclick = e => { const v = e.target.dataset.v; if (v != null && Net.host) { Net.laps = +v; bcastLobby(); } };
  $('#lStart').onclick = () => { Snd.init(); hostStart(); };
  $('#lTrack').onclick = () => { if (Net.host) openTracks(true); };
  const pick = d => { S.track = (S.track + d + TRK.length) % TRK.length; saveS(); startAttract(); };
  $('#tcPrev').onclick = () => pick(-1); $('#tcNext').onclick = () => pick(1);
  $('#tcAll').onclick = () => openTracks(false); $('#trackThumb').onclick = () => openTracks(false); $('#tgClose').onclick = () => $('#tracks').classList.add('hidden');
  $('#tracks').onclick = e => { if (e.target.id === 'tracks') $('#tracks').classList.add('hidden'); };
  $('#rAgain').onclick = () => { RP.stop(); rateRace(true); if (G.net === 'host') { bcast({ t: 'back' }); startAttract(); show('lobby'); renderLobby(); } else startSolo(); };
  $('#rMenu').onclick = () => { RP.stop(); rateRace(true); if (G.net) setTimeout(netClose, 400); startAttract(); };
  $('#btnRating').onclick = () => RT.open();
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
  readInput(dt); FX.pre(dt);
  if (G.mode === 'race' || G.mode === 'attract' || G.mode === 'lobbywait') {
    if (G.net === 'client' && G.mode === 'race') { applySnaps(); if (G.phase === 'race') { accT += dt; let n = 0; while (accT >= STEP && n++ < 8) { clientStep(STEP); accT -= STEP; } if (n >= 8) accT = 0; } }
    else if (!G.paused) { accT += dt; let n = 0; while (accT >= STEP && n++ < 8) { simStep(STEP); accT -= STEP; } if (n >= 8) accT = 0; }
    for (const c of G.cars) { c.rx = c.x; c.ry = c.y; c.rh = c.h; }
    { const f = G.cars[G.follow]; if (f && cam.shake > .3) { f.rx += rand(-1, 1) * cam.shake * .15; f.ry += rand(-1, 1) * cam.shake * .15; f.rh += rand(-1, 1) * cam.shake * .005; } }
    if (!G.paused) RP.rec(dt);
    if (RP.on) RP.draw(dt); else { if (!G.paused) FX.effects(dt); camera(dt); FX.render(dt); }
    hud(dt); netTick(dt); rateRace();
    if (G.resT > 0) { G.resT -= dt; if (G.resT <= 0) showResults(); }
    if (!$('#results').classList.contains('hidden') && (resUpd -= dt) < 0) { resUpd = .5; renderResults(); }
  }
  if (!$('#garage').classList.contains('hidden')) drawGarage(dt);
}

/* hidden host tab: rAF stops, so keep the race running for everyone from a timer */
setInterval(() => {
  if (!document.hidden || G.net !== 'host' || G.mode !== 'race' || G.paused) return;
  const now = performance.now(), dt = Math.min(2, (now - last) / 1000); last = now;
  for (let n = Math.round(dt / STEP); n > 0; n--) simStep(STEP);
  for (const c of G.cars) { c.rx = c.x; c.ry = c.y; c.rh = c.h; }
  Net.sendT = 0; netTick(dt);
}, 250);

/* ---------- boot ---------- */
resize(); buildPatterns(ctx); buildSprites(); loadCarPNGs();
S.track = clamp(S.track | 0, 0, TRK.length - 1); G.track = getTrack(S.track);
wireUI(); FX.ui(); RT.ui();
const joinHash = /join=/i.test(location.hash);
startAttract();
if (joinHash) show('friends');
document.fonts?.ready.then(() => { refreshMenu(); fitUI(); });
requestAnimationFrame(frame);
