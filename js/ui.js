// ---------- Données ----------
let DB = {}, CH = {}, VER = DATA.v, LIVE = false;
function indexData() { DB = {}; CH = {}; DATA.i.forEach(i => DB[i.id] = i); DATA.c.forEach(c => CH[c[0]] = c); }
indexData();

async function refreshLive() {
  try {
    const base = 'https://ddragon.leagueoflegends.com';
    const vs = await (await fetch(base + '/api/versions.json')).json();
    const v = vs[0];
    const [cj, ij] = await Promise.all([
      fetch(`${base}/cdn/${v}/data/fr_FR/champion.json`).then(r => r.json()),
      fetch(`${base}/cdn/${v}/data/fr_FR/item.json`).then(r => r.json())]);
    const d = parseDDragon(cj, ij);
    if (d.c.length < 100 || d.i.length < 50) return;
    DATA.v = d.v; DATA.c = d.c; DATA.i = d.i; VER = d.v; LIVE = true; indexData();
    if (!state.patchSet) state.patch = defaultPatch();
    renderStatic(); render();
  } catch (e) { /* hors ligne ou bloqué : on garde la copie intégrée */ }
}
function defaultPatch() { const p = VER.split('.'); return (+p[0] > 16 || (+p[0] === 16 && +p[1] >= 23)) ? '16.23' : '16.22'; }

// ---------- État ----------
const ORDER = ['Q', 'E', 'W', 'Q', 'Q', 'R', 'Q', 'E', 'Q', 'E', 'R', 'E', 'E', 'W', 'W', 'R', 'W', 'W'];
const rankAt = (k, l) => Math.max(1, ORDER.slice(0, l).filter(x => x === k).length);
const PRESETS = [
  ['Poke', ['Q']],
  ['Poke + auto', ['Q', 'A']],
  ['Trade court', ['E', 'Q', 'A']],
  ['Trade au corps à corps', ['E', 'A', 'W', 'A']],
  ['Trade', ['E', 'Q', 'A', 'A']],
  ['Trade avec reset', ['E', 'Q', 'A', 'W', 'A']],
  ['Trade long', ['E', 'Q', 'A', 'A', 'A']],
  ['Sans le Q (gardé pour esquiver)', ['E', 'A', 'W', 'A', 'A', 'A']],
  ['Trade long avec reset', ['E', 'Q', 'A', 'W', 'A', 'A']],
  ['All-in', ['E', 'Q', 'A', 'W', 'A', 'A', 'A', 'A']]
];
const minLevel = seq => new Set(seq.filter(a => a !== 'A')).size;   // un sort appris par niveau
const KEY = 'wuju-calc-v2';
let state = {
  tab: 'game', patch: defaultPatch(), patchSet: false, recents: ['Syndra', 'Zed', 'Ahri', 'Yasuo', 'Viktor'],
  yi: { level: 5, qRank: 3, eRank: 1, items: ['1036', '1036'], shards: 2, rune: 'none', r: false, ignite: false, qIso: true, dsStacks: 0 },
  tg: { id: 'Syndra', level: 5, items: ['1056'], hpPct: 60, bone: false, shield: 0, extraHp: 0, extraArmor: 0 },
  seq: ['E', 'Q', 'A', 'A', 'A']
};
try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.yi && s.tg && CH[s.tg.id]) {
    state = Object.assign({}, state, s, { yi: Object.assign({}, state.yi, s.yi), tg: Object.assign({}, state.tg, s.tg) });
    if (!Array.isArray(state.seq)) state.seq = [];
    state.seq = state.seq.filter(a => 'AQWE'.includes(a));
  } } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const r0 = x => Math.round(x);
const cimg = id => `https://ddragon.leagueoflegends.com/cdn/${VER}/img/champion/${id}.png`;
const iimg = id => `https://ddragon.leagueoflegends.com/cdn/${VER}/img/item/${id}.png`;
const IMG = src => `<img src="${src}" alt="" loading="lazy" onerror="this.style.display='none'">`;
const keys = seq => seq.map(a => `<span class="k ${a}">${a === 'A' ? 'Auto' : a}</span>`).join('');

