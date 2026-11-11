// Moteur de calcul. Pur : aucune dépendance au DOM.
const YI = {
  ad: 65, adLvl: 2.5, as: 0.679, asLvl: 2.5,
  qBase: [20, 40, 60, 80, 100],
  qRatio: { '16.22': 0.70, '16.23': 0.60 },
  qSame: 0.25,              // coups suivants sur la même cible
  qOnHit: 0.65, qOnHitSame: 0.1625,
  eBase: [20, 25, 30, 35, 40], eRatio: 0.35, eDur: 5,
  dsRatio: 0.5,
  critBonus: 1.0,           // un coup critique fait 200 % (valeur lue dans le jeu, patch 16.22)
  rAS: [25, 45, 65],
  qTime: 1.0
};
// Effets à l'impact codés à la main (id objet -> effet)
const ONHIT = {
  '1043': { phys: 15 },                 // Arc courbe
  '3124': { magic: 30 },                // Guinsoo
  '3091': { magic: 45 },                // Au bout du rouleau
  '3302': { magic: 30 },                // Terminus
  '3153': { curHp: 0.09 },              // Lame du roi déchu (mêlée)
  '6672': { kraken: true }              // Tueur de krakens
};
const growth = l => (l - 1) * (0.7025 + 0.0175 * (l - 1));
const lin = (a, b, l) => a + (b - a) * (l - 1) / 17;
const stat = (b, g, l) => b + g * growth(l);

function sumItems(ids, DB) {
  const t = { ad: 0, as: 0, cr: 0, hp: 0, ar: 0, mr: 0, ap: 0, le: 0, cd: 0, pen: 1, onhit: [], unknown: [] };
  for (const id of ids) {
    const it = DB[id]; if (!it) continue;
    for (const k of ['ad', 'as', 'cr', 'hp', 'ar', 'mr', 'ap', 'le', 'cd']) t[k] += it[k] || 0;
    if (it.pe) t.pen *= 1 - it.pe / 100;
    if (it.oh) { if (ONHIT[id]) t.onhit.push(ONHIT[id]); else t.unknown.push(it.n); }
  }
  t.cr = Math.min(100, t.cr);
  return t;
}

function yiStats(cfg, DB) {
  const it = sumItems(cfg.items, DB);
  const baseAD = stat(YI.ad, YI.adLvl, cfg.level);
  const bonusAD = it.ad + 5.4 * (cfg.shards || 0);
  let asBonus = YI.asLvl * growth(cfg.level) + it.as;
  if (cfg.r && cfg.level >= 6) asBonus += YI.rAS[cfg.level >= 16 ? 2 : cfg.level >= 11 ? 1 : 0];
  if (cfg.live) {              // stats lues dans le jeu : elles remplacent le calcul (runes et bonus déjà inclus)
    const L = cfg.live;
    const out = { baseAD, bonusAD: Math.max(0, L.ad - baseAD), asBonus: (L.as / YI.as - 1) * 100, it };
    it.le = L.leth; it.pen = L.pen; it.cr = Math.min(100, L.crit * 100);
    if (L.critDmg) { out.critBonus = L.critDmg / 100 - 1; it.cd = 0; }     // bonus des objets déjà inclus
    return out;
  }
  return { baseAD, bonusAD, asBonus, it };
}

function targetStats(t, DB, champ) {
  const it = sumItems(t.items, DB);
  // Fragments de runes : +65 PV fixes et/ou 10 à 180 PV selon le niveau. Le jeu ne dit pas lesquels il a pris.
  const sh = t.hpShard || 'none';
  const shardHp = (sh === 'flat' || sh === 'both' ? 65 : 0) + (sh === 'scale' || sh === 'both' ? lin(10, 180, t.level) : 0);
  const hpMax = stat(champ[2], champ[3], t.level) + it.hp + shardHp + (t.extraHp || 0);
  const armor = stat(champ[4], champ[5], t.level) + it.ar + (t.extraArmor || 0);
  const mr = stat(champ[6], champ[7], t.level) + it.mr;
  return { hpMax, armor, mr, it };
}

