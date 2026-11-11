'use strict';
/* =====================================================================
   APEX GP · race replay
   Records every car during the race, spots the player's overtakes, and
   after the flag plays the finish and the best passes in slow motion
   behind the results. The race itself keeps running underneath.
   Loaded before game.js; nothing here runs until the game calls it.
   ===================================================================== */
window.RP = (() => {
  const HZ = 20, ST = 6, MAXF = 24000, SLOW = .4;
  let frames = [], acc = 0, clock = 0, side = null, pend = [], moves = [], finT = -1, on = false, clips = [], ci = 0, pt = 0, view = null, cutNow = false;

  function reset() { frames = []; acc = 0; clock = 0; side = null; pend = []; moves = []; finT = -1; stop(); }
  function stop() { on = false; view = null; clips = []; const t = document.getElementById('rpTag'); if (t) t.classList.add('hidden'); }

  function watch(me) { // who did I just pass?
    if (finT < 0 && me.fin) finT = clock;
    if (me.fin || me.inPit || me.pitS || G.t < 3) { side = null; pend = []; return; }
    const prev = side; side = G.cars.map(o => me.prog > o.prog ? 1 : -1);
    if (prev) G.cars.forEach((o, i) => { if (o === me || !(prev[i] === -1 && side[i] === 1)) return;
      if (o.inPit || o.pitS || o.fin || o.vF < 140 || me.vF < 220 || Math.abs(me.prog - o.prog) > 30) return;
      const T = G.track, n = G.cars.length, pos = G.cars.filter(q => q.prog > me.prog).length;
      pend.push({ t: clock, i, due: clock + 1.6, score: Math.min(1, Math.abs(T.k[me.idx]) * 260) * 2 + (1 - Math.min(1, Math.abs(me.d - o.d) / 160)) + me.vF / VMAX + (1 - pos / n) }); });
    pend = pend.filter(q => { if (clock < q.due) return true; if (me.prog > G.cars[q.i].prog) moves.push(q); return false; }); // it only counts if it sticks
  }
  function rec(dt) {
    if (on || G.mode !== 'race' || G.sess !== 'race' || G.phase !== 'race') return;
    clock += dt; acc += dt; if (acc < 1 / HZ) return; acc %= 1 / HZ;
    const n = G.cars.length, f = new Float32Array(1 + n * ST); f[0] = clock;
    for (let i = 0; i < n; i++) { const c = G.cars[i], o = 1 + i * ST; f[o] = c.x; f[o + 1] = c.y; f[o + 2] = c.h; f[o + 3] = c.vF; f[o + 4] = (c.surf || 0) | (c.bst ? 4 : 0) | (c.brk > .3 ? 8 : 0) | (c.pitS ? 16 : 0) | (c.inPit ? 32 : 0); f[o + 5] = c.slide || 0; }
    frames.push(f); if (frames.length > MAXF) frames.shift();
    const me = G.cars[G.me]; if (me) watch(me);
  }
  function start() {
    const me = G.cars[G.me]; if (on || frames.length < 20 || !me || G.sess !== 'race') return;
    const t0 = frames[0][0], end = frames[frames.length - 1][0], tf = finT >= 0 ? finT : end - 1.5, list = [];
    for (const m of moves.slice().sort((a, b) => b.score - a.score)) { if (list.length >= 3) break; if (m.t < tf - 5 && !list.some(p => Math.abs(p.t - m.t) < 7)) list.push(m); }
    list.sort((a, b) => a.t - b.t);
    clips = [{ a: Math.max(t0, tf - 3.6), b: Math.min(end, tf + 1.4), label: 'ФИНИШ' }, ...list.map(m => { const o = G.cars[m.i]; return { a: Math.max(t0, m.t - 2.4), b: Math.min(end, m.t + 1.7), label: 'ОБГОН · ' + (o.human ? o.name : TEAMS[o.team].code) }; })];
    view = G.cars.map(c => Object.assign({}, c, { ai: null, wl: null, human: c.human, fin: true, rx: c.x, ry: c.y, rh: c.h, pitSv: 0, crA: 0, crO: 0 }));
    on = true; ci = 0; pt = clips[0].a; cutNow = true; label();
  }
  function label() { const t = document.getElementById('rpTag'); if (!t) return; t.textContent = 'ПОВТОР · ' + clips[ci].label + (clips.length > 1 ? ' · ' + (ci + 1) + '/' + clips.length : ''); t.classList.remove('hidden'); }
  function pose(t) {
    let lo = 0, hi = frames.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (frames[m][0] <= t) lo = m; else hi = m; }
    const A = frames[lo], B = frames[hi], k = B[0] > A[0] ? clamp((t - A[0]) / (B[0] - A[0]), 0, 1) : 0;
    view.forEach((c, i) => { const o = 1 + i * ST; if (o + ST > A.length) return;
      c.x = lerp(A[o], B[o], k); c.y = lerp(A[o + 1], B[o + 1], k); c.h = A[o + 2] + wrapA(B[o + 2] - A[o + 2]) * k; c.vF = lerp(A[o + 3], B[o + 3], k);
      const fl = A[o + 4] | 0; c.surf = fl & 3; c.bst = !!(fl & 4); c.brk = fl & 8 ? 1 : 0; c.pitS = fl & 16 ? 1 : 0; c.inPit = !!(fl & 32); c.slide = A[o + 5];
      c.vx = Math.sin(c.h) * c.vF; c.vy = -Math.cos(c.h) * c.vF; c.vL = 0; c.thr = c.brk ? 0 : 1; c.rx = c.x; c.ry = c.y; c.rh = c.h; });
  }
  function draw(dt) {
    pt += dt * SLOW; if (pt >= clips[ci].b) { ci = (ci + 1) % clips.length; pt = clips[ci].a; cutNow = true; label(); }
    pose(pt);
    const real = G.cars, rf = G.follow; G.cars = view; G.follow = G.me;
    try {
      if (cutNow) { const c = view[G.me]; cam.x = c.x; cam.y = c.y; cam.lx = cam.ly = 0; for (const q of view) q.wl = null; cutNow = false; }
      FX.effects(dt * SLOW); camera(dt);
      const p = document.querySelector('#results .menu-body').getBoundingClientRect(); // keep the action in the free part of the screen
      if (innerHeight > innerWidth) cam.y += (innerHeight - p.top) / 2 / cam.z; else cam.x += (innerWidth - p.left) / 2 / cam.z;
      FX.render(dt);
    } finally { G.cars = real; G.follow = rf; }
  }
  return { reset, stop, rec, start, draw, get on() { return on; }, get moves() { return moves; }, get frames() { return frames.length; } };
})();