const YI_QUICK = ['1036', '1055', '1037', '1038', '1042', '1043', '3006'];
const TG_QUICK = ['1056', '1054', '1055', '1029', '1028', '1082', '3047'];
function cfg() { return Object.assign({ patch: state.patch }, state.yi); }

// ---------- Parties fixes ----------
function champBtn(c) { return `<button class="chip${c[0] === state.tg.id ? ' on' : ''}" data-champ="${esc(c[0])}">${IMG(cimg(c[0]))}${esc(c[1])}</button>`; }
function renderChamps() {
  const q = norm($('csearch').value.trim());
  $('champs').innerHTML = DATA.c.filter(c => c[0] !== 'MasterYi' && (!q || norm(c[1]).includes(q) || norm(c[0]).includes(q))).map(champBtn).join('');
  $('recents').innerHTML = state.recents.filter(id => CH[id]).map(id => champBtn(CH[id])).join('');
}
function itemBtn(id) { const it = DB[id]; return it ? `<button class="chip" data-item="${id}" title="${it.g} PO">${IMG(iimg(id))}${esc(it.n)}</button>` : ''; }
function renderPicker(side) {
  const st = state[side], useful = side === 'yi' ? ['ad', 'as', 'cr', 'le', 'pe', 'oh'] : ['hp', 'ar', 'mr'];
  $(side + 'Quick').innerHTML = (side === 'yi' ? YI_QUICK : TG_QUICK).map(itemBtn).join('');
  $(side + 'Items').innerHTML = st.items.map((id, i) => DB[id] ? `<button class="chip on" data-rm="${i}" aria-label="Retirer ${esc(DB[id].n)}">${IMG(iimg(id))}${esc(DB[id].n)} <span class="x">×</span></button>` : '').join('');
  const q = norm($(side + 'Search').value.trim());
  $(side + 'Results').innerHTML = q.length < 2 ? '' : DATA.i.filter(i => norm(i.n).includes(q) && useful.some(k => i[k])).slice(0, 10).map(i => itemBtn(i.id)).join('');
}
function buildPresets() {       // lignes créées une seule fois, pour que les barres s'animent
  $('presets').innerHTML = PRESETS.map(([name], i) => `<button class="combo" data-preset="${i}" style="--i:${i}">
    <span><span class="name">${esc(name)}</span><span class="keys"></span></span><span class="res"></span>
    <span class="bar"><i class="p"></i><i class="m"></i><i class="t"></i></span>
    <span class="meta"></span></button>`).join('');
}
function renderStatic() { renderChamps(); renderPicker('yi'); renderPicker('tg'); }
function setTab(t) {
  state.tab = t;
  for (const k of ['game', 'labo']) { $('panel-' + k).classList.toggle('on', k === t); $('tab-' + k).setAttribute('aria-selected', String(k === t)); }
  const b = $('tab-' + t); $('ink').style.left = b.offsetLeft + 'px'; $('ink').style.width = b.offsetWidth + 'px';
}

