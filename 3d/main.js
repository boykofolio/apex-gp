// APEX GP 3D — game loop, physics, AI, camera, post-processing, HUD, audio.
import * as THREE from './vendor/three.module.min.js';
import { buildCar, WR } from './car.js';
import { buildTrack, skyDome, HW } from './track.js';

const $ = id => document.getElementById(id), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const QS = new URLSearchParams(location.search), TOUCH = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if (TOUCH) document.body.classList.add('touch');

const TEAMS = [
  { id: 'mercedes', n: 'MERCEDES', c1: '#C0C6CC', c2: '#111111', c3: '#00D2BE', ui: '#00D2BE', num: 63, drv: 'George Russell', code: 'RUS', ch: 'W17', k: 1.028 },
  { id: 'ferrari', n: 'FERRARI', c1: '#DC0000', c2: '#F4F4F4', c3: '#FFD700', ui: '#FF2A2A', num: 16, drv: 'Charles Leclerc', code: 'LEC', ch: 'SF-26', k: 1.022 },
  { id: 'redbull', n: 'RED BULL', c1: '#1E2B5C', c2: '#DB0A40', c3: '#FFC906', ui: '#FFC906', num: 1, drv: 'Max Verstappen', code: 'VER', ch: 'RB22', k: 1.017 },
  { id: 'mclaren', n: 'MCLAREN', c1: '#FF8000', c2: '#1A1B1F', c3: '#47C7FC', ui: '#FF8A1A', num: 4, drv: 'Lando Norris', code: 'NOR', ch: 'MCL40', k: 1.011 },
  { id: 'alpine', n: 'ALPINE', c1: '#0A6BE8', c2: '#FF69B4', c3: '#FFFFFF', ui: '#FF79C0', num: 43, drv: 'Franco Colapinto', code: 'COL', ch: 'A526', k: 1.006 },
  { id: 'racingbulls', n: 'RACING BULLS', c1: '#F2F2F2', c2: '#1634CC', c3: '#E4002B', ui: '#7d95ff', num: 6, drv: 'Isack Hadjar', code: 'HAD', ch: 'VCARB 03', k: 1.0 },
  { id: 'audi', n: 'AUDI', c1: '#BFC3C8', c2: '#101010', c3: '#FF3B1F', ui: '#FF4B2B', num: 27, drv: 'Nico Hülkenberg', code: 'HUL', ch: 'R26', k: .995 },
  { id: 'haas', n: 'HAAS', c1: '#EDEDED', c2: '#1C1C1C', c3: '#E6002B', ui: '#FF3344', num: 31, drv: 'Esteban Ocon', code: 'OCO', ch: 'VF-26', k: .989 },
  { id: 'williams', n: 'WILLIAMS', c1: '#1F5FD6', c2: '#0B1A3A', c3: '#00A3E0', ui: '#4DA3FF', num: 55, drv: 'Carlos Sainz', code: 'SAI', ch: 'FW48', k: .984 },
  { id: 'astonmartin', n: 'ASTON MARTIN', c1: '#00594F', c2: '#CEDC00', c3: '#FFFFFF', ui: '#2fd3b5', num: 14, drv: 'Fernando Alonso', code: 'ALO', ch: 'AMR26', k: .978 },
  { id: 'cadillac', n: 'CADILLAC', c1: '#E9E9E9', c2: '#151515', c3: '#C9A24A', ui: '#E2C275', num: 11, drv: 'Sergio Pérez', code: 'PER', ch: 'MAC-26', k: .973 },
];
const TRACKS = (window.EXTRA_TRACKS || []).filter(t => t.pts && t.pts.length > 50);
const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('apex3d_' + k)); localStorage.setItem('apex3d_' + k, JSON.stringify(v)); } catch (e) { return null; } };
const S = { team: store('team') ?? 1, track: store('track') ?? 0, laps: 3, diff: 1, assist: TOUCH ? 1 : 0, mode: 'menu', cam: 0, snd: true };
if (QS.get('track')) S.track = Math.max(0, TRACKS.findIndex(t => t.id === QS.get('track')));
S.team = clamp(S.team, 0, TEAMS.length - 1); S.track = clamp(S.track, 0, TRACKS.length - 1);

/* =================== renderer + post =================== */
const canvas = $('c'), renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.NoToneMapping;
const DPR = Math.min(devicePixelRatio || 1, TOUCH ? 1.5 : 2);
const cam = new THREE.PerspectiveCamera(60, 1, .2, 9000);
const rtMain = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: TOUCH ? 2 : 4 });
const rtA = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false }), rtB = rtA.clone();
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quadScene = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quadScene.add(quad);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }';
const mBright = new THREE.ShaderMaterial({ vertexShader: VS, uniforms: { t: { value: null } }, fragmentShader: 'varying vec2 vUv; uniform sampler2D t; void main(){ vec3 c = min(texture2D(t,vUv).rgb, vec3(12.)); float l = max(c.r,max(c.g,c.b)); gl_FragColor = vec4(c*smoothstep(.9,1.9,l),1.); }' });
const mBlur = new THREE.ShaderMaterial({ vertexShader: VS, uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, fragmentShader: 'varying vec2 vUv; uniform sampler2D t; uniform vec2 d; void main(){ vec3 c = texture2D(t,vUv).rgb*.227; c += (texture2D(t,vUv+d*1.38).rgb+texture2D(t,vUv-d*1.38).rgb)*.316; c += (texture2D(t,vUv+d*3.23).rgb+texture2D(t,vUv-d*3.23).rgb)*.07; gl_FragColor = vec4(c,1.); }' });
const mFinal = new THREE.ShaderMaterial({ vertexShader: VS, uniforms: { t: { value: null }, b: { value: null }, blur: { value: 0 }, bloom: { value: .8 }, expo: { value: 1 }, time: { value: 0 }, fade: { value: 1 } }, fragmentShader: `varying vec2 vUv; uniform sampler2D t,b; uniform float blur,bloom,expo,time,fade;
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
  void main(){ vec2 d = vUv-vec2(.5,.46); float r = length(d); float amt = blur*smoothstep(.16,.8,r);
    vec3 c = vec3(0.); float tot = 0.; for(int i=0;i<10;i++){ float k = float(i)/9.; float w = 1.-k*.55; c += texture2D(t,vUv-d*amt*k).rgb*w; tot += w; } c /= tot;
    float ca = (.002+blur*.03)*r; c.r = mix(c.r, texture2D(t,vUv+d*ca).r, .6); c.b = mix(c.b, texture2D(t,vUv-d*ca).b, .6);
    c += texture2D(b,vUv).rgb*bloom; c = aces(c*expo); c = pow(c, vec3(1./2.2));
    c *= 1.-smoothstep(.4,1.05,r)*(.42+blur*1.6);
    c += (fract(sin(dot(vUv*913.+time,vec2(12.9898,78.233)))*43758.5453)-.5)*.018;
    gl_FragColor = vec4(c*fade,1.); }` });
