// APEX GP 3D — builds a 3D circuit from a 2D centreline (the same data as the 2D game).
import * as THREE from './vendor/three.module.min.js';

export const HW = 7;            // road half-width, m
const WALL = 9.5;               // barrier distance from road edge, m
const DESERT = ['sakhir', 'yas', 'losail', 'jeddah', 'vegas'], CITY = ['vegas', 'marinabay', 'baku', 'jeddah', 'miami', 'madrid', 'montreal', 'melbourne', 'yas'];

function rng(seed) { let s = seed >>> 0 || 1; return () => (s = Math.imul(s ^ s >>> 15, 2246822507) ^ Math.imul(s ^ s >>> 13, 3266489909), ((s ^= s >>> 16) >>> 0) / 4294967296); }
function smooth(a, passes) { const n = a.length; let b = new Float32Array(n); for (let p = 0; p < passes; p++) { for (let i = 0; i < n; i++) b[i] = (a[(i + n - 1) % n] + 2 * a[i] + a[(i + 1) % n]) / 4; [a, b] = [b, a]; } return a; }
function canvas(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
const speck = (g, w, h, n, cols, s = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * s, 1 + Math.random() * s); } };

let TEX = null;
function textures() {
  return TEX ||= {
    road: canvas(256, 512, (g, w, h) => {
      g.fillStyle = '#34363b'; g.fillRect(0, 0, w, h);
      speck(g, w, h, 9000, ['rgba(255,255,255,.05)', 'rgba(0,0,0,.12)', 'rgba(255,255,255,.03)'], 2);
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(.18, 'rgba(0,0,0,0)'); gr.addColorStop(.42, 'rgba(0,0,0,.3)'); gr.addColorStop(.58, 'rgba(0,0,0,.3)'); gr.addColorStop(.82, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e9e9e4'; g.fillRect(5, 0, 5, h); g.fillRect(w - 10, 0, 5, h);
    }),
    grass: canvas(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); speck(g, w, h, 5000, ['rgba(0,0,0,.10)', 'rgba(0,0,0,.05)', 'rgba(255,255,255,.4)'], 3); g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, 0, w / 2, h); }),
    wall: canvas(2048, 128, (g, w, h) => {
      const cols = ['#e10600', '#f4f4f4', '#15151e', '#00d2be', '#ff8000', '#f4f4f4', '#1e41ff', '#ffd21e'], txt = ['APEX GP', 'ERS', 'APEX 3D', 'PIT', 'BOX BOX', 'APEX GP', 'DRS', 'P1'];
      for (let i = 0; i < 8; i++) {
        g.fillStyle = cols[i]; g.fillRect(i * 256, 0, 256, h); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(i * 256, h - 22, 256, 22); g.fillRect(i * 256, 0, 3, h);
        g.fillStyle = ['#f4f4f4', '#15151e', '#ffd21e'].includes(cols[i]) ? '#15151e' : '#fff'; if (cols[i] === '#15151e') g.fillStyle = '#fff';
        g.font = 'italic 900 64px "Titillium Web",Arial Black,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt[i], i * 256 + 128, 56);
      }
    }),
    crowd: canvas(256, 128, (g, w, h) => { g.fillStyle = '#23262c'; g.fillRect(0, 0, w, h); const c = ['#e33', '#fff', '#fc3', '#39f', '#f80', '#ddd', '#2c9', '#c5c', '#888']; for (let y = 3; y < h; y += 7) for (let x = 2; x < w; x += 5) if (Math.random() < .86) { g.fillStyle = c[Math.random() * c.length | 0]; g.fillRect(x + Math.random() * 2, y + Math.random() * 2, 3, 4); } }),
    bld: canvas(128, 256, (g, w, h) => { g.fillStyle = '#20232a'; g.fillRect(0, 0, w, h); for (let y = 6; y < h - 4; y += 12) for (let x = 5; x < w - 6; x += 10) { const r = Math.random(); g.fillStyle = r < .45 ? '#ffd9a0' : r < .55 ? '#bfe4ff' : '#2d313a'; g.fillRect(x, y, 6, 7); } }),
    pit: canvas(512, 128, (g, w, h) => { g.fillStyle = '#e8eaee'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1d22'; g.fillRect(0, 0, w, 34); g.fillStyle = '#7fc8ff'; for (let x = 4; x < w; x += 16) g.fillRect(x, 6, 12, 22); const c = ['#e10600', '#00d2be', '#ff8000', '#1e41ff', '#00594f', '#f4f4f4', '#0a6be8', '#c9a24a']; for (let i = 0; i < 8; i++) { g.fillStyle = '#15171b'; g.fillRect(i * 64 + 5, 52, 54, 76); g.fillStyle = c[i]; g.fillRect(i * 64 + 5, 44, 54, 8); } }),
    checker: canvas(256, 32, (g, w, h) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 16; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#f2f2f2'; g.fillRect(x * 16, y * 16, 16, 16); } }),
    glow: canvas(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,240,210,.55)'); r.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }),
  };
}

export function skyDome(night) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(night ? 0x02030a : 0x1d5fc4) }, hor: { value: new THREE.Color(night ? 0x1a1b33 : 0xbfd9ee) }, sun: { value: new THREE.Vector3(.5, .4, .3).normalize() }, sunC: { value: new THREE.Color(night ? 0x8fa0ff : 0xfff0cf) }, night: { value: night ? 1 : 0 }, t: { value: 0 } },
    vertexShader: 'varying vec3 d; void main(){ d = position; vec4 p = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
    fragmentShader: `varying vec3 d; uniform vec3 top,hor,sun,sunC; uniform float night,t;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ vec3 v = normalize(d); float y = max(v.y,0.);
        vec3 c = mix(hor, top, pow(y,.55));
        float s = max(dot(v,sun),0.);
        c += sunC * (pow(s,900.)*14. + pow(s,24.)*.5 + pow(s,4.)*.16) * (1.-night*.7);
        vec2 q = v.xz/(v.y+.12)*1.4 + t*.004; float cl = n(q)*.55+n(q*2.3)*.3+n(q*5.1)*.15;
        cl = smoothstep(.52,.82,cl) * smoothstep(0.,.18,v.y);
        c = mix(c, mix(vec3(1.), sunC, .3)*(1.-night*.86), cl*(.8-night*.3));
        if(night>.5){ vec2 sq = v.xz/(abs(v.y)+.35)*90.; vec2 g = floor(sq); float st = step(.985,h(g)) * smoothstep(.22,.0,length(fract(sq)-.5)); c += st*y*vec3(.9,.95,1.)*1.1*(1.-cl); }
        c = mix(c, hor, smoothstep(.06,-.02,v.y));
        gl_FragColor = vec4(c,1.); }`,
  });
  const o = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), m); o.frustumCulled = false; o.renderOrder = -10; return o;
}

