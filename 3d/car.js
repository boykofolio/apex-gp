// APEX GP 3D — procedural F1 car. Local frame: +Z forward, +Y up, +X left. Units: metres.
import * as THREE from './vendor/three.module.min.js';

const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);

/* Lofted body: list of cross-sections {z, x, w, wt, y0, y1, c} → smooth closed shell */
function loft(secs) {
  const pos = [], idx = [], R = 8;
  for (const s of secs) {
    const x = s.x || 0, w = s.w / 2, wt = (s.wt ?? s.w) / 2, c = Math.min(s.c ?? .05, wt * .8, (s.y1 - s.y0) * .4);
    const ring = [[w - c, s.y0], [w, s.y0 + c], [wt, s.y1 - c], [wt - c, s.y1], [-wt + c, s.y1], [-wt, s.y1 - c], [-w, s.y0 + c], [-w + c, s.y0]];
    for (const p of ring) pos.push(x + p[0], p[1], s.z);
  }
  for (let i = 0; i < secs.length - 1; i++) for (let j = 0; j < R; j++) {
    const a = i * R + j, b = i * R + (j + 1) % R, c = a + R, d = b + R;
    idx.push(a, c, b, b, c, d);
  }
  const cap = (i, flip) => { for (let j = 1; j < R - 1; j++) flip ? idx.push(i * R, i * R + j + 1, i * R + j) : idx.push(i * R, i * R + j, i * R + j + 1); };
  cap(0, true); cap(secs.length - 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* Merge geometries (each with its own transform) into one non-indexed buffer */
function merge(parts) {
  const P = [], N = [], U = [];
  for (const { g, m } of parts) {
    const n = g.index ? g.toNonIndexed() : g.clone();
    n.applyMatrix4(m);
    if (m.determinant() < 0) { const p = n.attributes.position.array, q = n.attributes.normal.array; for (let i = 0; i < p.length; i += 9) for (const a of [p, q]) for (let k = 0; k < 3; k++) { const t = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = t; } }
    P.push(...n.attributes.position.array); N.push(...n.attributes.normal.array);
    const uv = n.attributes.uv; for (let i = 0; i < n.attributes.position.count; i++) U.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return g;
}
const mat = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
/* thin strut between two points */
function bar(a, b, t = .03, tz = .09) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
  return { g: box(L, t, tz), m: new THREE.Matrix4().compose(A.add(B).multiplyScalar(.5), q, ONE) };
}

export const AXF = 1.78, AXR = -1.66, WR = .36, TRF = .80, TRR = .78;
let GEO = null;

function buildGeo() {
  const b = { p1: [], p2: [], p3: [], k: [] };
  const add = (k, g, m = mat(0, 0, 0)) => b[k].push({ g, m });
  const both = (k, g, x, y, z, rx = 0, ry = 0, rz = 0) => { add(k, g, mat(x, y, z, rx, ry, rz)); add(k, g, mat(-x, y, z, rx, -ry, -rz)); };

  // --- monocoque + engine cover
  add('p1', loft([
    { z: -2.42, w: .22, y0: .26, y1: .40 },
    { z: -1.95, w: .36, y0: .20, y1: .52, wt: .2 },
    { z: -1.35, w: .56, y0: .14, y1: .78, wt: .16, c: .07 },
    { z: -.80, w: .66, y0: .12, y1: .98, wt: .22, c: .08 },
    { z: -.42, w: .72, y0: .12, y1: 1.04, wt: .3, c: .09 },
    { z: -.30, w: .74, y0: .12, y1: .98, wt: .36, c: .09 },
    { z: -.16, w: .74, y0: .12, y1: .63, wt: .58, c: .09 },
    { z: .62, w: .68, y0: .12, y1: .61, wt: .52, c: .1 },
    { z: 1.25, w: .52, y0: .15, y1: .54, wt: .4, c: .1 },
    { z: 1.9, w: .36, y0: .19, y1: .44, wt: .28, c: .08 },
    { z: 2.5, w: .24, y0: .18, y1: .31, wt: .2, c: .05 },
    { z: 2.86, w: .16, y0: .15, y1: .22, c: .03 },
  ]));
  // accent stripe along the nose + engine cover spine
  add('p3', loft([{ z: .64, w: .12, y0: .6, y1: .622, c: .005 }, { z: 1.9, w: .09, y0: .43, y1: .452, c: .005 }, { z: 2.84, w: .06, y0: .21, y1: .232, c: .005 }]));
  add('p3', loft([{ z: -2.3, w: .03, y0: .4, y1: .56, c: .005 }, { z: -1.5, w: .03, y0: .7, y1: .98, c: .005 }, { z: -.5, w: .03, y0: 1.0, y1: 1.06, c: .005 }]));
  // --- sidepods
  for (const s of [1, -1]) add('p1', loft([
    { z: -2.05, x: s * .30, w: .16, y0: .13, y1: .26 },
    { z: -1.35, x: s * .50, w: .42, y0: .12, y1: .44, wt: .3, c: .08 },
    { z: -.55, x: s * .62, w: .56, y0: .12, y1: .60, wt: .44, c: .1 },
    { z: .12, x: s * .64, w: .52, y0: .16, y1: .62, wt: .46, c: .1 },
    { z: .30, x: s * .64, w: .46, y0: .24, y1: .60, wt: .42, c: .08 },
  ]));
  both('k', box(.36, .22, .04), .64, .43, .31);               // intakes
  both('p2', loft([{ z: -1.6, w: .05, y0: .1, y1: .2, c: .01 }, { z: .3, w: .05, y0: .1, y1: .26, c: .01 }]), .9, 0, 0); // side skirts
  // --- floor, plank, diffuser
  add('k', box(1.62, .05, 3.5), mat(0, .095, -.45));
  add('k', box(.9, .05, 1.3), mat(0, .1, 1.5));
  add('k', box(1.1, .2, .5), mat(0, .22, -2.3, -.42));
  add('k', box(.5, .26, .2), mat(0, .66, -.05));              // cockpit hole
  add('k', box(.34, .16, .1), mat(0, .93, -.3));              // airbox inlet
  // --- front wing
  add('p2', box(1.96, .035, .5), mat(0, .11, 2.72));
  for (const s of [1, -1]) {
    add('p1', box(.72, .028, .26), mat(s * .6, .2, 2.62, -.32));
    add('p3', box(.72, .028, .2), mat(s * .6, .29, 2.48, -.5));
    add('p3', loft([{ z: 2.34, w: .03, y0: .08, y1: .36, c: .005 }, { z: 2.98, w: .03, y0: .08, y1: .16, c: .005 }]), mat(s * .985, 0, 0));
    b.k.push(bar([s * .1, .18, 2.6], [s * .1, .13, 2.62], .1, .2));
  }
  // --- rear wing
  add('p2', box(1.06, .04, .36), mat(0, .98, -2.34, .2));
  add('p3', box(1.06, .03, .22), mat(0, 1.1, -2.5, .5));
  add('p2', box(.9, .03, .2), mat(0, .5, -2.3, .25));
  for (const s of [1, -1]) add('p1', loft([{ z: -2.66, w: .03, y0: .38, y1: 1.18, c: .005 }, { z: -2.06, w: .03, y0: .3, y1: 1.06, c: .005 }]), mat(s * .545, 0, 0));
  add('k', box(.05, .5, .22), mat(0, .72, -2.26, -.2));
  // --- halo, mirrors, T-cam
  add('k', new THREE.TorusGeometry(.33, .036, 8, 18, Math.PI), mat(0, .87, -.06, Math.PI / 2, 0, 0, 1, 1.75, 1));
  b.k.push(bar([0, .6, .68], [0, .88, .51], .05, .06));
  for (const s of [1, -1]) { b.k.push(bar([s * .3, .6, .42], [s * .52, .74, .46], .02, .03)); add('p3', box(.16, .08, .05), mat(s * .58, .76, .46)); }
  add('p3', box(.07, .07, .2), mat(0, 1.09, -.42));
  // --- suspension
  for (const s of [1, -1]) {
    b.k.push(bar([s * .2, .42, AXF + .22], [s * .7, .44, AXF]), bar([s * .2, .4, AXF - .35], [s * .7, .44, AXF]), bar([s * .2, .24, AXF + .2], [s * .7, .25, AXF]), bar([s * .2, .24, AXF - .32], [s * .7, .25, AXF]), bar([s * .2, .36, AXF + .05], [s * .7, .3, AXF - .08], .02, .03));
    b.k.push(bar([s * .2, .44, AXR + .3], [s * .66, .46, AXR]), bar([s * .16, .4, AXR - .28], [s * .66, .46, AXR]), bar([s * .2, .22, AXR + .28], [s * .66, .24, AXR]), bar([s * .16, .22, AXR - .26], [s * .66, .24, AXR]));
    add('k', box(.06, .34, .5), mat(s * .62, .36, AXF)); add('k', box(.06, .34, .5), mat(s * .58, .36, AXR)); // brake ducts
  }
  // --- wheel: rounded tyre via lathe (axis X)
  const tyre = w => { const h = w / 2, r = WR, p = [[.2, -h], [r - .05, -h], [r - .012, -h + .03], [r, -h + .08], [r, h - .08], [r - .012, h - .03], [r - .05, h], [.2, h]].map(a => new THREE.Vector2(a[0], a[1])); const g = new THREE.LatheGeometry(p, 28); g.rotateZ(-Math.PI / 2); return g; };
  const disc = new THREE.CircleGeometry(WR - .05, 28);
  const wheel = w => ({ tyre: tyre(w), rimO: disc.clone().rotateY(Math.PI / 2).translate(w / 2 - .012, 0, 0), rimI: disc.clone().rotateY(-Math.PI / 2).translate(-w / 2 + .012, 0, 0) });
  return { p1: merge(b.p1), p2: merge(b.p2), p3: merge(b.p3), k: merge(b.k), wf: wheel(.36), wr: wheel(.44), helmet: new THREE.SphereGeometry(.155, 18, 14), visor: new THREE.SphereGeometry(.158, 18, 8, 0, Math.PI * 2, Math.PI * .34, Math.PI * .2), tail: box(.1, .1, .04), decal: new THREE.PlaneGeometry(.46, .3), blob: new THREE.PlaneGeometry(2.7, 6.4) };
}

function rimTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.translate(128, 128); g.fillStyle = '#0c0d0f'; g.beginPath(); g.arc(0, 0, 128, 0, 7); g.fill();
  g.strokeStyle = '#ffd21e'; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, 116, 0, 7); g.stroke();
  g.fillStyle = '#17181c'; g.beginPath(); g.arc(0, 0, 100, 0, 7); g.fill();
  g.strokeStyle = '#3d4047'; g.lineWidth = 9; for (let i = 0; i < 10; i++) { g.rotate(Math.PI / 5); g.beginPath(); g.moveTo(16, 0); g.lineTo(96, 12); g.stroke(); }
  g.fillStyle = '#8c9098'; g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fill(); g.fillStyle = '#d43'; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function numTex(n, fg, bg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 168; const g = c.getContext('2d');
  g.font = 'italic 900 150px "Titillium Web",Arial Black,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 16; g.strokeStyle = bg; g.lineJoin = 'round'; g.strokeText(n, 124, 90); g.fillStyle = fg; g.fillText(n, 124, 90);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function blobTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 64, 4, 32, 64, 60); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(.55, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.setTransform(.5, 0, 0, 1, 16, 0); g.fillStyle = gr; g.fillRect(-40, 0, 160, 128);
  return new THREE.CanvasTexture(c);
}
const lum = h => { const c = new THREE.Color(h); return c.r * .3 + c.g * .59 + c.b * .11; };
let SH = null;

export function buildCar(team) {
  GEO ||= buildGeo();
  SH ||= {
    carbon: new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: .5, metalness: .5 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: .92 }),
    rim: new THREE.MeshStandardMaterial({ map: rimTex(), roughness: .45, metalness: .5 }),
    visor: new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: .08, metalness: 1 }),
    blob: new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: .8 }),
  };
  const paint = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .34, metalness: .3, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.25 });
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const mesh = (geo, m, p = body) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; p.add(o); return o; };
  mesh(GEO.p1, paint(team.c1)); mesh(GEO.p2, paint(team.c2)); mesh(GEO.p3, paint(team.c3)); mesh(GEO.k, SH.carbon);
  mesh(GEO.helmet, paint(team.c3)).position.set(0, .73, -.02);
  const vz = mesh(GEO.visor, SH.visor); vz.position.set(0, .73, -.02); vz.rotation.x = Math.PI / 2; vz.castShadow = false;
  const tail = new THREE.Mesh(GEO.tail, new THREE.MeshBasicMaterial({ color: 0x550000 })); tail.position.set(0, .36, -2.56); body.add(tail);
  const fg = lum(team.c1) > .5 ? '#101114' : '#ffffff', nt = new THREE.MeshBasicMaterial({ map: numTex(team.num, fg, team.c1), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const s of [1, -1]) { const d = new THREE.Mesh(GEO.decal, nt); d.position.set(s * .915, .4, -.45); d.rotation.y = s * Math.PI / 2 + s * .07; body.add(d); }
  const dn = new THREE.Mesh(GEO.decal, nt); dn.scale.setScalar(.62); dn.position.set(0, .485, 1.72); dn.rotation.set(-Math.PI / 2 + .13, 0, Math.PI); body.add(dn);
  // wheels: [FL, FR, RL, RR]; steer pivots on the fronts
  const wheels = [], pivots = [];
  for (const [x, z, w] of [[TRF, AXF, GEO.wf], [-TRF, AXF, GEO.wf], [TRR, AXR, GEO.wr], [-TRR, AXR, GEO.wr]]) {
    const piv = new THREE.Group(); piv.position.set(x, WR, z); g.add(piv);
    const wh = new THREE.Group(); if (x < 0) wh.rotation.y = Math.PI; piv.add(wh);
    const spin = new THREE.Group(); wh.add(spin);
    mesh(w.tyre, SH.tyre, spin); mesh(w.rimO, SH.rim, spin).castShadow = false; mesh(w.rimI, SH.rim, spin).castShadow = false;
    spin.userData.dir = x < 0 ? -1 : 1; wheels.push(spin); pivots.push(piv);
  }
  const blob = new THREE.Mesh(GEO.blob, SH.blob); blob.rotation.x = -Math.PI / 2; blob.position.y = .03; blob.renderOrder = 2; g.add(blob);
  return { group: g, body, wheels, pivots, tail, blob };
}