function post(scene, camera) {
  renderer.setRenderTarget(rtMain); renderer.render(scene, camera);
  const pass = (m, rt) => { quad.material = m; renderer.setRenderTarget(rt); renderer.render(quadScene, quadCam); };
  mBright.uniforms.t.value = rtMain.texture; pass(mBright, rtA);
  for (const s of [1, 2.2]) { mBlur.uniforms.t.value = rtA.texture; mBlur.uniforms.d.value.set(s / rtA.width, 0); pass(mBlur, rtB); mBlur.uniforms.t.value = rtB.texture; mBlur.uniforms.d.value.set(0, s / rtA.height); pass(mBlur, rtA); }
  mFinal.uniforms.t.value = rtMain.texture; mFinal.uniforms.b.value = rtA.texture; pass(mFinal, null);
}
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setPixelRatio(DPR); renderer.setSize(w, h, false);
  rtMain.setSize(w * DPR | 0, h * DPR | 0); rtA.setSize(w * DPR / 4 | 0, h * DPR / 4 | 0); rtB.setSize(w * DPR / 4 | 0, h * DPR / 4 | 0);
  cam.aspect = w / h; cam.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
const pmrem = new THREE.PMREMGenerator(renderer);

/* =================== showroom (menu) =================== */
const show = new THREE.Scene(); show.background = new THREE.Color(0x06070a); show.fog = new THREE.Fog(0x06070a, 14, 42);
{ // studio environment: dark room with soft-boxes → crisp reflections in the clearcoat
  const e = new THREE.Scene(); e.add(new THREE.Mesh(new THREE.SphereGeometry(50, 16, 8), new THREE.MeshBasicMaterial({ color: 0x08090c, side: THREE.BackSide })));
  const boxL = (w, h, x, y, z, i, c = 0xffffff) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); e.add(m); };
  boxL(26, 5, 0, 16, 0, 7); boxL(4, 14, -18, 6, 6, 5); boxL(4, 14, 18, 6, -6, 5); boxL(18, 2, 0, 4, -20, 6, 0xbfd8ff); boxL(18, 2, 0, 3, 20, 4, 0xffe2c0);
  show.environment = pmrem.fromScene(e, .02).texture; show.environmentIntensity = .9;
}
const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: .38, metalness: .8 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; show.add(floor);
const ringM = new THREE.MeshBasicMaterial({ color: 0xff2a2a }); { const r = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.68, 96), ringM); r.rotation.x = -Math.PI / 2; r.position.y = .01; show.add(r); const r2 = new THREE.Mesh(new THREE.RingGeometry(6.4, 6.43, 96), new THREE.MeshBasicMaterial({ color: 0x33363d })); r2.rotation.x = -Math.PI / 2; r2.position.y = .01; show.add(r2); }
const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(5, 9, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); key.shadow.bias = -.0004; show.add(key);
const rim = new THREE.PointLight(0xff2a2a, 22, 30); rim.position.set(-5, 2.5, -6); show.add(rim); show.add(new THREE.HemisphereLight(0x8899bb, 0x111118, .5));
let showCar = null, showSpin = .6, showVel = 0, showT = 0;
function setTeam(i, dir = 1) {
  S.team = (i + TEAMS.length) % TEAMS.length; store('team', S.team); const t = TEAMS[S.team];
  if (showCar) { show.remove(showCar.group); showCar.group.traverse(o => { if (o.material && o.material.isMeshPhysicalMaterial) o.material.dispose(); }); }
  showCar = buildCar(t); showCar.blob.visible = false; show.add(showCar.group); showT = 0; showVel = dir * 5;
  document.documentElement.style.setProperty('--ui', t.ui); ringM.color.set(t.ui); rim.color.set(t.ui);
  $('tName').textContent = t.n; $('tSub').textContent = `${t.drv.toUpperCase()} · ${t.ch}`; $('tNum').textContent = t.num;
  const st = (t.k - .965) / .07; $('stSpd').style.width = 52 + st * 46 + '%'; $('stAcc').style.width = 48 + st * 44 + '%'; $('stGrip').style.width = 56 + st * 36 + '%';
  [...$('chips').children].forEach((c, j) => c.classList.toggle('on', j === S.team));
}
TEAMS.forEach((t, i) => { const c = document.createElement('i'); c.style.background = t.ui; c.onclick = () => setTeam(i, i > S.team ? 1 : -1); $('chips').append(c); });
$('tPrev').onclick = () => setTeam(S.team - 1, -1); $('tNext').onclick = () => setTeam(S.team + 1, 1);
function setTrack(i) {
  S.track = (i + TRACKS.length) % TRACKS.length; store('track', S.track); const d = TRACKS[S.track];
  $('kName').textContent = d.name; $('kSub').textContent = `${d.sub} · ${d.km} км${d.night ? ' · ночь' : ''}`;
  const c = $('kMap'), g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
  let a = 1e9, b = -1e9, e = 1e9, f = -1e9; for (const p of d.pts) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); e = Math.min(e, p[1]); f = Math.max(f, p[1]); }
  const k = Math.min((c.width - 40) / (b - a), (c.height - 40) / (f - e)), ox = (c.width - (b - a) * k) / 2, oy = (c.height - (f - e) * k) / 2;
  g.beginPath(); d.pts.forEach((p, j) => g[j ? 'lineTo' : 'moveTo'](ox + (p[0] - a) * k, oy + (p[1] - e) * k)); g.closePath(); g.lineJoin = 'round';
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 11; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 3.5; g.stroke();
  g.fillStyle = TEAMS[S.team].ui; g.beginPath(); g.arc(ox + (d.pts[0][0] - a) * k, oy + (d.pts[0][1] - e) * k, 6, 0, 7); g.fill();
}
$('kPrev').onclick = () => setTrack(S.track - 1); $('kNext').onclick = () => setTrack(S.track + 1);
for (const [id, key2] of [['oLaps', 'laps'], ['oDiff', 'diff'], ['oAssist', 'assist']]) { const el = $(id), upd = () => [...el.children].forEach(b => b.classList.toggle('on', +b.dataset.v === S[key2])); el.onclick = e => { if (e.target.dataset.v) { S[key2] = +e.target.dataset.v; upd(); } }; upd(); }
let drag = null; canvas.addEventListener('pointerdown', e => { if (S.mode === 'menu') drag = e.clientX; }); addEventListener('pointermove', e => { if (drag !== null && S.mode === 'menu') { showVel = (e.clientX - drag) * .35; drag = e.clientX; } }); addEventListener('pointerup', () => drag = null);