// ---------- Résultats ----------
function seg(id, val) { $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(val)))); }
function parts(s) {
  const a = [];
  if (s.phys > 0.5) a.push(`<span class="p">${r0(s.phys)}</span>`);
  if (s.magic > 0.5) a.push(`<span class="m">${r0(s.magic)}</span>`);
  if (s.tru > 0.5) a.push(`<span class="t">${r0(s.tru)}</span>`);
  return a.join(' + ') || '—';
}
let lastVerdict = '';
function render() {
  const champ = CH[state.tg.id] || DATA.c[0];
  const c = cfg(), t = state.tg;
  const R = simulate(c, t, state.seq, DB, champ);
  const hpNow = R.hpMax * t.hpPct / 100;

  // contrôles
  $('tgLevel').textContent = t.level; $('yiLevel').textContent = state.yi.level;
  $('qRank').textContent = state.yi.qRank; $('eRank').textContent = state.yi.eRank;
  $('hpPct').value = t.hpPct; $('bone').checked = t.bone;
  $('hpVal').innerHTML = `${r0(hpNow)} <small>/ ${r0(R.hpMax)} PV</small>`;
  if (document.activeElement !== $('hpAbs')) $('hpAbs').value = r0(hpNow);
  for (const k of ['shield', 'extraHp', 'extraArmor']) if (document.activeElement !== $(k)) $(k).value = t[k] || '';
  $('rune').value = state.yi.rune; $('ignite').checked = state.yi.ignite; $('r').checked = state.yi.r; $('qIso').checked = state.yi.qIso;
  seg('patch', state.patch); seg('shards', state.yi.shards); seg('ds', state.yi.dsStacks);
  $('dataver').textContent = `Données Riot ${VER} · ${LIVE ? 'à jour' : 'copie intégrée'} · Q à ${YI.qRatio[state.patch] * 100} % AD`;

  // combos de base
  let best = -1, top = null;
  const rows = $('presets').children;
  PRESETS.forEach(([name, seq], i) => {
    const r = simulate(c, t, seq, DB, champ), el = rows[i], locked = state.yi.level < minLevel(seq), dead = !locked && r.hpLeft <= 0;
    if (dead && best < 0) best = i;
    if (!locked && (!top || r.total > top.total)) top = r;
    el.classList.toggle('kill', dead); el.classList.toggle('locked', locked);
    el.querySelector('.keys').innerHTML = keys(seq) + (c.ignite ? '<span class="k I">Embr.</span>' : '');
    el.querySelector('.res').innerHTML = locked ? `<small>À partir du niveau ${minLevel(seq)}</small>` : dead ? `Mort<small>${r0(-r.hpLeft)} PV de marge</small>` : `<span class="num">${r0(r.total)}</span><small>reste ${r0(r.hpLeft)} PV</small>`;
    const sc = Math.min(1, r.startHp / r.total), w = x => (100 * x * sc / r.startHp).toFixed(2) + '%';
    el.querySelector('.p').style.width = w(r.tot.phys); el.querySelector('.m').style.width = w(r.tot.magic); el.querySelector('.t').style.width = w(r.tot.tru);
    el.querySelector('.meta').innerHTML = `<span class="best-tag">Le plus court qui tue · </span>${r0(r.total)} dégâts en ${r.time.toFixed(1)} s · tue sous ${r0(r.total)} PV (${Math.min(100, 100 * r.total / r.hpMax).toFixed(0)} %)`;
  });
  [...rows].forEach((el, i) => el.classList.toggle('best', i === best));

  // résumé
  const a0 = autosToKill(c, t, [], DB, champ), a1 = autosToKill(c, t, ['E'], DB, champ), a2 = autosToKill(c, t, ['Q', 'E'], DB, champ);
  const n = a => a ? (a.n === 0 ? '0' : a.n) : '40+';
  $('sum').classList.toggle('kill', best >= 0);
  $('vicon').src = cimg(champ[0]);
  $('vwho').innerHTML = `${esc(champ[1])} <small>niv. ${t.level} · ${r0(R.armor)} armure · ${r0(R.startHp)} PV${t.shield ? ' (bouclier compris)' : ''}</small>`;
  const word = best >= 0 ? `${PRESETS[best][1].map(a => a === 'A' ? 'Auto' : a).join(' · ')} le tue` : `Aucun combo ne tue`;
  if (word !== lastVerdict) { const v = $('vword'); v.textContent = word; v.classList.remove('pop'); void v.offsetWidth; v.classList.add('pop'); lastVerdict = word; }
  $('vsub').innerHTML = (best >= 0 ? `C'est ton combo le plus court qui passe.` : `Il manque <b class="num">${r0(R.startHp - top.total)}</b> PV à ton plus gros combo.`) +
    ` Autos pour le finir : <b>${n(a0)}</b> à sec, <b>${n(a1)}</b> avec E, <b>${n(a2)}</b> après Q + E.`;

  // labo : combo sur mesure
  const dead = R.hpLeft <= 0;
  $('seq').innerHTML = state.seq.map((a, i) => `<button class="act ${a}" data-del="${i}" aria-label="Retirer">${a === 'A' ? 'Auto' : a}</button>`).join('');
  $('custom').innerHTML = !state.seq.length ? '' : `Ce combo fait <b class="num">${r0(R.total)}</b> dégâts sur ses <b class="num">${r0(R.startHp)}</b> PV. ` + (dead ? `<b style="color:var(--kill)">Il meurt</b>, avec ${r0(-R.hpLeft)} PV de marge.` : `Il survit avec <b class="num">${r0(R.hpLeft)}</b> PV.`);
  let killed = false; const eIdx = state.seq.indexOf('E');
  const trs = R.steps.map((s, i) => {
    const cls = killed ? 'after' : s.hp <= 0 ? 'dead' : ''; if (s.hp <= 0) killed = true;
    const noDmg = s.kind === 'E' || s.kind === 'W';
    return `<tr class="${cls}"><td>${esc(s.label)}${s.kind === 'A' && !s.e && eIdx >= 0 && eIdx < i ? ' <span style="color:var(--petal)">(E fini)</span>' : ''}</td><td>${s.t.toFixed(1)} s</td><td>${noDmg ? '—' : parts(s)}</td><td class="num">${noDmg ? '' : r0(s.total)}</td><td class="num">${s.hp <= 0 ? 'mort' : r0(s.hp)}</td></tr>`;
  }).join('');
  $('timeline').innerHTML = R.steps.length ? `<table><thead><tr><th>Action</th><th>Temps</th><th>Détail</th><th>Dégâts</th><th>PV restants</th></tr></thead><tbody>${trs}</tbody></table>` : '';
  if (R.unknown.length) $('timeline').innerHTML += `<p class="warn">Effet à l'impact non calculé pour : ${esc(R.unknown.join(', '))} (les stats de l'objet sont comptées).</p>`;

  // dégâts unitaires (sans Plaque d'os ni Embrasement)
  const tu = Object.assign({}, t, { bone: false }), cu = Object.assign({}, c, { ignite: false, dsStacks: 0 });
  const one = (seq, extra) => r0(simulate(Object.assign({}, cu, extra || {}), tu, seq, DB, champ).total);
  const U = [['Auto', one(['A'])], ['Auto avec E', one(['E', 'A'])], ['Q, 1 coup', one(['Q'], { qIso: false })], ['Q, 4 coups sur lui', one(['Q'], { qIso: true })], ['Q isolé avec E', one(['E', 'Q'], { qIso: true })]];
  $('units').innerHTML = U.map(([k, v]) => `<div class="tile"><div class="tk">${k}</div><div class="v">${v}</div><div class="s">${(100 * v / R.hpMax).toFixed(1)} % de ses PV max</div></div>`).join('');
  $('yiTiles').innerHTML = [['Dégâts d\'attaque', r0(R.ad), `dont ${r0(R.bonusAD)} bonus`], ['Vitesse d\'attaque', R.as.toFixed(2), `${Math.floor(5 * R.as) + 1} autos pendant le E`], ['Armure adverse', r0(R.armorEff), `tu infliges ${(100 * R.pm).toFixed(0)} % du physique`]]
    .map(([k, v, s]) => `<div class="tile"><div class="tk">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join('');
  $('values').innerHTML = [
    `Q : ${YI.qBase.join(' / ')} + ${YI.qRatio[state.patch] * 100} % AD. Chaque coup suivant sur la même cible fait 25 %. Effets à l'impact à 65 % (16,25 % pour les coups suivants).`,
    `E : ${YI.eBase.join(' / ')} + 35 % AD bonus en dégâts bruts à chaque attaque, pendant 5 s. Le Q et le W mettent la durée en pause.`,
    `W : compté comme un reset d'auto annulé tout de suite (0,2 s), sans soin ni réduction de dégâts.`,
    `Double frappe : la 4e attaque frappe deux fois, la seconde à 50 % AD avec les effets à l'impact.`,
    `Yi : 65 AD + 2,5 par niveau. Fragment de force adaptative : 5,4 AD.`,
    `Lame du roi déchu : 9 % des PV actuels. Tueur de krakens : 150 à 200 toutes les 3 attaques, jusqu'à +75 % selon les PV manquants. Guinsoo 30, Au bout du rouleau 45, Terminus 30, Arc courbe 15.`,
    `Plaque d'os : 30 à 60 de moins sur 3 impacts. Embrasement : 70 à 475 bruts selon ton niveau, comptés en entier.`,
    `Coups critiques : comptés en moyenne sur les autos seulement.`,
    `Non comptés : soins, potions, régénération, boucliers lancés pendant le combat (utilise le champ Bouclier), passifs défensifs des champions, résistances des runes.`
  ].map(x => `<li>${x}</li>`).join('');
  save();
}

