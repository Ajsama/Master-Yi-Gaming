// Régénère js/data.js depuis Data Dragon : node tools/update-data.js
const fs = require('fs'), path = require('path');
const { parseDDragon } = require('../js/ddragon.js');
(async () => {
  const base = 'https://ddragon.leagueoflegends.com';
  const v = (await (await fetch(base + '/api/versions.json')).json())[0];
  const [c, i] = await Promise.all(['champion', 'item'].map(f => fetch(`${base}/cdn/${v}/data/fr_FR/${f}.json`).then(r => r.json())));
  const d = parseDDragon(c, i);
  const strip = o => Object.fromEntries(Object.entries(o).filter(([k, x]) => x || ['id', 'n', 'g'].includes(k)));
  d.i = d.i.map(strip);
  fs.writeFileSync(path.join(__dirname, '../js/data.js'),
    '// Copie de secours des données Riot (Data Dragon fr_FR). Régénérée par tools/update-data.js.\nconst DATA=' + JSON.stringify(d) + ";\nif (typeof module !== 'undefined') module.exports = DATA;\n");
  console.log('js/data.js mis à jour :', d.v, d.c.length, 'champions,', d.i.length, 'objets');
})().catch(e => { console.error(e); process.exit(1); });