/* =================== race world =================== */
const world = new THREE.Scene(); let sky = null, track = null, cars = [], me = null, prof = null, profMe = null;
const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x6a7a55, 1.1), sun = new THREE.DirectionalLight(0xfff1d8, 3.2); world.add(hemi, sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 10, far: 400 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .04;
const SUN = new THREE.Vector3(.46, .62, .34).normalize();
const VMAX = 93, ACC = 15.5, BRK = 36, aLatOf = v => Math.min(68, 23 + .0072 * v * v);
const vCorner = k => Math.sqrt(Math.min(68 / k, k > .0078 ? 23 / (k - .0072) : 1e9));

/* particles */
function Particles(max, size, additive) {
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 4), vel = new Float32Array(max * 3), life = new Float32Array(max), g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const m = new THREE.Points(g, new THREE.PointsMaterial({ size, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })); m.frustumCulled = false; let h = 0;
  return { m, emit(px, py, pz, vx, vy, vz, r, gg, b, a, l) { const i = h = (h + 1) % max; pos.set([px, py, pz], i * 3); vel.set([vx, vy, vz], i * 3); col.set([r, gg, b, a], i * 4); life[i] = l; },
    step(dt, grav, fade, fl = 0) { for (let i = 0; i < max; i++) { if (life[i] <= 0) { col[i * 4 + 3] = 0; continue; } life[i] -= dt; vel[i * 3 + 1] -= grav * dt; for (let k = 0; k < 3; k++) pos[i * 3 + k] += vel[i * 3 + k] * dt; if (grav && pos[i * 3 + 1] < fl + .03) { pos[i * 3 + 1] = fl + .03; vel[i * 3 + 1] *= -.4; } col[i * 4 + 3] *= Math.exp(-fade * dt); } g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; },
    clear() { life.fill(0); col.fill(0); } };
}
const sparks = Particles(500, .11, true), dust = Particles(260, 3.2, false); world.add(sparks.m, dust.m);