// ---------- Événements ----------
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.tab) { setTab(d.tab); save(); return; }
  if (d.preset != null) { state.seq = PRESETS[+d.preset][1].slice(); setTab('labo'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else if (d.step) {
    const [path, dv] = d.step.split(':'), [o, k] = path.split('.');
    state[o][k] = clamp(state[o][k] + (+dv), 1, k === 'level' ? 18 : 5);
    if (path === 'yi.level') { state.yi.qRank = rankAt('Q', state.yi.level); state.yi.eRank = rankAt('E', state.yi.level); }
  } else if (d.champ) {
    if (d.champ !== state.tg.id) { state.tg.id = d.champ; state.tg.items = []; state.tg.shield = 0; state.tg.extraHp = 0; state.tg.extraArmor = 0; }
    state.recents = [d.champ].concat(state.recents.filter(x => x !== d.champ)).slice(0, 6);
    $('csearch').value = ''; renderChamps();
  }
  else if (d.hp) state.tg.hpPct = +d.hp;
  else if (d.item || d.rm != null) {
    const side = b.closest('#yiQuick,#yiItems,#yiResults') ? 'yi' : 'tg';
    if (d.item) { if (state[side].items.length < 6) state[side].items.push(d.item); } else state[side].items.splice(+d.rm, 1);
    renderPicker(side);
  }
  else if (d.add) state.seq.push(d.add);
  else if (d.del != null) state.seq.splice(+d.del, 1);
  else if (b.id === 'undo') state.seq.pop();
  else if (b.id === 'clear') state.seq = [];
  else if (d.v != null) {
    const g = b.parentElement.id;
    if (g === 'patch') { state.patch = d.v; state.patchSet = true; }
    else if (g === 'shards') state.yi.shards = +d.v;
    else if (g === 'ds') state.yi.dsStacks = +d.v;
  } else return;
  render();
});
$('csearch').addEventListener('input', renderChamps);
$('csearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const f = $('champs').querySelector('button'); if (f) f.click(); } });
$('yiSearch').addEventListener('input', () => renderPicker('yi'));
$('tgSearch').addEventListener('input', () => renderPicker('tg'));
$('hpPct').addEventListener('input', e => { state.tg.hpPct = +e.target.value; render(); });
$('hpAbs').addEventListener('input', e => {
  const max = targetStats(state.tg, DB, CH[state.tg.id]).hpMax, v = +e.target.value;
  if (v > 0) { state.tg.hpPct = clamp(100 * v / max, 0.1, 100); render(); }
});
for (const k of ['shield', 'extraHp', 'extraArmor']) $(k).addEventListener('input', e => { state.tg[k] = +e.target.value || 0; render(); });
$('bone').addEventListener('change', e => { state.tg.bone = e.target.checked; render(); });
$('rune').addEventListener('change', e => { state.yi.rune = e.target.value; render(); });
$('ignite').addEventListener('change', e => { state.yi.ignite = e.target.checked; render(); });
$('r').addEventListener('change', e => { state.yi.r = e.target.checked; render(); });
$('qIso').addEventListener('change', e => { state.yi.qIso = e.target.checked; render(); });
window.addEventListener('resize', () => setTab(state.tab));

// pétales : quelques-uns seulement, pour l'ambiance du poster
$('petals').innerHTML = Array.from({ length: 9 }, (_, i) => `<i style="left:${8 + i * 11}%;animation-duration:${13 + (i * 7) % 11}s;animation-delay:-${(i * 5) % 13}s;transform:scale(${0.7 + (i % 3) * 0.3})"></i>`).join('');

buildPresets(); renderStatic(); setTab(state.tab === 'labo' ? 'labo' : 'game'); render(); refreshLive();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTab(state.tab));
