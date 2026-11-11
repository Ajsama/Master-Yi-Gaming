// Extraction des stats utiles depuis les fichiers Data Dragon (fr_FR). Sert au site et à tools/update-data.js.
function parseDDragon(champJson, itemJson) {
  const c = Object.entries(champJson.data).map(([k, v]) => {
    const s = v.stats;
    return [k, v.name, s.hp, s.hpperlevel, s.armor, s.armorperlevel, s.spellblock, s.spellblockperlevel, s.attackrange <= 325 ? 1 : 0];
  }).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  const seen = new Set(), items = [];
  for (const [k, v] of Object.entries(itemJson.data)) {
    if (+k >= 10000 || !(v.maps && v.maps['11']) || !v.gold.purchasable || v.requiredChampion || v.requiredAlly || v.inStore === false) continue;
    if (seen.has(v.name)) continue;
    const d = v.description, s = v.stats || {};
    const num = re => { const m = d.match(re); return m ? parseFloat(m[1]) : 0; };
    const o = { id: k, n: v.name, g: v.gold.total,
      ad: s.FlatPhysicalDamageMod || 0, as: Math.round((s.PercentAttackSpeedMod || 0) * 100), cr: Math.round((s.FlatCritChanceMod || 0) * 100),
      hp: s.FlatHPPoolMod || 0, ar: s.FlatArmorMod || 0, mr: s.FlatSpellBlockMod || 0, ap: s.FlatMagicDamageMod || 0,
      le: num(/<attention>\+?(\d+)<\/attention> (?:de )?létalité/), pe: num(/<attention>\+?(\d+)%<\/attention> de pénétration d'armure/),
      cd: num(/<attention>\+?(\d+)%<\/attention> de dégâts de coup critique/), oh: d.includes('OnHit') ? 1 : 0 };
    if (!['ad', 'as', 'cr', 'hp', 'ar', 'mr', 'le', 'pe', 'oh'].some(x => o[x])) continue;
    seen.add(v.name); items.push(o);
  }
  items.sort((a, b) => a.g - b.g || a.n.localeCompare(b.n, 'fr'));
  return { v: champJson.version, c, i: items };
}
if (typeof module !== 'undefined') module.exports = { parseDDragon };