function startRace() {
  if (track) { world.remove(track.group, sky); track.dispose(); for (const c of cars) world.remove(c.m.group); }
  const def = TRACKS[S.track]; track = buildTrack(def); world.add(track.group);
  sky = skyDome(track.night); sky.material.uniforms.hor.value.copy(track.fogC); sky.material.uniforms.sun.value.copy(SUN); world.add(sky);
  { const e = new THREE.Scene(), s2 = skyDome(track.night); s2.material.uniforms.hor.value.copy(track.fogC); s2.material.uniforms.sun.value.copy(SUN); e.add(s2); const gnd = new THREE.Mesh(new THREE.CircleGeometry(2900, 24), new THREE.MeshBasicMaterial({ color: track.night ? 0x10121a : 0x4a4f48 })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -2; e.add(gnd);
    if (world.environment) world.environment.dispose(); world.environment = pmrem.fromScene(e, 0, 1, 7000).texture; world.environmentIntensity = track.night ? .9 : .8; }
  world.fog = new THREE.Fog(track.fogC, track.night ? 80 : 260, track.night ? 1500 : 2800);
  hemi.color.set(track.night ? 0xb9c4ff : 0xcfe4ff); hemi.groundColor.set(track.night ? 0x2a2c3a : 0x6a7a55); hemi.intensity = track.night ? 1.25 : 1.1;
  sun.color.set(track.night ? 0xdfe6ff : 0xfff1d8); sun.intensity = track.night ? 1.5 : 3.2;
  mFinal.uniforms.expo.value = track.night ? 1.15 : .95; mFinal.uniforms.bloom.value = track.night ? 1.25 : .7;
  // speed profiles: rivals by difficulty, player's own for the brake assist
  prof = track.profile(vCorner, 27, VMAX); profMe = track.profile(vCorner, 30, VMAX * 1.05);
  // grid: player starts mid-pack
  const order = TEAMS.map((_, i) => i).filter(i => i !== S.team).sort((a, b) => TEAMS[a].k < TEAMS[b].k ? 1 : -1), myP = [7, 5, 4][S.diff]; order.splice(myP, 0, S.team);
  const [lo, hi] = [[.78, .84], [.85, .91], [.905, .955]][S.diff];
  cars = order.map((ti, gi) => {
    const t = TEAMS[ti], s = track.gridSlots[gi], p = track.P(s.i, s.off), m = buildCar(t); world.add(m.group);
    const c = { t, ti, ai: ti !== S.team, m, x: p.x, z: p.z, y: p.y, h: Math.atan2(track.tx[s.i], track.tz[s.i]), vx: 0, vz: 0, v: 0, vl: 0, steer: 0, thr: 0, brk: 0, idx: s.i, lat: s.off, lap: 0, prog: s.i, lapT0: 0, best: 0, last: 0, fin: 0, ers: 1, boost: false, skill: lerp(hi, lo, gi / 10) * (.99 + Math.random() * .02), lane: 0, bias: (Math.random() - .5) * 1.6, roll: 0, pitch: 0, grass: false, hit: 0, gear: 1, rpm: 0, pos: gi + 1, draft: 0 };
    return c;
  });
  me = cars.find(c => !c.ai); sparks.clear(); dust.clear();
  R.t = 0; R.phase = 'intro'; R.pt = 0; R.lights = 0; R.hold = .5 + Math.random() * 1.1; R.time = 0; R.fl = 0; R.done = false; R.endT = 0; camS.h = me.h; camS.init = false;
  buildMini(); buildTower();
  $('hLapN').textContent = '/' + S.laps; $('hPosN').textContent = '/' + cars.length; $('hBest').textContent = 'BEST —'; $('hBest').className = 'mono'; $('rTrack').textContent = def.name;
  $('results').classList.add('hidden'); $('hud').classList.remove('hidden'); $('lights').classList.add('hidden'); [...$('lights').children].forEach(l => l.classList.remove('on')); $('touch').classList.toggle('hidden', !TOUCH);
  S.mode = 'race';
}
const R = { t: 0, phase: 'intro', pt: 0, lights: 0, hold: 1, time: 0, fl: 0, done: false, endT: 0 };

/* =================== physics =================== */
function locate(c) {
  const { px, pz, tx, tz, n } = track; let bi = c.idx, bd = 1e9;
  for (let j = -8; j <= 14; j++) { const i = (c.idx + j + n) % n, d = (px[i] - c.x) ** 2 + (pz[i] - c.z) ** 2; if (d < bd) { bd = d; bi = i; } }
  if (bi < n * .15 && c.idx > n * .85) { c.lap++; lapDone(c); } else if (bi > n * .85 && c.idx < n * .15) c.lap--;
  c.idx = bi; const ex = c.x - px[bi], ez = c.z - pz[bi]; c.lat = ex * tz[bi] - ez * tx[bi]; c.along = ex * tx[bi] + ez * tz[bi]; c.prog = c.lap * n + bi + c.along / track.ds;
}
function lapDone(c) {
  if (c.lap < 2) return; const t = R.time - c.lapT0; c.lapT0 = R.time; c.last = t; const pb = !c.best || t < c.best; if (pb) c.best = t;
  const fl = !R.fl || t < R.fl; if (fl) R.fl = t;
  if (c.lap > S.laps && !c.fin) { c.fin = R.time; if (c === me) finish(); }
  if (c === me) { $('hBest').textContent = 'LAST ' + fmt(t); $('hBest').className = 'mono ' + (fl ? 'fl' : pb ? 'pb' : ''); if (!c.fin) banner(c.lap === S.laps ? 'FINAL LAP' : fl ? 'FASTEST LAP' : 'LAP ' + c.lap, fl ? fmt(t) : c.lap === S.laps ? fmt(t) : '', fl && c.lap !== S.laps ? '#d56bff' : '#fff'); beep(fl ? 1320 : 880, .12); }
}
function step(c, dt) {
  const tr = track, grass = Math.abs(c.lat) > HW + 1.5; c.grass = grass;
  const grip = grass ? .5 : 1, k = c.t.k, vmax = VMAX * (.94 + k * .06) * (c.boost ? 1.09 : 1) * (1 + c.draft * .045);
  // steering → yaw
  const sp = Math.hypot(c.vx, c.vz), aLat = aLatOf(sp) * grip * (.9 + k * .1), yaw = c.steer * Math.min(aLat / Math.max(sp, 9), sp / 7) * (c.v < -.5 ? -1 : 1);
  c.h += yaw * dt; c.yaw = yaw;
  let fx = Math.sin(c.h), fz = Math.cos(c.h), vf = c.vx * fx + c.vz * fz, vl = c.vx * fz - c.vz * fx;
  // longitudinal
  const pw = Math.max(0, 1 - (vf / vmax) ** 2), acc = c.thr * Math.min(ACC * (c.boost ? 1.4 : 1) * (.9 + k * .1) * (.25 + pw * 1.25), 17) * (pw > 0 ? 1 : 0) * (grass ? .55 : 1);
  const drag = .0011 * vf * Math.abs(vf) * (1 - c.draft * .3) + Math.sign(vf) * (.5 + (grass ? 3 + Math.abs(vf) * .32 : 0));
  vf += (acc - drag) * dt;
  if (c.brk > 0) { if (vf > .4) vf = Math.max(0, vf - c.brk * BRK * grip * (1 + vf * .004) * dt); else if (!c.ai && c.thr === 0) vf = Math.max(-9, vf - 6 * dt); }
  if (vf > vmax) vf = lerp(vf, vmax, 1 - Math.exp(-2 * dt));
  vl *= Math.exp(-(grass ? 3.2 : 10.5) * dt);
  c.vx = fx * vf + fz * vl; c.vz = fz * vf - fx * vl; c.v = vf; c.vl = vl;
  c.x += c.vx * dt; c.z += c.vz * dt;
  locate(c);
  // barriers
  const i = c.idx, lim = (c.lat > 0 ? tr.offL[i] : tr.offR[i]) - 1.05, over = Math.abs(c.lat) - lim;
  if (over > 0) {
    const s = Math.sign(c.lat), nx = tr.tz[i] * s, nz = -tr.tx[i] * s, vn = c.vx * nx + c.vz * nz;
    c.x -= nx * over; c.z -= nz * over;
    if (vn > 0) { c.vx -= nx * vn * 1.25; c.vz -= nz * vn * 1.25; const loss = clamp(vn * .035, 0, .5); c.vx *= 1 - loss; c.vz *= 1 - loss; c.hit = Math.max(c.hit, Math.min(1, vn / 8)); if (vn > 1) { c.walls = (c.walls | 0) + 1; if (window.__wl) window.__wl.push(c.idx); } if (vn > 1.5) burst(c, 10 + vn * 3 | 0, -nx, -nz); }
    c.vx *= Math.exp(-.5 * dt); c.vz *= Math.exp(-.5 * dt);
    let dh = Math.atan2(tr.tx[i], tr.tz[i]) - c.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); if (Math.abs(dh) < 1.4) c.h += dh * Math.min(1, 4 * dt);
    c.lat = s * lim;
  }
  // ERS
  if (c.boost) c.ers = Math.max(0, c.ers - .2 * dt); else c.ers = Math.min(1, c.ers + (.035 + c.brk * .16) * dt);
  // gears
  const g = clamp(Math.abs(c.v) / (VMAX * 1.02) * 8, 0, 7.999); c.gear = (g | 0) + 1; c.rpm = c.v < 1 ? c.thr * .5 : .32 + .68 * (g % 1) ** .85;
}
function collide(dt) {
  for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
    const A = cars[a], B = cars[b], dx = B.x - A.x, dz = B.z - A.z; if (dx * dx + dz * dz > 34) continue;
    const fx = Math.sin(A.h), fz = Math.cos(A.h), df = dx * fx + dz * fz, dl = dx * fz - dz * fx, pf = 5.1 - Math.abs(df), pl = 1.95 - Math.abs(dl);
    if (pf <= 0 || pl <= 0) continue;
    if (pl < pf) { const s = Math.sign(dl) || 1, px = fz * s * pl * .5, pz = -fx * s * pl * .5; A.x -= px; A.z -= pz; B.x += px; B.z += pz; const rv = (B.vx - A.vx) * fz * s + (B.vz - A.vz) * -fx * s; if (rv < 0) { A.vx += fz * s * rv * .5; A.vz += -fx * s * rv * .5; B.vx -= fz * s * rv * .5; B.vz -= -fx * s * rv * .5; if (rv < -1.5) burst(A, 6, fz * s, -fx * s); } }
    else { const front = df > 0 ? B : A, back = df > 0 ? A : B, s = Math.sign(df) || 1; A.x -= fx * s * pf * .5; A.z -= fz * s * pf * .5; B.x += fx * s * pf * .5; B.z += fz * s * pf * .5; const sb = Math.hypot(back.vx, back.vz), sf = Math.hypot(front.vx, front.vz); if (sb > sf) { const k = (sf * .98 + .01) / (sb + .01); back.vx *= k; back.vz *= k; front.vx *= 1.01; front.vz *= 1.01; if (sb - sf > 4) burst(back, 8, 0, 0); if (back === me || front === me) me.hit = Math.max(me.hit, Math.min(1, (sb - sf) / 10)); } }
  }
}
function burst(c, n, nx, nz) { if (c !== me && Math.hypot(c.x - me.x, c.z - me.z) > 80) return; for (let i = 0; i < n; i++) sparks.emit(c.x - nx * 1.1 + (Math.random() - .5), c.y + .15 + Math.random() * .4, c.z - nz * 1.1 + (Math.random() - .5), c.vx * .6 + nx * 3 + (Math.random() - .5) * 8, 1 + Math.random() * 5, c.vz * .6 + nz * 3 + (Math.random() - .5) * 8, 1, .7 + Math.random() * .3, .3, 1, .4 + Math.random() * .5); }

