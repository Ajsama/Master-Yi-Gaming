// Tests de la lecture des données du jeu : node tests/live.test.js
const vm = require('vm'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const ctx = vm.createContext({ window: {}, console });
vm.runInContext(read('js/data.js') + read('js/engine.js') +
  'let DB = {}, CH = {}; DATA.i.forEach(i => DB[i.id] = i); DATA.c.forEach(c => CH[c[0]] = c);' + read('js/live.js'), ctx);
const run = code => vm.runInContext(code, ctx);
let fail = 0;
const eq = (a, b, m) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(ok ? 'OK  ' : 'FAIL', m, JSON.stringify(a)); if (!ok) fail++; };
const near = (a, b, m) => { const ok = Math.abs(a - b) < 0.01; console.log(ok ? 'OK  ' : 'FAIL', m, a, 'attendu', b); if (!ok) fail++; };

// 1) Vraie réponse du jeu (outil d'entraînement, patch 16.22)
ctx.real = JSON.parse(read('tests/fixtures/allgamedata.practice.json'));
const g = run('readGame(real)');
eq(g.isYi, true, 'reconnaît Maître Yi');
eq(g.level, 5, 'niveau');
eq(g.items, ['1055', '6672'], 'objets utiles (potion et balise ignorées)');
eq(g.ranks, { Q: 1, W: 1, E: 1, R: 0 }, 'rangs des sorts');
eq(g.rune, 'hob', 'rune clé Déluge de lames');
eq(g.ignite, true, 'Embrasement détecté');
eq(g.stats.pen, 1, 'aucune pénétration = 1');
near(g.stats.ad, 133.125, 'AD lu');
eq(g.enemies, [], 'aucun adversaire dans cette partie');
// Le calcul manuel retombe sur les chiffres du jeu : 65 + 2,5/niv, Lame de Doran, Krakens, 1 fragment adaptatif
const y = run("yiStats({ level: 5, items: ['1055', '6672'], shards: 1 }, DB)");
near(y.baseAD + y.bonusAD, 133.125, 'AD recalculé = AD du jeu');
const yl = run("yiStats({ level: 5, items: ['1055', '6672'], live: readGame(real).stats }, DB)");
near(0.679 * (1 + yl.asBonus / 100), 1.0913, 'vitesse d\'attaque reprise du jeu');

// 2) Exemple reconstruit avec une équipe adverse
ctx.sample = JSON.parse(read('tests/fixtures/allgamedata.sample.json'));
const s = run('readGame(sample)');
eq(s.enemies.map(e => e.id), ['LeeSin', 'Zed', 'Fiddlesticks'], 'équipe adverse, noms internes retrouvés');
eq(s.enemies[1].items, ['1055', '1036', '1029'], 'objets de l\'adversaire');
eq([s.enemies[1].position, s.enemies[1].resolve, s.enemies[2].dead], ['MIDDLE', true, true], 'poste, arbre Volonté, mort');
eq(run('readGame({})'), null, 'réponse vide ignorée');
console.log(fail ? fail + ' test(s) en échec' : 'Tous les tests passent'); process.exit(fail ? 1 : 0);