/* seq : tableau de 'A' (auto), 'Q', 'E'.  Retourne le détail coup par coup. */
function simulate(cfg, tgt, seq, DB, champ, opt) {
  opt = opt || {};
  const y = yiStats(cfg, DB), T = targetStats(tgt, DB, champ);
  const lvl = cfg.level, rune = cfg.rune || 'none';
  const qRank = Math.max(1, cfg.qRank), eRank = Math.max(1, cfg.eRank);
  const armorEff = T.armor > 0 ? Math.max(0, T.armor * y.it.pen - y.it.le) : T.armor;
  const pm = 100 / (100 + armorEff), mm = 100 / (100 + Math.max(0, T.mr));
  const critMult = 1 + (y.it.cr / 100) * ((y.critBonus != null ? y.critBonus : YI.critBonus) + y.it.cd / 100);
  const boneRed = tgt.bone ? lin(30, 60, tgt.level) : 0;
  const startHp = opt.hp != null ? opt.hp : T.hpMax * (tgt.hpPct / 100) + (tgt.shield || 0);

  const S = { hp: startHp, t: 0, eEnd: -1, ds: cfg.dsStacks || 0, atk: 0, krak: 0, conq: 0, pta: false, bone: tgt.bone ? 3 : 0 };
  const steps = []; const tot = { phys: 0, magic: 0, tru: 0 };

  const curAD = () => y.baseAD + y.bonusAD + (rune === 'conq' ? S.conq * lin(1.8, 4, lvl) * 0.6 : 0);
  const curBonusAD = () => curAD() - y.baseAD;
  const curAS = () => {
    let b = y.asBonus;
    if (rune === 'lt') b += 6 * Math.min(6, S.atk);
    if (rune === 'hob' && S.atk < 3) b += 90;
    return Math.min(rune === 'lt' || rune === 'hob' ? 3.0 : 2.5, YI.as * (1 + b / 100));
  };
  const eOn = () => S.t <= S.eEnd + 1e-9;

  // Un impact : adPart = dégâts physiques de base, f = efficacité des effets à l'impact, isAtk = attaque de base
  function impact(adPart, f, isAtk) {
    let p = adPart, m = 0, tr = 0;
    for (const o of y.it.onhit) {
      if (o.phys) p += o.phys * f;
      if (o.magic) m += o.magic * f;
      if (o.curHp) p += Math.max(0, S.hp) * o.curHp * f;
      if (o.kraken && isAtk) {
        S.krak++;
        if (S.krak === 3) { S.krak = 0; p += lin(150, 200, lvl) * (1 + 0.75 * Math.min(1, Math.max(0, 1 - S.hp / T.hpMax))) * f; }
      }
    }
    if (isAtk) {
      if (rune === 'hob' && S.atk < 3) p += (lin(2, 20, lvl) + 0.12 * curBonusAD()) * f;
      if (rune === 'lt' && S.atk >= 6) p += lin(9, 30, lvl) * (1 + y.asBonus / 100 + 0.36) * f;
    }
    if (eOn()) tr += (YI.eBase[eRank - 1] + YI.eRatio * curBonusAD()) * f;
    let dp = p * pm, dm = m * mm, dt = tr;
    if (S.pta) { dp *= 1.08; dm *= 1.08; dt *= 1.08; }
    if (S.bone > 0) {            // Plaque d'os : réduction fixe sur 3 impacts
      S.bone--; let r = boneRed;
      const a = Math.min(dp, r); dp -= a; r -= a;
      const b = Math.min(dm, r); dm -= b; r -= b;
      dt -= Math.min(dt, r);
    }
    S.hp -= dp + dm + dt;        // appliqué tout de suite : l'impact suivant voit les PV à jour
    return { dp, dm, dt };
  }
  function push(label, kind, parts) {
    const d = { dp: 0, dm: 0, dt: 0 };
    for (const x of parts) { d.dp += x.dp; d.dm += x.dm; d.dt += x.dt; }
    const total = d.dp + d.dm + d.dt;
    tot.phys += d.dp; tot.magic += d.dm; tot.tru += d.dt;
    steps.push({ label, kind, phys: d.dp, magic: d.dm, tru: d.dt, total, hp: S.hp, t: S.t, e: eOn() });
  }

  let firstAtk = true;
  for (const a of seq) {
    if (a === 'E') { S.eEnd = S.t + YI.eDur; steps.push({ label: 'Style Wuju (E)', kind: 'E', phys: 0, magic: 0, tru: 0, total: 0, hp: S.hp, t: S.t, e: true }); continue; }
    if (a === 'W') {                          // Méditation annulée tout de suite : réinitialise le délai d'attaque
      const eLeft = S.eEnd - S.t; S.t += 0.2; if (eLeft > 0) S.eEnd = S.t + eLeft;
      steps.push({ label: 'Méditation (W), reset d\'auto', kind: 'W', phys: 0, magic: 0, tru: 0, total: 0, hp: S.hp, t: S.t, e: eOn() });
      firstAtk = true; continue;
    }
    if (a === 'Q') {
      const base = YI.qBase[qRank - 1] + YI.qRatio[cfg.patch || '16.23'] * curAD();
      const iso = !!cfg.qIso;
      const eLeft = S.eEnd - S.t;            // le Q met le E en pause
      S.t += YI.qTime; if (eLeft > 0) S.eEnd = S.t + eLeft;
      const parts = [impact(base, YI.qOnHit, false)];
      if (iso) for (let i = 0; i < 3; i++) { const sv = S.bone; S.bone = 0; parts.push(impact(base * YI.qSame, YI.qOnHitSame, false)); S.bone = sv; }
      push(iso ? 'Frappe alpha (Q) ×4' : 'Frappe alpha (Q)', 'Q', parts);
      if (rune === 'conq') S.conq = Math.min(12, S.conq + 2);
      firstAtk = true;                        // le Q enchaîne directement sur une auto
      continue;
    }
    // Auto-attaque
    if (!firstAtk) S.t += 1 / curAS();
    firstAtk = false;
    const dbl = S.ds >= 3;
    const parts = [impact(curAD() * critMult, 1, true)];
    S.atk++;
    if (rune === 'conq') S.conq = Math.min(12, S.conq + 2);
    if (dbl) { parts.push(impact(curAD() * YI.dsRatio * critMult, 1, false)); S.ds = 0; if (rune === 'conq') S.conq = Math.min(12, S.conq + 2); }
    else S.ds++;
    if (rune === 'pta' && S.atk === 3 && !S.pta) {
      let b = lin(40, 160, lvl) * pm; if (S.bone > 0) { S.bone--; b = Math.max(0, b - boneRed); }
      S.hp -= b; parts.push({ dp: b, dm: 0, dt: 0 }); S.pta = true;
    }
    push(dbl ? 'Auto + double frappe' : 'Auto', 'A', parts);
  }
  if (cfg.ignite) {
    const d = lin(70, 475, lvl);
    S.hp -= d; tot.tru += d;
    steps.push({ label: 'Embrasement (5 s)', kind: 'I', phys: 0, magic: 0, tru: d, total: d, hp: S.hp, t: S.t, e: false });
  }
  const total = tot.phys + tot.magic + tot.tru;
  return { steps, tot, total, startHp, hpMax: T.hpMax, armor: T.armor, armorEff, mr: T.mr, pm, hpLeft: S.hp, time: S.t,
           ad: y.baseAD + y.bonusAD, bonusAD: y.bonusAD, as: Math.min(2.5, YI.as * (1 + y.asBonus / 100)),
           unknown: y.it.unknown, crit: y.it.cr };
}

/* Nombre d'autos nécessaires après un préfixe donné (ex. ['Q','E']). Une seule simulation de 40 autos. */
function autosToKill(cfg, tgt, prefix, DB, champ) {
  const r = simulate(Object.assign({}, cfg, { ignite: false }), tgt, prefix.concat(Array(40).fill('A')), DB, champ);
  const ign = cfg.ignite ? lin(70, 475, cfg.level) : 0;
  if (r.startHp - ign <= 0) return { n: 0, time: 0 };
  let n = 0;
  for (const s of r.steps) { if (s.kind === 'A') n++; if (s.hp - ign <= 0) return { n, time: s.t }; }
  return null;
}

if (typeof module !== 'undefined') module.exports = { YI, simulate, autosToKill, yiStats, targetStats, growth, lin };