/* =================== AI =================== */
const AIP = { l0: 13, lv: .22, g: 8, va: .12, bk: 1.5 };
function drive(c, dt, skill, pf) {
  const tr = track, n = tr.n, sp = Math.max(0, c.v), j = (c.idx + Math.round((AIP.l0 + sp * AIP.lv) / tr.ds)) % n;
  // traffic: pick a lane around the car ahead
  let want = c.bias, block = null; c.draft = 0;
  for (const o of cars) { if (o === c) continue; const d = (o.prog - c.prog) * tr.ds, dl = o.lat - c.lat; if (d > 1 && d < 26 && Math.abs(dl) < 1.6) c.draft = Math.max(c.draft, 1 - d / 26); if (d > 0 && d < 15 && Math.abs(dl) < 2.6 && o.v < c.v + 6) { if (!block || d < block.d) block = { o, d, dl }; } }
  if (block) want = block.o.lat + (block.dl > 0 ? -1 : 1) * 3 * (Math.abs(block.o.lat) > 3 ? (Math.sign(block.o.lat) === (block.dl > 0 ? -1 : 1) ? -1 : 1) : 1) - tr.line[j];
  c.lane = lerp(c.lane, clamp(want, -4.5, 4.5), 1 - Math.exp(-1.6 * dt));
  const off = clamp(tr.line[j] + c.lane, -HW + 1.5, HW - 1.5), tx = tr.px[j] + tr.tz[j] * off - c.x, tz = tr.pz[j] - tr.tx[j] * off - c.z;
  const fx = Math.sin(c.h), fz = Math.cos(c.h), ang = Math.atan2(tx * fz - tz * fx, tx * fx + tz * fz);
  c.steer = lerp(c.steer, clamp(ang * AIP.g, -1, 1), 1 - Math.exp(-14 * dt));
  let vt = pf[(c.idx + Math.round(sp * AIP.va / tr.ds)) % n] * skill; if (c.grass) vt = Math.min(vt, 30);
  if (block && block.d < 7.5 && Math.abs(block.dl) < 1.9) vt = Math.min(vt, block.o.v - 1);
  c.thr = sp < vt ? 1 : 0; c.brk = clamp((sp - vt) / AIP.bk, 0, 1); c.boost = false;
}

/* =================== input =================== */
const K = {}; let touchSteer = 0;
addEventListener('keydown', e => { if (e.repeat) return; K[e.code] = 1; if (S.mode !== 'race') { if (e.code === 'Enter' && S.mode === 'menu') go(); if (e.code === 'ArrowLeft' && S.mode === 'menu') setTeam(S.team - 1, -1); if (e.code === 'ArrowRight' && S.mode === 'menu') setTeam(S.team + 1, 1); return; } if (e.code === 'KeyC') nextCam(); if (e.code === 'KeyR') reset(); if (e.code === 'KeyM') toggleSnd(); if (e.code === 'Escape') quit(); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', e => K[e.code] = 0); addEventListener('blur', () => { for (const k in K) K[k] = 0; });
for (const [id, code] of [['kL', 'ArrowLeft'], ['kR', 'ArrowRight'], ['kG', 'KeyW'], ['kB', 'KeyS'], ['kE', 'ShiftLeft']]) { const el = $(id), on = v => e => { e.preventDefault(); K[code] = v; el.classList.toggle('on', !!v); }; el.addEventListener('pointerdown', on(1)); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, on(0)); }
function playerInput(dt) {
  const c = me, l = K.ArrowLeft || K.KeyA, r = K.ArrowRight || K.KeyD, tgt = (l ? 1 : 0) - (r ? 1 : 0), sp = Math.abs(c.v);
  const rate = tgt === 0 ? 7 : (Math.sign(tgt) !== Math.sign(c.steer) && c.steer !== 0 ? 9 : 3.6 - Math.min(1.6, sp * .018));
  c.steer = Math.abs(tgt - c.steer) < rate * dt ? tgt : c.steer + Math.sign(tgt - c.steer) * rate * dt;
  c.thr = K.ArrowUp || K.KeyW ? 1 : 0; c.brk = K.ArrowDown || K.KeyS || K.Space ? 1 : 0;
  c.boost = !!(K.ShiftLeft || K.ShiftRight) && c.ers > .02 && c.thr > 0;
  if (S.assist) { const vt = profMe[(c.idx + Math.round(sp * .1 / track.ds)) % track.n]; if (sp > vt * 1.02 + 1) { c.brk = Math.max(c.brk, clamp((sp - vt) / 7, .25, 1)); c.thr = 0; } }
  c.draft = 0; for (const o of cars) { if (o === c) continue; const d = (o.prog - c.prog) * track.ds; if (d > 1 && d < 28 && Math.abs(o.lat - c.lat) < 1.7) c.draft = Math.max(c.draft, 1 - d / 28); }
}
function reset() { if (!me || R.phase !== 'race') return; const i = me.idx, p = track.P(i, clamp(track.line[i], -3, 3)); me.x = p.x; me.z = p.z; me.h = Math.atan2(track.tx[i], track.tz[i]); me.vx = me.vz = me.v = 0; camS.init = false; }

/* =================== camera =================== */
const camS = { h: 0, init: false, shake: 0, fov: 60, pos: new THREE.Vector3(), look: new THREE.Vector3() }, v3 = new THREE.Vector3(), v3b = new THREE.Vector3();
function nextCam() { S.cam = (S.cam + 1) % 3; camS.init = false; }
function camera(dt) {
  const c = me, sn = clamp(Math.abs(c.v) / VMAX, 0, 1.15);
  let dh = c.h - camS.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); camS.h += dh * (1 - Math.exp(-(S.cam === 2 ? 30 : 6.5) * dt));
  const fx = Math.sin(camS.h), fz = Math.cos(camS.h);
  let tf = 58 + 30 * sn ** 1.6 + (c.boost ? 7 : 0);
  if (R.phase === 'intro' || R.done) {
    const a = R.done ? c.h + 2.4 + R.endT * .25 : c.h + Math.PI + 1.1 - R.pt * .42, d = R.done ? 8.5 : 7.5 - R.pt * .3;
    v3.set(c.x + Math.sin(a) * d, c.y + (R.done ? 2.2 : 1.1 + R.pt * .25), c.z + Math.cos(a) * d); v3b.set(c.x, c.y + .7, c.z); tf = R.done ? 46 : 42;
    if (!camS.init || R.phase === 'intro') { camS.pos.copy(v3); camS.look.copy(v3b); camS.init = true; } else { camS.pos.lerp(v3, 1 - Math.exp(-2 * dt)); camS.look.lerp(v3b, 1 - Math.exp(-6 * dt)); }
  } else if (S.cam === 2) { // T-cam
    const cf = Math.sin(c.h), cz = Math.cos(c.h); camS.pos.set(c.x - cf * .42, c.y + 1.2, c.z - cz * .42); camS.look.set(c.x + cf * 20, c.y + .7 + c.pitch * 20, c.z + cz * 20); tf += 14;
  } else {
    const far = S.cam === 1, dist = (far ? 10.5 : 6.4) + sn * 1.6, hgt = far ? 3.6 : 2.05;
    v3.set(c.x - fx * dist, c.y + hgt, c.z - fz * dist); v3b.set(c.x + fx * 7, c.y + 1.0, c.z + fz * 7);
    if (!camS.init) { camS.pos.copy(v3); camS.look.copy(v3b); camS.init = true; } else { const k = 1 - Math.exp(-(R.phase === 'lights' ? 2.2 : 14) * dt); camS.pos.lerp(v3, k); camS.look.lerp(v3b, 1 - Math.exp(-(R.phase === 'lights' ? 3 : 18) * dt)); }
  }
  camS.shake = lerp(camS.shake, sn ** 3 * .05 + (c.grass ? .1 * sn + .02 : 0) + c.hit * .5, 1 - Math.exp(-10 * dt)); c.hit *= Math.exp(-6 * dt);
  cam.position.copy(camS.pos); cam.position.x += (Math.random() - .5) * camS.shake; cam.position.y += (Math.random() - .5) * camS.shake;
  cam.lookAt(camS.look); if (R.phase === 'race' && !R.done) cam.rotateZ(-c.steer * .035 * sn - (S.cam === 2 ? c.roll : 0));
  camS.fov = lerp(camS.fov, tf, 1 - Math.exp(-4 * dt)); if (Math.abs(cam.fov - camS.fov) > .01) { cam.fov = camS.fov; cam.updateProjectionMatrix(); }
  mFinal.uniforms.blur.value = lerp(mFinal.uniforms.blur.value, R.phase === 'race' && !R.done ? clamp((sn - .32) * .2, 0, .15) + (c.boost ? .03 : 0) : 0, 1 - Math.exp(-5 * dt));
  // sun shadow follows the action
  sun.target.position.set(c.x, c.y, c.z); sun.position.copy(sun.target.position).addScaledVector(SUN, 160);
  if (sky) { sky.position.copy(cam.position); sky.material.uniforms.t.value = R.t; }
}

