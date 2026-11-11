'use strict';
/* =====================================================================
   APEX GP · friends' rating
   No server of our own: results are small signed messages kept on public
   Nostr relays, with retained MQTT messages as a second copy. Every player
   caches them and re-sends what a relay has lost, so the table heals itself.
   A player is a key pair in this browser; the nick is whatever that key
   said last. Loaded before game.js; nothing runs until the game calls it.
   ===================================================================== */
window.RT = (() => {
  const TAG = 'apexgp-rating-v1', KIND = 30078, MQ = 'apexgp/rt1/', PAGE = 10, F1 = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net', 'wss://offchain.pub', 'wss://relay.snort.social', 'wss://nostr.mom'];
  const MQTTS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker-cn.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];

  /* ---------- BIP-340 signatures on secp256k1 ---------- */
  const P = 2n ** 256n - 2n ** 32n - 977n, N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const GP = [0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n, 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n, 1n];
  const md = (a, m = P) => { a %= m; return a < 0n ? a + m : a; };
  const inv = (a, m = P) => { let [x, y, u, v] = [md(a, m), m, 1n, 0n]; while (x > 1n) { const q = y / x; [x, y] = [y % x, x]; [u, v] = [v - q * u, u]; } return md(u, m); };
  const pw = (b, e) => { let r = 1n; b = md(b); while (e > 0n) { if (e & 1n) r = md(r * b); b = md(b * b); e >>= 1n; } return r; };
  const dbl = p => { const [X, Y, Z] = p; if (!Y) return [0n, 1n, 0n]; const S = md(4n * X * Y * Y), M = md(3n * X * X), X3 = md(M * M - 2n * S), Y2 = md(Y * Y); return [X3, md(M * (S - X3) - 8n * Y2 * Y2), md(2n * Y * Z)]; };
  const add = (p, q) => { if (!p[2]) return q; if (!q[2]) return p; const Z1 = md(p[2] * p[2]), Z2 = md(q[2] * q[2]), U1 = md(p[0] * Z2), U2 = md(q[0] * Z1), S1 = md(p[1] * Z2 * q[2]), S2 = md(q[1] * Z1 * p[2]); if (U1 === U2) return S1 === S2 ? dbl(p) : [0n, 1n, 0n]; const H = md(U2 - U1), R = md(S2 - S1), H2 = md(H * H), H3 = md(H2 * H), V = md(U1 * H2), X3 = md(R * R - H3 - 2n * V); return [X3, md(R * (V - X3) - S1 * H3), md(H * p[2] * q[2])]; };
  const mul = (k, p) => { let r = [0n, 1n, 0n], a = p; while (k > 0n) { if (k & 1n) r = add(r, a); a = dbl(a); k >>= 1n; } return r; };
  const aff = p => { const z = inv(p[2]), z2 = md(z * z); return [md(p[0] * z2), md(p[1] * z2 * z)]; };
  const h2b = h => Uint8Array.from(h.match(/../g).map(x => parseInt(x, 16))), b2h = b => [...b].map(x => x.toString(16).padStart(2, '0')).join(''), n2h = n => n.toString(16).padStart(64, '0'), b2n = b => BigInt('0x' + b2h(b));
  const cat = (...a) => { const o = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
  const sha = async b => new Uint8Array(await crypto.subtle.digest('SHA-256', b));
  const tagged = async (t, ...m) => { const h = await sha(new TextEncoder().encode(t)); return sha(cat(h, h, ...m)); };
  async function schnorr(msg, priv, aux) {
    const d0 = b2n(priv), [px, py] = aff(mul(d0, GP)), d = py & 1n ? N - d0 : d0, pb = h2b(n2h(px)), t = h2b(n2h(d ^ b2n(await tagged('BIP0340/aux', aux))));
    const k0 = md(b2n(await tagged('BIP0340/nonce', t, pb, msg)), N), [rx, ry] = aff(mul(k0, GP)), k = ry & 1n ? N - k0 : k0, rb = h2b(n2h(rx)), e = md(b2n(await tagged('BIP0340/challenge', rb, pb, msg)), N);
    return b2h(rb) + n2h(md(k + e * d, N));
  }
  async function verify(msg, pub, sig) {
    const px = BigInt('0x' + pub), r = BigInt('0x' + sig.slice(0, 64)), s = BigInt('0x' + sig.slice(64)); if (px >= P || r >= P || s >= N) return false;
    const c = md(px * px * px + 7n); let y = pw(c, (P + 1n) / 4n); if (md(y * y) !== c) return false; if (y & 1n) y = P - y;
    const e = md(b2n(await tagged('BIP0340/challenge', h2b(sig.slice(0, 64)), h2b(pub), msg)), N), R = add(mul(s, GP), mul(N - e, [px, y, 1n])); if (!R[2]) return false; const [x2, y2] = aff(R); return !(y2 & 1n) && x2 === r;
  }
  const evHash = e => sha(new TextEncoder().encode(JSON.stringify([0, e.pubkey, e.created_at, e.kind, e.tags, e.content])));

  /* ---------- identity ---------- */
  const rnd = n => crypto.getRandomValues(new Uint8Array(n));
  let priv = null, pub = ''; const dev = () => (typeof isDesk !== 'undefined' && isDesk) ? 'p' : 'm';
  (() => { let h = null; try { h = localStorage.getItem('apexgp-key'); } catch (e) {}
    if (!/^[0-9a-f]{64}$/.test(h || '')) { do { h = b2h(rnd(32)); } while (BigInt('0x' + h) >= N || !BigInt('0x' + h)); try { localStorage.setItem('apexgp-key', h); } catch (e) {} }
    priv = h2b(h); pub = n2h(aff(mul(b2n(priv), GP))[0]); })();

  /* ---------- the store ---------- */
  const store = new Map(); let saveT = 0, drawT = 0;
  try { for (const e of JSON.parse(localStorage.getItem('apexgp-rt') || '[]')) store.set(e.id, e); } catch (e) {}
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem('apexgp-rt', JSON.stringify([...store.values()].sort((a, b) => b.created_at - a.created_at).slice(0, 1500))); } catch (e) {} }, 400); };
  const redraw = () => { clearTimeout(drawT); drawT = setTimeout(() => { if (!document.getElementById('rating').classList.contains('hidden')) draw(); }, 150); };
  const dTag = e => (e.tags.find(t => t[0] === 'd') || [])[1];
  const hexOk = (s, n) => typeof s === 'string' && s.length === n && /^[0-9a-f]+$/.test(s);
  const checking = new Set();
  async function accept(e) { // anything from the network is checked before it counts
    try { if (!e || !hexOk(e.id, 64) || store.has(e.id) || checking.has(e.id) || !hexOk(e.pubkey, 64) || !hexOk(e.sig, 128) || e.kind !== KIND || !Array.isArray(e.tags) || !e.tags.some(t => t[0] === 't' && t[1] === TAG) || typeof e.content !== 'string' || e.content.length > 4000 || !(e.created_at <= Date.now() / 1000 + 600)) return;
      checking.add(e.id); const h = await evHash(e); if (b2h(h) === e.id && await verify(h, e.pubkey, e.sig)) { store.set(e.id, e); save(); redraw(); } } catch (x) {} finally { if (e) checking.delete(e.id); }
  }
  async function make(d, body) {
    const e = { pubkey: pub, created_at: Math.floor(Date.now() / 1000), kind: KIND, tags: [['d', d], ['t', TAG]], content: JSON.stringify(body) }, h = await evHash(e);
    e.id = b2h(h); e.sig = await schnorr(h, priv, rnd(32)); store.set(e.id, e); save(); redraw(); return e;
  }

  /* ---------- sync: fetch everything, give back what a server is missing ---------- */
  let busy = false, again = false, lastOk = 0, lastTry = 0;
  const newest = n => [...store.values()].sort((a, b) => b.created_at - a.created_at).slice(0, n);
  function relay(url) { return new Promise(done => { let w, seen = new Set(), got = false; const fin = () => { clearTimeout(to); try { w && w.close(); } catch (e) {} done(got); }, to = setTimeout(fin, 8000);
    try { w = new WebSocket(url); } catch (e) { return fin(); }
    w.onopen = () => w.send(JSON.stringify(['REQ', 'r', { kinds: [KIND], '#t': [TAG], limit: 1500 }]));
    w.onerror = fin;
    w.onmessage = m => { let d; try { d = JSON.parse(m.data); } catch (e) { return; }
      if (d[0] === 'EVENT' && d[2]) { seen.add(d[2].id); accept(d[2]); }
      else if (d[0] === 'EOSE') { got = true; const miss = newest(60).filter(e => !seen.has(e.id)); miss.forEach(e => w.send(JSON.stringify(['EVENT', e]))); clearTimeout(to); setTimeout(fin, miss.length ? 2500 : 0); } }; }); }
  function mqtt(url) { return new Promise(done => { let up = false; const L = mqttLink(url, MQ + '#', e => accept(e), l => { up = true; newest(40).forEach(e => l.pub(MQ + e.id, e, true)); }); setTimeout(() => { L.close(); done(up); }, 7000); }); }
  async function sync() {
    if (busy) { again = true; return; } busy = true; lastTry = Date.now(); status();
    const r = await Promise.all([...RELAYS.map(relay), ...MQTTS.map(mqtt)]); busy = false; if (r.some(Boolean)) lastOk = Date.now(); status(); redraw();
    if (again) { again = false; sync(); }
  }

  /* ---------- writing ---------- */
  let lastNick = null; try { lastNick = localStorage.getItem('apexgp-nick'); } catch (e) {}
  async function setNick(n) { n = String(n || '').trim().slice(0, 12); if (!n || n === lastNick) return; lastNick = n; try { localStorage.setItem('apexgp-nick', n); } catch (e) {} await make('nick', { n }); sync(); }
  async function publishRace(r) { const e = await make('race-' + b2h(rnd(8)), r); sync(); return e; }

  /* ---------- reading ---------- */
  function data() {
    const nick = new Map(), races = [], setN = (k, n, at) => { const c = nick.get(k); if (!c || at >= c.at) nick.set(k, { n, at }); };
    for (const e of store.values()) { let b; try { b = JSON.parse(e.content); } catch (x) { continue; } const d = dTag(e);
      if (d === 'nick') { if (typeof b.n === 'string') setN(e.pubkey, b.n.slice(0, 12), e.created_at + 1e10); } // a player's own word beats any result row
      else if (d && d.startsWith('race-') && Array.isArray(b.res)) { const rows = b.res.filter(x => x && hexOk(x.k, 64)).slice(0, 11); if (new Set(rows.map(x => x.k)).size < 2 || new Set(rows.map(x => x.k)).size !== rows.length) continue; rows.sort((x, y) => x.p - y.p); rows.forEach((x, i) => { x.p = i + 1; setN(x.k, String(x.n || 'Player').slice(0, 12), e.created_at); }); races.push({ at: e.created_at, tr: String(b.tr || ''), laps: b.laps | 0, rows }); } }
    races.sort((a, b) => b.at - a.at); return { nick, races };
  }
  function table(d, kind) { const m = new Map();
    for (const r of d.races) for (const x of r.rows) { if ((x.d === 'm' ? 'm' : 'p') !== kind) continue; let s = m.get(x.k); if (!s) m.set(x.k, s = { k: x.k, pts: 0, w: 0, n: 0, km: 0 }); s.pts += F1[x.p - 1] || 0; s.n++; if (x.p === 1) s.w++; s.km += Math.max(0, Math.min(500, +x.km || 0)); }
    return [...m.values()].sort((a, b) => b.pts - a.pts || b.w - a.w || a.n - b.n); }

  /* ---------- screen ---------- */
  let tab = 'p', page = 0;
  function status() { const e = document.getElementById('rtStatus'); if (!e) return; const n = data().races.length; e.textContent = busy ? 'Обновляем…' : lastOk ? 'Гонок в зачёте: ' + n + ' · считаются только гонки с друзьями' : lastTry ? 'Нет связи с серверами, показываем сохранённое · гонок: ' + n : ''; }
  function draw() {
    const d = data(), name = k => esc((d.nick.get(k) || {}).n || 'Player'), tb = $('#rtTable'); let pages = 1, html = '';
    $$('#rtTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    if (tab === 'h') { pages = Math.max(1, Math.ceil(d.races.length / PAGE)); page = clamp(page, 0, pages - 1);
      html = '<tr class="hd"><td>ДАТА</td><td>ТРАССА</td><td>ПОБЕДИТЕЛЬ</td><td class="t">ПИЛОТОВ</td></tr>' + d.races.slice(page * PAGE, page * PAGE + PAGE).map(r => { const dt = new Date(r.at * 1000), w = r.rows[0]; return `<tr class="${r.rows.some(x => x.k === pub) ? 'me' : ''}"><td>${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}</td><td>${esc(r.tr)}</td><td>${name(w.k)}</td><td class="t">${r.rows.length}</td></tr>`; }).join('') || '<tr><td colspan="4" class="t">Пока нет гонок</td></tr>'; }
    else { const t = table(d, tab); pages = Math.max(1, Math.ceil(t.length / PAGE)); page = clamp(page, 0, pages - 1);
      const row = (s, i) => `<tr class="${s.k === pub ? 'me' : ''}"><td>${i + 1}</td><td>${name(s.k)}</td><td class="t">${s.pts}</td><td class="t">${s.w}</td><td class="t">${s.n}</td><td class="t">${Math.round(s.km)}</td></tr>`;
      html = '<tr class="hd"><td></td><td>ПИЛОТ</td><td class="t">ОЧКИ</td><td class="t">ПОБЕДЫ</td><td class="t">ГОНКИ</td><td class="t">КМ</td></tr>' + t.slice(page * PAGE, page * PAGE + PAGE).map((s, i) => row(s, page * PAGE + i)).join('') || '';
      const mi = t.findIndex(s => s.k === pub); if (mi >= 0 && (mi < page * PAGE || mi >= page * PAGE + PAGE)) html += row(t[mi], mi);
      if (!t.length) html += '<tr><td colspan="6" class="t">Пока никого: сыграйте гонку с друзьями</td></tr>'; }
    tb.innerHTML = html; $('#rtPage').textContent = (page + 1) + ' / ' + pages; $('#rtPrev').disabled = page <= 0; $('#rtNext').disabled = page >= pages - 1; status(); fitUI();
  }
  function open() { tab = dev(); page = 0; $('#rtNick').value = S.name || ''; show('rating'); draw(); sync(); }
  function ui() {
    $('#rtBack').onclick = () => show('menu');
    $('#rtTabs').onclick = e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; page = 0; draw(); } };
    $('#rtPrev').onclick = () => { page--; draw(); }; $('#rtNext').onclick = () => { page++; draw(); };
    const save1 = () => { const v = $('#rtNick').value.trim().slice(0, 12); if (!v || v === S.name) return; S.name = v; saveS(); setNick(v); toast('Ник сохранён: ' + v); };
    $('#rtNick').addEventListener('change', save1); $('#rtNick').addEventListener('blur', save1);
    setTimeout(sync, 5000);
  }
  return { ui, open, sync, setNick, publishRace, accept, get pub() { return pub; }, get dev() { return dev(); }, _schnorr: schnorr, _verify: verify, _h2b: h2b, _data: data, _table: table, _make: make, get _store() { return store; } };
})();