export function buildTrack(def, opt = {}) {
  const T = textures(), R = rng(def.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const night = !!def.night, desert = DESERT.includes(def.id), city = CITY.includes(def.id);
  const group = new THREE.Group();

  /* ---------- centreline ---------- */
  let raw = def.pts, L0 = 0; for (let i = 0; i < raw.length; i++) { const a = raw[i], b = raw[(i + 1) % raw.length]; L0 += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  const sc = parseFloat(def.km) * 620 / L0;
  const curve = new THREE.CatmullRomCurve3(raw.map(p => new THREE.Vector3(p[0] * sc, 0, p[1] * sc)), true, 'centripetal');
  curve.arcLengthDivisions = raw.length * 6;
  const len = curve.getLength(), n = Math.round(len / 2), ds = len / n;
  const sp = curve.getSpacedPoints(n);
  let px = new Float32Array(n), pz = new Float32Array(n), py = new Float32Array(n);
  for (let i = 0; i < n; i++) { px[i] = sp[i].x; pz[i] = sp[i].z; }
  px = smooth(px, 6); pz = smooth(pz, 6);
  let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += px[i]; cz += pz[i]; } cx /= n; cz /= n;
  for (let i = 0; i < n; i++) { px[i] -= cx; pz[i] -= cz; }
  /* ---------- spatial hash of the centreline (for scenery & terrain) ---------- */
  const CELL = 40, hash = new Map(), hk = (x, z) => (Math.floor(x / CELL) + 512) * 1024 + Math.floor(z / CELL) + 512;
  for (let i = 0; i < n; i += 2) { const key = hk(px[i], pz[i]); (hash.get(key) || hash.set(key, []).get(key)).push(i); }
  function near(x, z, rad = 1) { let best = 1e9, bi = -1; const gx = Math.floor(x / CELL), gz = Math.floor(z / CELL); for (let a = -rad; a <= rad; a++) for (let b = -rad; b <= rad; b++) { const l = hash.get((gx + a + 512) * 1024 + gz + b + 512); if (l) for (const i of l) { const d = (px[i] - x) ** 2 + (pz[i] - z) ** 2; if (d < best) { best = d; bi = i; } } } return [Math.sqrt(best), bi]; }
  // other parts of the lap that run close by: share one barrier in the middle; a real crossing flattens the lap
  const lim = [new Float32Array(n).fill(99), new Float32Array(n).fill(99)], cross = new Float32Array(n); let hasCross = false;
  { const dx0 = new Float32Array(n), dz0 = new Float32Array(n); for (let i = 0; i < n; i++) { const a = (i + n - 1) % n, b = (i + 1) % n, l = Math.hypot(px[b] - px[a], pz[b] - pz[a]) || 1; dx0[i] = (px[b] - px[a]) / l; dz0[i] = (pz[b] - pz[a]) / l; }
    for (let i = 0; i < n; i++) { const gx = Math.floor(px[i] / CELL), gz = Math.floor(pz[i] / CELL);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = hash.get((gx + a + 512) * 1024 + gz + b + 512); if (!l) continue;
        for (const j of l) { const di = Math.abs(i - j), dc = Math.min(di, n - di); if (dc < 45) continue; const ex = px[j] - px[i], ez = pz[j] - pz[i], d = Math.hypot(ex, ez); if (d > 36) continue;
          if (d < HW * 1.6) { cross[i] = 1; hasCross = true; }
          const side = ex * dz0[i] - ez * dx0[i] > 0 ? 0 : 1; lim[side][i] = Math.min(lim[side][i], Math.max(HW + 1.2, d / 2 - .2)); } } }
    if (hasCross) for (let i = 0; i < n; i++) if (cross[i]) for (let j = -14; j <= 14; j++) { const q = (i + j + n) % n; lim[0][q] = lim[1][q] = HW + 4; cross[q] = Math.max(cross[q], .5); }
  }
  // elevation
  const el = (def.elev || [[0, 0]]).slice().sort((a, b) => a[0] - b[0]), emin = Math.min(...el.map(e => e[1])), erng = Math.max(...el.map(e => e[1])) - emin, es = erng && !hasCross ? Math.min(.45, 26 / erng) : 0;
  for (let i = 0; i < n; i++) {
    const f = i / n; let a = el[el.length - 1], b = el[0], fa = a[0] - 1, fb = b[0];
    for (let j = 0; j < el.length; j++) if (el[j][0] <= f) { a = el[j]; fa = a[0]; b = el[(j + 1) % el.length]; fb = j + 1 < el.length ? b[0] : b[0] + 1; }
    const u = fb > fa ? (f - fa) / (fb - fa) : 0; py[i] = ((a[1] + (b[1] - a[1]) * (.5 - .5 * Math.cos(Math.PI * u))) - emin) * es;
  }
  py = smooth(py, 80);
  // tangents, curvature
  const lim2 = lim, wallH = smooth(Float32Array.from(cross, c => c ? 0 : 1), 6);
  const tx = new Float32Array(n), tz = new Float32Array(n); let k = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = (i + n - 1) % n, b = (i + 1) % n, dx = px[b] - px[a], dz = pz[b] - pz[a], l = Math.hypot(dx, dz) || 1; tx[i] = dx / l; tz[i] = dz / l; }
  for (let i = 0; i < n; i++) { const a = (i + n - 1) % n, b = (i + 1) % n; k[i] = (tz[a] * tx[b] - tx[a] * tz[b]) / (2 * ds); } // + = left
  k = smooth(k, 4);
  const ks = smooth(Float32Array.from(k), 40);
  // barrier offsets (pulled in on the inside of tight corners so ribbons never fold)
  let offL = new Float32Array(n), offR = new Float32Array(n);
  for (let i = 0; i < n; i++) { const lc = Math.max(HW + 2.5, .8 / Math.max(Math.abs(ks[i]), 1e-4)), base = HW + WALL; offL[i] = Math.min(ks[i] > 0 ? Math.min(base, lc) : base, lim2[0][i]); offR[i] = Math.min(ks[i] < 0 ? Math.min(base, lc) : base, lim2[1][i]); }
  offL = smooth(offL, 12); offR = smooth(offR, 12);

  const P = (i, off, y = 0, out = new THREE.Vector3()) => { i = (i % n + n) % n; return out.set(px[i] + tz[i] * off, py[i] + y, pz[i] - tx[i] * off); };

  /* ---------- ribbon helper ---------- */
  function ribbon(fa, fb, uv, from = 0, to = n) {
    const pos = [], uvs = [], idx = [], v = new THREE.Vector3(); let r = 0;
    for (let i = from; i <= to; i++, r++) {
      const A = fa(i % n), B = fb(i % n), d = i * ds;
      P(i, A[0], A[1], v); pos.push(v.x, v.y, v.z); P(i, B[0], B[1], v); pos.push(v.x, v.y, v.z);
      const u = uv(d, i % n); uvs.push(u[0], u[1], u[2], u[3]);
      if (i < to) idx.push(r * 2, r * 2 + 1, r * 2 + 2, r * 2 + 1, r * 2 + 3, r * 2 + 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const add = (g, m, sh = true) => { const o = new THREE.Mesh(g, m); o.receiveShadow = sh; group.add(o); return o; };

  /* ---------- palette ---------- */
  const gcol = new THREE.Color(desert ? 0xc9ad7c : city && night ? 0x3a3d44 : 0x5f9a45), gcol2 = new THREE.Color(desert ? 0xb89766 : city && night ? 0x2e3138 : 0x4b8238);
  const fogC = new THREE.Color(night ? 0x14152a : desert ? 0xdccfb4 : 0xbcd4e6);

  /* ---------- road, verge, kerbs ---------- */
  add(ribbon(() => [HW, .02], () => [-HW, .02], d => [0, d / 16, 1, d / 16]), new THREE.MeshStandardMaterial({ map: T.road, roughness: night ? .55 : .82, metalness: night ? .15 : 0 }));
  const vergeM = new THREE.MeshStandardMaterial({ map: T.grass, color: gcol, roughness: 1 });
  const wu = (i, off) => [(px[i] + tz[i] * off) / 14, (pz[i] - tx[i] * off) / 14];
  add(ribbon(i => [offL[i] + 8, -.9], () => [HW - .2, 0], (d, i) => [...wu(i, offL[i] + 8), ...wu(i, HW)]), vergeM);
  add(ribbon(() => [-HW + .2, 0], i => [-offR[i] - 8, -.9], (d, i) => [...wu(i, -HW), ...wu(i, -offR[i] - 8)]), vergeM);
  { // kerbs: red/white blocks on both sides of every real corner
    const pos = [], col = [], v = new THREE.Vector3(), red = [.86, .07, .05], wht = [.94, .94, .92];
    const quad = (i, o0, o1, c) => { const p = [[i, o0, .03], [i, o1, .09], [i + 1, o0, .03], [i + 1, o1, .09]].map(a => P(a[0], a[1], a[2], v).toArray()); for (const j of o0 > 0 ? [0, 2, 1, 1, 2, 3] : [0, 1, 2, 1, 3, 2]) { pos.push(...p[j]); col.push(...c); } };
    for (let i = 0; i < n; i++) if (Math.abs(ks[i]) > .0038) { const c = (i >> 1) % 2 ? red : wht; quad(i, HW - .1, HW + 1.3, c); quad(i, -HW + .1, -HW - 1.3, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    add(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 }));
  }
  /* ---------- barriers ---------- */
  const wallM = new THREE.MeshStandardMaterial({ map: T.wall, roughness: .8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: T.wall, emissiveIntensity: night ? .5 : .04 });
  add(ribbon(i => [offL[i], -.1], i => [offL[i], wallH[i] * 1.35 - .1], d => [d / 40, 0, d / 40, 1]), wallM);
  add(ribbon(i => [-offR[i], -.1], i => [-offR[i], wallH[i] * 1.35 - .1], d => [-d / 40, 0, -d / 40, 1]), wallM);

  /* ---------- start line, grid, gantry, pit building ---------- */
  add(ribbon(() => [HW - .5, .035], () => [-HW + .5, .035], (d, i) => [0, i ? 1 : 0, 1, i ? 1 : 0], 0, 1), new THREE.MeshBasicMaterial({ map: T.checker, polygonOffset: true, polygonOffsetFactor: -2 }), false);
  const white = new THREE.MeshBasicMaterial({ color: 0xe8e8e2 }), dark = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: .5, metalness: .6 });
  const gridSlots = [];
  for (let s = 0; s < 12; s++) { const i = n - 8 - s * 5, side = s % 2 ? -1 : 1, off = side * 2.9; gridSlots.push({ i: (i + n) % n, off }); const o = new THREE.Mesh(new THREE.BoxGeometry(2.4, .02, .18), white); P(i + 1, off, .04, o.position); o.rotation.y = Math.atan2(tx[(i + n) % n], tz[(i + n) % n]); group.add(o); }
  const lamps = [];
  { const g = new THREE.Group(), h0 = Math.atan2(tx[0], tz[0]); P(0, 0, 0, g.position); g.rotation.y = h0;
    for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.35, 7.4, .35), dark); p.position.set(s * (HW + 1.6), 3.7, 0); p.castShadow = true; g.add(p); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 3.6, .9, .5), dark); beam.position.y = 7.2; beam.castShadow = true; g.add(beam);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 + 3.4, .8), new THREE.MeshBasicMaterial({ map: T.wall, side: THREE.DoubleSide })); sign.material.map = T.wall; sign.position.set(0, 7.2, -.27); sign.rotation.y = Math.PI; g.add(sign);
    for (let j = 0; j < 5; j++) { const pod = new THREE.Mesh(new THREE.BoxGeometry(.6, 1.3, .3), dark); pod.position.set((2 - j) * 1.05, 6.05, -.1); g.add(pod); const m = new THREE.MeshBasicMaterial({ color: 0x220000 }); for (const y of [5.75, 6.3]) { const l = new THREE.Mesh(new THREE.CircleGeometry(.2, 16), m); l.position.set((2 - j) * 1.05, y, -.26); l.rotation.y = Math.PI; g.add(l); } lamps.push(m); }
    group.add(g);
    const pit = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 150), [0, 1, 2, 3, 4, 5].map(f => new THREE.MeshStandardMaterial(f === 0 || f === 1 ? { map: T.pit, emissive: 0xffffff, emissiveMap: T.pit, emissiveIntensity: night ? .5 : 0, roughness: .6 } : { color: 0xd8dade, roughness: .7 })));
    { const uv = pit.geometry.attributes.uv; for (let v = 0; v < 8; v++) uv.setX(v, uv.getX(v) * 4); } pit.position.copy(P(n - 20, -(HW + WALL + 6.5), 4.4)); pit.rotation.y = h0; pit.castShadow = true; group.add(pit);
  }

  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9; for (let i = 0; i < n; i++) { minX = Math.min(minX, px[i]); maxX = Math.max(maxX, px[i]); minZ = Math.min(minZ, pz[i]); maxZ = Math.max(maxZ, pz[i]); }
  const meanY = py.reduce((a, b) => a + b, 0) / n;

  /* ---------- terrain ---------- */
  { const M = 700, w = maxX - minX + M * 2, d = maxZ - minZ + M * 2, sx = Math.min(220, Math.round(w / 11)), sz = Math.min(220, Math.round(d / 11));
    const g = new THREE.PlaneGeometry(w, d, sx, sz); g.rotateX(-Math.PI / 2); g.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), uv = g.attributes.uv, c = new THREE.Color();
    const sub = []; for (let i = 0; i < n; i += 10) sub.push(i);
    for (let v = 0; v < p.count; v++) {
      const x = p.getX(v), z = p.getZ(v); let sw = 0, sh = 0, dmin = 1e9;
      for (const i of sub) { const d2 = (px[i] - x) ** 2 + (pz[i] - z) ** 2, wgt = 1 / (d2 * d2 + 2e5); sw += wgt; sh += wgt * py[i]; if (d2 < dmin) dmin = d2; }
      const dd = Math.sqrt(dmin), hills = (Math.sin(x * .011) * Math.cos(z * .013) + Math.sin(x * .027 + z * .019) * .5) * Math.min(1, Math.max(0, (dd - 50) / 220)) * (city ? 3 : 16);
      p.setY(v, sh / sw - 1.1 + hills);
      c.copy(gcol).lerp(gcol2, .5 + .5 * Math.sin(x * .05 + Math.sin(z * .04) * 2) * Math.cos(z * .045)); col.set([c.r, c.g, c.b], v * 3); uv.setXY(v, x / 14, z / 14);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    add(g, new THREE.MeshStandardMaterial({ map: T.grass, vertexColors: true, roughness: 1 }));
    const far = new THREE.Mesh(new THREE.CircleGeometry(6000, 48), new THREE.MeshBasicMaterial({ color: gcol.clone().lerp(fogC, .6) })); far.rotation.x = -Math.PI / 2; far.position.y = meanY - 4; group.add(far);
  }

  /* ---------- scenery ---------- */
  const dm = new THREE.Object3D(), tmpC = new THREE.Color();
  const inst = (geo, mat, list, shadow = true) => { if (!list.length) return; const m = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((o, i) => { dm.position.set(o.x, o.y, o.z); dm.rotation.set(0, o.r || 0, 0); dm.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix); if (o.c) m.setColorAt(i, o.c); }); m.castShadow = shadow; m.receiveShadow = false; group.add(m); return m; };
  const groundY = i => py[i] - 1.0;
  // grandstands on straights
  { const st = [], roof = []; let last = -99;
    for (let i = 30; i < n - 10; i++) if (Math.abs(ks[i]) < .0016 && Math.abs(ks[(i + 12) % n]) < .0016 && i - last > 26) {
      const side = (st.length % 2 ? -1 : 1), off = side * ((side > 0 ? offL[i] : offR[i]) + 9); if (side < 0 && (i > n - 110 || i < 60)) continue;
      const p = P(i, off), [dn] = near(p.x, p.z); if (dn < Math.abs(off) - 1.5) continue;
      const r = Math.atan2(tx[i], tz[i]) + (side > 0 ? -Math.PI / 2 : Math.PI / 2); st.push({ x: p.x, y: py[i] - 1, z: p.z, r }); roof.push({ x: p.x, y: py[i] + 12.2, z: p.z, r }); last = i;
    }
    // wedge: stepped seating facing -Z (local) → towards the track
    const sh = new THREE.Shape(); sh.moveTo(-6, 0); sh.lineTo(6, 0); sh.lineTo(6, 11); sh.lineTo(4.5, 11); sh.lineTo(-6, 2.2); sh.lineTo(-6, 0);
    const wg = new THREE.ExtrudeGeometry(sh, { depth: 44, bevelEnabled: false }); wg.translate(0, 0, -22); wg.rotateY(Math.PI / 2);
    { const p = wg.attributes.position, nrm = wg.attributes.normal, uv = wg.attributes.uv; for (let v = 0; v < p.count; v++) { const slope = nrm.getY(v) > .3 && nrm.getZ(v) > .3; uv.setXY(v, slope ? p.getX(v) / 44 * 3 : .01, slope ? (p.getY(v) - 2) / 9 : .01); } }
    inst(wg, new THREE.MeshStandardMaterial({ map: T.crowd, roughness: .9, emissive: 0xffffff, emissiveMap: T.crowd, emissiveIntensity: night ? .35 : 0 }), st);
    inst(new THREE.BoxGeometry(46, .4, 12), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: .5 }), roof);
  }
  // trees / buildings
  { const trees = [], blds = [], area = (maxX - minX + 500) * (maxZ - minZ + 500), nT = Math.round(area / (desert ? 5200 : city ? 2600 : 900)), nB = city ? Math.round(area / 2400) : Math.round(area / 30000);
    const cg = new THREE.Color(desert ? 0x6f8a3c : 0x2f6b2a);
    for (let t = 0; t < nT * 3 && trees.length < Math.min(nT, 2600); t++) {
      const x = minX - 250 + R() * (maxX - minX + 500), z = minZ - 250 + R() * (maxZ - minZ + 500), [d, i] = near(x, z, 2); if (d < HW + WALL + 13 || i < 0 && R() < .5) continue;
      const s = .8 + R() * .9; trees.push({ x, y: (i < 0 ? meanY : py[i]) - 1.6, z, sx: s, sy: s * (.9 + R() * .5), sz: s, r: R() * 6, c: tmpC.copy(cg).offsetHSL((R() - .5) * .06, 0, (R() - .5) * .12).clone() });
    }
    for (let t = 0; t < nB * 4 && blds.length < Math.min(nB, 520); t++) {
      const x = minX - 220 + R() * (maxX - minX + 440), z = minZ - 220 + R() * (maxZ - minZ + 440), [d, i] = near(x, z, 2); if (d < HW + WALL + 26) continue;
      const tall = city ? 18 + R() * R() * 110 : 8 + R() * 10, w = 16 + R() * 22; blds.push({ x, y: (i < 0 ? meanY : py[i]) - 2 + tall / 2, z, sx: w, sy: tall, sz: 14 + R() * 22, r: R() * 3.14, c: tmpC.setHSL(.6 + R() * .08, .1, .45 + R() * .5).clone() });
    }
    const cone = new THREE.ConeGeometry(2.6, 7.5, 7), c2 = new THREE.ConeGeometry(2, 5, 7), trunk = new THREE.CylinderGeometry(.3, .4, 2.4, 5);
    cone.translate(0, 6, 0); c2.translate(0, 9.3, 0); trunk.translate(0, 1.2, 0);
    const tg = new THREE.BufferGeometry(), pp = [], nn = [], cc = [];
    for (const [g, c] of [[cone, [1, 1, 1]], [c2, [1.12, 1.12, 1.05]], [trunk, [.5, .36, .22]]]) { const q = g.toNonIndexed(); pp.push(...q.attributes.position.array); nn.push(...q.attributes.normal.array); for (let v = 0; v < q.attributes.position.count; v++) cc.push(...c); }
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); tg.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
    inst(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), trees);
    const bg = new THREE.BoxGeometry(1, 1, 1); { const uv = bg.attributes.uv; for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) * 2, uv.getY(v) * 3); }
    inst(bg, new THREE.MeshStandardMaterial({ map: T.bld, roughness: .5, metalness: .3, emissive: 0xffffff, emissiveMap: T.bld, emissiveIntensity: night ? 1.1 : 0 }), blds);
  }
  // flood lights (night) — glowing points along the barriers
  if (night) {
    const pos = [], poles = []; for (let i = 0; i < n; i += 22) for (const s of [1, -1]) { const p = P(i, s * ((s > 0 ? offL[i] : offR[i]) + 2.5)); pos.push(p.x, p.y + 13, p.z); poles.push({ x: p.x, y: p.y + 6, z: p.z, sy: 14 }); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    group.add(new THREE.Points(g, new THREE.PointsMaterial({ map: T.glow, size: 9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1d6, fog: false })));
    inst(new THREE.CylinderGeometry(.12, .16, 1, 5), dark, poles, false);
  }
  // mountains
  { const rad = Math.max(maxX - minX, maxZ - minZ) / 2 + 1300, mk = (r, hgt, col, seed) => { const S = 96, pos = [], idx = [], q = rng(seed); let h = hgt * .5, h0 = 0; for (let i = 0; i <= S; i++) { const a = i / S * Math.PI * 2; h = Math.max(hgt * .2, Math.min(hgt, h + (q() - .5) * hgt * .45)); if (!i) h0 = h; const top = i === S ? h0 : h; pos.push(Math.cos(a) * r, meanY - 20, Math.sin(a) * r, Math.cos(a) * r, meanY + top, Math.sin(a) * r); if (i < S) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, fog: false })); group.add(m); };
    const base = new THREE.Color(night ? 0x0c0d1c : desert ? 0xb9a184 : 0x6f8fae);
    mk(rad + 500, city ? 150 : 420, base.clone().lerp(fogC, .55), 5); mk(rad, city ? 90 : 260, base.clone().lerp(fogC, .25), 9);
  }

  /* ---------- racing line + speed profile (for AI and the brake assist) ---------- */
  let line = new Float32Array(n); const wide = smooth(Float32Array.from(k), 160);
  const kmx = new Float32Array(n); for (let i = 0; i < n; i++) { let m = 0; for (let j = -8; j <= 8; j++) m = Math.max(m, Math.abs(ks[(i + j + n) % n])); kmx[i] = m; }
  for (let i = 0; i < n; i++) { const lm = HW - 2.2 - Math.min(3.8, kmx[i] * 70); line[i] = Math.max(-lm, Math.min(lm, wide[i] * 520)); }
  line = smooth(line, 30);
  function profile(vOf, aBrk, vmax) {
    const v = new Float32Array(n); for (let i = 0; i < n; i++) v[i] = Math.min(vmax, vOf(Math.max(Math.abs(ks[i]), 1e-4)));
    for (let r = 0; r < 2; r++) for (let i = n - 1; i >= 0; i--) { const nx = v[(i + 1) % n]; v[i] = Math.min(v[i], Math.sqrt(nx * nx + 2 * aBrk * ds)); }
    return v;
  }

  return { def, group, n, ds, len, px, py, pz, tx, tz, k, ks, offL, offR, line, P, profile, gridSlots, lamps, night, desert, city, fogC, bounds: [minX, maxX, minZ, maxZ],
    dispose() { group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } };
}