/* =================== visuals per car =================== */
function pose(c, dt) {
  const tr = track, i = c.idx, a = c.along || 0, j = (i + (a >= 0 ? 1 : tr.n - 1)) % tr.n, u = Math.min(1, Math.abs(a) / tr.ds);
  c.y = lerp(tr.py[i], tr.py[j], u) + .02;
  const slope = (tr.py[(i + 2) % tr.n] - tr.py[(i + tr.n - 2) % tr.n]) / (4 * tr.ds), fwd = Math.cos(c.h - Math.atan2(tr.tx[i], tr.tz[i]));
  const acc = (c.v - (c.pv ?? c.v)) / Math.max(dt, 1e-3); c.pv = c.v;
  c.pitch = lerp(c.pitch, slope * fwd, 1 - Math.exp(-8 * dt));
  c.roll = lerp(c.roll, clamp((c.yaw || 0) * c.v * .0011, -.05, .05), 1 - Math.exp(-8 * dt));
  const g = c.m.group; g.position.set(c.x, c.y, c.z); g.rotation.set(0, c.h, 0, 'YXZ'); g.rotation.x = -c.pitch;
  c.m.body.rotation.z = c.roll; c.m.body.rotation.x = clamp(-acc * .0009, -.025, .02); c.m.body.position.y = c.grass ? Math.sin(R.t * 60 + c.x) * .012 : 0;
  const rot = c.v / WR * dt; for (const w of c.m.wheels) w.rotation.x += rot * w.userData.dir;
  c.m.pivots[0].rotation.y = c.m.pivots[1].rotation.y = c.steer * .34;
  c.m.tail.material.color.setRGB(c.brk > 0 ? 6 : (c.boost || (R.t * 4 % 1 < .5 && c.ers < 1 && c.thr === 0) ? 2.5 : .35), 0, 0);
  // particles
  const near = c === me || (c.x - me.x) ** 2 + (c.z - me.z) ** 2 < 6400; if (!near) return;
  const fx = Math.sin(c.h), fz = Math.cos(c.h);
  if (c.v > 62 && !c.grass && Math.random() < (c.v - 60) * .012 + (c.boost ? .4 : 0)) for (let s = 0; s < 3; s++) sparks.emit(c.x - fx * (1.2 + Math.random()) + (Math.random() - .5) * .5, c.y + .08, c.z - fz * (1.2 + Math.random()) + (Math.random() - .5) * .5, c.vx * .55 + (Math.random() - .5) * 5, 1.5 + Math.random() * 3.5, c.vz * .55 + (Math.random() - .5) * 5, 1, .62 + Math.random() * .3, .22, 1, .35 + Math.random() * .45);
  if (c.grass && Math.abs(c.v) > 6 && Math.random() < .7) { const dc = track.desert ? [.8, .68, .5] : [.42, .36, .26]; dust.emit(c.x - fx * 2, c.y + .4, c.z - fz * 2, c.vx * .25 + (Math.random() - .5) * 3, 1.2 + Math.random() * 2, c.vz * .25 + (Math.random() - .5) * 3, dc[0], dc[1], dc[2], .5, 1.6); }
  else if ((c.brk > .6 && c.v > 45 || Math.abs(c.vl) > 2.6) && Math.random() < .5) dust.emit(c.x - fx * 1.6, c.y + .3, c.z - fz * 1.6, c.vx * .3, 1 + Math.random(), c.vz * .3, .85, .85, .88, .14, 1.1);
}

