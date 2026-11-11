// Mode en direct : uniquement dans l'application de bureau (desktop/), qui expose window.live.
// Le site hébergé n'a pas window.live et reste en saisie manuelle.
const KEYSTONES = { 8008: 'lt', 8010: 'conq', 8005: 'pta', 9923: 'hob' };
const RESOLVE_TREE = 8400;                       // arbre Volonté : Plaque d'os possible, mais pas visible
const champIdFromRaw = raw => {
  const key = String(raw || '').split('_').pop().toLowerCase();
  return Object.keys(CH).find(id => id.toLowerCase() === key) || null;
};
const itemIds = p => (p.items || []).map(i => String(i.itemID)).filter(id => DB[id]).slice(0, 6);
const samePlayer = (p, ap) => (ap.riotId && p.riotId === ap.riotId) || (ap.summonerName && p.summonerName === ap.summonerName) ||
  (ap.riotIdGameName && p.riotIdGameName === ap.riotIdGameName);

/* Transforme la réponse de /liveclientdata/allgamedata en ce dont le calculateur a besoin. */
function readGame(d) {
  const ap = d && d.activePlayer, all = d && d.allPlayers;
  if (!ap || !Array.isArray(all)) return null;
  const me = all.find(p => samePlayer(p, ap)); if (!me) return null;
  const cs = ap.championStats || {}, ab = ap.abilities || {};
  const rank = k => (ab[k] && ab[k].abilityLevel) || 0;
  const pen = cs.armorPenetrationPercent;      // le jeu donne la part d'armure restante (1 = aucune pénétration)
  const enemies = all.filter(p => p.team !== me.team).map(p => ({
    id: champIdFromRaw(p.rawChampionName), level: p.level, items: itemIds(p), position: p.position || '',
    dead: !!p.isDead, resolve: !!p.runes && [p.runes.primaryRuneTree, p.runes.secondaryRuneTree].some(t => t && t.id === RESOLVE_TREE)
  })).filter(e => e.id);
  return {
    isYi: champIdFromRaw(me.rawChampionName) === 'MasterYi',
    level: ap.level || me.level, items: itemIds(me), position: me.position || '',
    ranks: { Q: rank('Q'), W: rank('W'), E: rank('E'), R: rank('R') },
    rune: KEYSTONES[ap.fullRunes && ap.fullRunes.keystone && ap.fullRunes.keystone.id] || 'none',
    stats: { ad: cs.attackDamage || 0, as: cs.attackSpeed || YI.as, leth: cs.physicalLethality || 0,
             pen: pen > 0 && pen <= 1 ? pen : 1, crit: cs.critChance || 0 },
    enemies
  };
}

let lastSig = '', liveStatus = 'idle';
function applyGame(d) {
  const g = readGame(d);
  if (!g) { setLiveStatus('loading'); return; }
  const sig = JSON.stringify(g);
  if (sig === lastSig && liveStatus === 'game') return;      // rien n'a changé : on ne touche pas à l'écran
  lastSig = sig; GAME = g; setLiveStatus('game');
  if (!state.liveOn || !g.isYi) { renderLiveBox(); renderChamps(); render(); return; }

  const y = state.yi, t = state.tg;
  y.level = clamp(g.level, 1, 18); y.items = g.items; y.rune = g.rune;
  y.qRank = clamp(g.ranks.Q, 1, 5); y.eRank = clamp(g.ranks.E, 1, 5);
  // cible : celle que tu as choisie si elle est dans la partie, sinon ton vis-à-vis de lane
  let e = g.enemies.find(x => x.id === state.liveTarget);
  if (!e) e = g.enemies.find(x => g.position && x.position === g.position) || g.enemies.find(x => x.id === t.id) || g.enemies[0];
  if (e) {
    if (e.id !== t.id) { t.id = e.id; t.shield = 0; t.extraHp = 0; t.extraArmor = 0; t.hpPct = 100; }
    t.level = clamp(e.level, 1, 18); t.items = e.items;
  }
  renderLiveBox(); renderStatic(); render();
}
function setLiveStatus(s) {
  if (s === liveStatus) return;
  liveStatus = s;
  if (s !== 'game') { GAME = null; lastSig = ''; renderChamps(); render(); }
  renderLiveBox();
}
function renderLiveBox() {
  const box = $('liveBox'); if (!box) return;
  box.hidden = false; $('liveOn').checked = !!state.liveOn;
  const dot = $('liveDot'); dot.className = 'dot';
  let txt = 'Hors partie · saisie manuelle';
  if (liveStatus === 'loading') txt = 'Partie détectée, en attente des données…';
  if (liveStatus === 'game' && GAME) {
    if (!GAME.isYi) { dot.classList.add('warn'); txt = 'En partie, mais tu ne joues pas Maître Yi · saisie manuelle'; }
    else if (!state.liveOn) txt = 'En partie · remplissage auto coupé';
    else {
      dot.classList.add('on');
      const e = GAME.enemies.find(x => x.id === state.tg.id);
      txt = 'En partie · niveaux, objets et stats lus dans le jeu. Règle ses PV toi-même.' +
        (e && e.resolve ? ' Il a l\'arbre Volonté : pense à cocher Plaque d\'os s\'il l\'a.' : '') + (e && e.dead ? ' Il est mort.' : '');
    }
  }
  $('liveTxt').textContent = txt;
}

if (window.live) {
  renderLiveBox();
  $('liveOn').addEventListener('change', e => { state.liveOn = e.target.checked; lastSig = ''; renderLiveBox(); renderChamps(); render(); });
  window.live.onData(applyGame);
  window.live.onStatus(setLiveStatus);
}