/* =================== HUD =================== */
const fmt = t => { const m = t / 60 | 0, s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3); };
function banner(txt, sub = '', col = '#fff') { const b = $('banner'); b.innerHTML = txt + (sub ? `<small>${sub}</small>` : ''); b.style.color = col; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
for (let i = 0; i < 15; i++) $('rpm').append(document.createElement('i'));
let rows = [], mini = null;
function buildTower() { const t = $('tower'); t.innerHTML = ''; rows = cars.map(c => { const d = document.createElement('div'); d.innerHTML = `<b></b><u style="background:${c.t.ui}"></u>${c.t.code}<em></em>`; if (c === me) d.className = 'me'; t.append(d); return { c, d, b: d.firstChild, e: d.lastChild }; }); t.style.height = cars.length * 21 + 6 + 'px'; }
function buildMini() { const [a, b, e, f] = track.bounds, k = 320 / Math.max(b - a, f - e), ox = 180 - (a + b) / 2 * k, oz = 180 - (e + f) / 2 * k, bg = document.createElement('canvas'); bg.width = bg.height = 360; const g = bg.getContext('2d'); g.beginPath(); for (let i = 0; i < track.n; i += 3) g[i ? 'lineTo' : 'moveTo'](ox + track.px[i] * k, oz + track.pz[i] * k); g.closePath(); g.lineJoin = 'round'; g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 13; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke(); mini = { k, ox, oz, bg }; }
let hudT = 0;
function hud(dt) {
  const c = me; $('hSpd').textContent = Math.round(Math.abs(c.v) * 3.6); $('gear').textContent = R.phase !== 'race' ? 'N' : c.v < -.5 ? 'R' : c.gear;
  const leds = $('rpm').children, on = Math.round(c.rpm * 15); for (let i = 0; i < 15; i++) leds[i].className = i < on ? (i < 5 ? 'g' : i < 10 ? 'r' : 'b') : '';
  $('ersBar').style.width = c.ers * 100 + '%'; $('ers').classList.toggle('on', c.boost);
  if (R.phase === 'race' && !c.fin) $('hTime').textContent = fmt(R.time - c.lapT0);
  const wrong = R.phase === 'race' && c.v > 4 && Math.sin(c.h) * track.tx[c.idx] + Math.cos(c.h) * track.tz[c.idx] < -.35; $('wrong').classList.toggle('hidden', !wrong);
  if ((hudT -= dt) > 0) return; hudT = .2;
  const ord = cars.slice().sort((a, b) => (a.fin || 1e9) - (b.fin || 1e9) || b.prog - a.prog), lead = ord[0];
  ord.forEach((o, i) => o.pos = i + 1);
  for (const r of rows) { r.d.style.top = (r.c.pos - 1) * 21 + 3 + 'px'; r.b.textContent = r.c.pos; const gap = (lead.prog - r.c.prog) * track.ds / Math.max(lead.v, 25); r.e.textContent = r.c.pos === 1 ? 'LEAD' : r.c.fin && lead.fin ? '+' + (r.c.fin - lead.fin).toFixed(1) : '+' + gap.toFixed(1); }
  $('hPos').textContent = c.pos; $('hLap').textContent = clamp(c.lap, 1, S.laps);
  const g = $('mini').getContext('2d'); g.clearRect(0, 0, 360, 360); g.drawImage(mini.bg, 0, 0);
  for (const o of ord.slice().reverse()) { g.fillStyle = o.t.ui; g.strokeStyle = o === me ? '#fff' : 'rgba(0,0,0,.6)'; g.lineWidth = o === me ? 4 : 2; g.beginPath(); g.arc(mini.ox + o.x * mini.k, mini.oz + o.z * mini.k, o === me ? 11 : 7, 0, 7); g.fill(); g.stroke(); }
}
function finish() {
  R.done = true; R.endT = 0; me.ai = true; camS.init = true;
  setTimeout(() => { if (S.mode !== 'race' || !R.done) return;
    const ord = cars.slice().sort((a, b) => (a.fin || 1e9) - (b.fin || 1e9) || b.prog - a.prog), p = ord.indexOf(me) + 1;
    $('rTitle').innerHTML = 'P' + p; $('rTitle').style.color = p === 1 ? '#ffd24a' : p <= 3 ? '#fff' : 'rgba(255,255,255,.8)';
    $('rSub').textContent = (p === 1 ? 'ПОБЕДА! ' : p <= 3 ? 'ПОДИУМ! ' : '') + `Лучший круг ${me.best ? fmt(me.best) : '—'}` + (me.best && me.best <= R.fl + 1e-6 ? ' · быстрейший в гонке' : '');
    $('rList').innerHTML = ord.map((o, i) => `<div class="${o === me ? 'me' : ''}"><b>${i + 1}</b><u style="background:${o.t.ui}"></u>${o.t.drv}<em>${i === 0 ? fmt(o.fin || R.time) : o.fin ? '+' + (o.fin - ord[0].fin).toFixed(3) : '+' + ((ord[0].prog - o.prog) * track.ds / 60).toFixed(1)}</em></div>`).join('');
    $('results').classList.remove('hidden'); $('touch').classList.add('hidden');
  }, 2600);
  banner(me.pos === 1 ? 'WINNER' : 'P' + me.pos, 'ФИНИШ', me.pos === 1 ? '#ffd24a' : '#fff'); beep(1320, .5);
}

/* =================== audio =================== */
let AC = null, AU = null;
function audioInit() {
  if (AC) { AC.resume(); return; } const A = window.AudioContext || window.webkitAudioContext; if (!A) return; AC = new A();
  const master = AC.createGain(); master.gain.value = S.snd ? .9 : 0; const comp = AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination);
  const nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = (type, f, q) => { const s = AC.createBufferSource(); s.buffer = nb; s.loop = true; const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = AC.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(master); s.start(); return { g, fl }; };
  const curve = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; curve[i] = Math.tanh(x * 3.2); }
  const engine = () => { const o = [['sawtooth', 1, .5], ['square', .5, .32], ['sawtooth', 2.02, .2], ['sawtooth', 1.5, .12]].map(([t, m, gv]) => { const os = AC.createOscillator(); os.type = t; const g = AC.createGain(); g.gain.value = gv; os.connect(g); os.start(); return { os, g, m }; }); const ws = AC.createWaveShaper(); ws.curve = curve; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.5; const out = AC.createGain(); out.gain.value = 0; o.forEach(x => x.g.connect(ws)); ws.connect(lp); lp.connect(out); out.connect(master); return { set(rpm, thr, vol) { const f = 62 + rpm * 250, t = AC.currentTime; o.forEach(x => x.os.frequency.setTargetAtTime(f * x.m, t, .03)); lp.frequency.setTargetAtTime(500 + rpm * 2600 + thr * 1800, t, .05); out.gain.setTargetAtTime(vol * (.3 + thr * .55 + rpm * .15), t, .05); } }; };
  AU = { master, me: engine(), rival: engine(), wind: noise('bandpass', 600, .6), skid: noise('bandpass', 1500, 5), rumble: noise('lowpass', 160, 1) };
}
function beep(f, d) { if (!AC || !S.snd) return; const o = AC.createOscillator(), g = AC.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.09, AC.currentTime); g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d); o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d); }
function audio() {
  if (!AU) return; const t = AC.currentTime, c = me, on = S.mode === 'race' ? 1 : 0, sn = clamp(Math.abs(c.v) / VMAX, 0, 1.1);
  AU.me.set(R.phase === 'race' ? c.rpm : .12 + (K.KeyW || K.ArrowUp ? .5 + Math.sin(R.t * 30) * .04 : 0), R.phase === 'race' ? c.thr : (K.KeyW || K.ArrowUp ? .8 : 0), .16 * on);
  let best = null, bd = 1e9; for (const o of cars) if (o !== c) { const d = Math.hypot(o.x - c.x, o.z - c.z); if (d < bd) { bd = d; best = o; } }
  if (best) { const rel = ((best.vx - c.vx) * (best.x - c.x) + (best.vz - c.vz) * (best.z - c.z)) / Math.max(bd, 1); AU.rival.set(best.rpm * (1 - clamp(rel / 340, -.2, .2)), best.thr, .13 * on * clamp(1 - bd / 70, 0, 1) ** 2); }
  AU.wind.g.gain.setTargetAtTime(sn * sn * .22 * on, t, .1); AU.wind.fl.frequency.setTargetAtTime(400 + sn * 1400, t, .1);
  AU.skid.g.gain.setTargetAtTime(on * clamp((Math.abs(c.vl) - 1.6) * .05 + (c.brk > .5 && c.v > 30 && !S.assist ? .03 : 0), 0, .14) * (c.grass ? 0 : 1), t, .05);
  AU.rumble.g.gain.setTargetAtTime(on * (c.grass ? .5 * clamp(sn * 3, 0, 1) : 0) + c.hit * .8, t, .04);
}
function toggleSnd() { S.snd = !S.snd; $('bSnd').classList.toggle('off', !S.snd); if (AU) AU.master.gain.value = S.snd ? .9 : 0; }

/* =================== flow =================== */
function go() { audioInit(); $('menu').classList.add('out'); fadeTo(() => { $('menu').classList.add('hidden'); startRace(); }); }
function quit() { fadeTo(() => { S.mode = 'menu'; $('hud').classList.add('hidden'); $('results').classList.add('hidden'); $('menu').classList.remove('hidden', 'out'); cam.fov = 34; cam.updateProjectionMatrix(); mFinal.uniforms.blur.value = 0; mFinal.uniforms.expo.value = 1; mFinal.uniforms.bloom.value = .8; }); }
let fade = { v: 1, to: 1, cb: null }; function fadeTo(cb) { fade.to = 0; fade.cb = cb; }
$('go').onclick = go; $('bQuit').onclick = quit; $('bCam').onclick = nextCam; $('bSnd').onclick = toggleSnd; $('rMenu').onclick = quit; $('rAgain').onclick = () => fadeTo(startRace);

function phys(h, racing) {
  if (racing) R.time += h;
  for (const c of cars) {
    if (!racing) { c.thr = c.brk = 0; c.steer = 0; }
    else if (c.ai) { if (c.react > 0) { c.react -= h; c.thr = 0; } else { const gapM = (c.prog - me.prog) * track.ds, band = c === me ? 1 : clamp(1 - gapM / 2500, .955, 1.03); drive(c, h, Math.min(.97, c.skill * band) * (c.fin ? .7 : 1), prof); } }
    else playerInput(h);
    if (racing) { step(c, h); if (c.grass) { c.offT = (c.offT || 0) + h; if (window.__off) window.__off[c.idx / 20 | 0] = (window.__off[c.idx / 20 | 0] || 0) + 1; } }
  }
  if (racing) collide(h);
}
function raceTick(dt) {
  R.t += dt;
  if (R.phase === 'intro') { R.pt += dt; if (R.pt > 3.2) { R.phase = 'lights'; R.pt = 0; $('lights').classList.remove('hidden'); camS.init = true; } }
  else if (R.phase === 'lights') {
    R.pt += dt; const nOn = Math.min(5, Math.floor(R.pt / .8));
    if (nOn !== R.lights) { R.lights = nOn; [...$('lights').children].forEach((l, i) => l.classList.toggle('on', i < nOn)); track.lamps.forEach((m, i) => m.color.setRGB(i < nOn ? 9 : .13, 0, 0)); beep(520, .14); }
    if (R.pt > 4 + R.hold) { R.phase = 'race'; R.time = 0; [...$('lights').children].forEach(l => l.classList.remove('on')); track.lamps.forEach(m => m.color.setRGB(.13, 0, 0)); setTimeout(() => $('lights').classList.add('hidden'), 700); beep(1040, .5); for (const c of cars) c.react = c.ai ? .12 + Math.random() * .28 : 0; }
  }
  const racing = R.phase === 'race', sub = 2, h = dt / sub;
  if (R.done) R.endT += dt;
  for (let s = 0; s < sub; s++) phys(h, racing);
  for (const c of cars) pose(c, dt);
  sparks.step(dt, 14, 2.4, me.y); dust.step(dt, 0, 1.6);
  camera(dt); hud(dt); audio();
}

/* =================== main loop =================== */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (fade.to === 0) { fade.v = Math.max(0, fade.v - dt * 3.2); if (fade.v === 0) { const cb = fade.cb; fade.cb = null; fade.to = 1; cb && cb(); } } else fade.v = Math.min(1, fade.v + dt * 2.2);
  mFinal.uniforms.fade.value = fade.v; mFinal.uniforms.time.value = now * .001 % 10;
  if (S.mode === 'menu') {
    showT += dt; showVel *= Math.exp(-2.6 * dt); showSpin += (.22 + showVel) * dt;
    if (showCar) { showCar.group.rotation.y = showSpin; const k = 1 - Math.exp(-7 * showT); showCar.group.scale.setScalar(.86 + .14 * k); showCar.group.position.y = (1 - k) * .5; for (const w of showCar.wheels) w.rotation.x += dt * 1.2 * w.userData.dir; }
    const port = innerWidth < 820, t = now * .0002; cam.fov = port ? 46 : 34;
    const asp = innerWidth / innerHeight, dz = port ? Math.max(13.5, 7.4 / asp) : Math.max(10.5, 19 / asp), sx = port ? 0 : dz * (innerHeight < 520 ? .2 : .14);
    cam.position.set(Math.sin(t) * 1.2 + sx, 2.3 + Math.sin(t * 1.7) * .25, dz); cam.aspect = asp; cam.updateProjectionMatrix(); cam.lookAt(sx, port ? .55 - dz * .14 : .55, 0);
    post(show, cam);
  } else { raceTick(dt); post(world, cam); }
}

setTeam(S.team); setTrack(S.track);
const boot = async () => { try { await Promise.race([renderer.compileAsync(show, cam), new Promise(r => setTimeout(r, 4000))]); } catch (e) {} $('loading').classList.add('out'); setTeam(S.team); requestAnimationFrame(frame); if (QS.get('auto')) { S.mode = 'race'; $('menu').classList.add('hidden'); startRace(); } };
(document.fonts && document.fonts.load ? Promise.race([document.fonts.load('italic 900 20px "Titillium Web"'), new Promise(r => setTimeout(r, 700))]) : Promise.resolve()).then(boot, boot);
window.__g = { AIP, start: startRace, solo() { cars = [me]; }, sim(sec) { for (let i = 0; i < sec * 120; i++) phys(1 / 120, true); return cars.map(c => [c.t.code, c.lap, +(c.best || 0).toFixed(2), +(c.offT || 0).toFixed(1), c.walls | 0, +c.skill.toFixed(3)]); }, S, R, get cars() { return cars; }, get me() { return me; }, get track() { return track; }, K, cam, renderer };
