// Tests du moteur : node tests/engine.test.js
const E = require('../js/engine.js'), DATA = require('../js/data.js');
const DB = {}; DATA.i.forEach(i => DB[i.id] = i);
const ch = n => DATA.c.find(c => c[0] === n);
let fail = 0;
const near = (a, b, m) => { const ok = Math.abs(a - b) < 0.6; console.log(ok ? 'OK  ' : 'FAIL', m, a.toFixed(2), 'attendu', b); if (!ok) fail++; };
const fake = ['X', 'X', 1000, 0, 0, 0, 0, 0, 0];           // cible sans armure, 1000 PV
const sim = (c, t, seq, champ) => E.simulate(Object.assign({ qRank: 1, eRank: 1 }, c), Object.assign({ items: [], hpPct: 100 }, t), seq, DB, champ || fake);

let c = { level: 1, items: ['1036'], patch: '16.22', qIso: false }, t = { level: 1 };
near(sim(c, t, ['Q']).total, 20 + 0.7 * 75, 'Q avant nerf, 75 AD');
c.patch = '16.23'; near(sim(c, t, ['Q']).total, 20 + 0.6 * 75, 'Q après nerf');
c.qIso = true; near(sim(c, t, ['Q']).total, 35 + 1.05 * 75, 'Q isolé = 35 + 105 % AD');
near(sim(c, t, ['E', 'A']).total, 75 + 20 + 0.35 * 10, 'auto + E');
near(sim(c, t, ['A', 'A', 'A', 'A']).total, 75 * 4.5, '4 autos, double frappe');
c.qIso = false; near(sim(c, t, ['E', 'Q']).total, 65 + 0.65 * 23.5, 'Q + E, effets à l\'impact à 65 %');
near(sim(c, t, ['E', 'A', 'W', 'A']).time, 0.2, 'W = reset d\'auto');

const sy = ch('Syndra'), g5 = 4 * (0.7025 + 0.0175 * 4);
let r = sim({ level: 5, items: [], qRank: 3 }, { level: 5 }, ['A'], sy);
near(r.armor, 25 + 4 * g5, 'armure Syndra niv. 5'); near(r.hpMax, 583 + 100 * g5, 'PV Syndra niv. 5');
near(r.total, (65 + 2.5 * g5) * 100 / (100 + 25 + 4 * g5), 'auto sur Syndra niv. 5');
const g9 = 8 * (0.7025 + 0.0175 * 8);
r = sim({ level: 9, items: ['3036', '3142'] }, { level: 9, extraArmor: 50 }, ['A'], sy);
near(r.armorEff, (25 + 4 * g9 + 50) * 0.65 - 18, 'pénétration 35 % puis 18 de létalité');
near(sim({ level: 1, items: [] }, { level: 1, bone: true }, ['A', 'A', 'A', 'A']).total, 65 * 4.5 - 90, 'Plaque d\'os');
near(sim({ level: 1, items: ['3153'] }, { level: 1 }, ['A']).total, 105 + 90, 'Lame du roi déchu, 1 auto');
// 4e auto : la seconde frappe voit les PV déjà entamés par la première
r = sim({ level: 1, items: ['3153'], dsStacks: 3 }, { level: 1 }, ['A']);
near(r.total, (105 + 90) + (52.5 + 0.09 * (1000 - 195)), 'Lame du roi déchu, double frappe séquentielle');
r = sim({ level: 1, items: [] }, { level: 1 }, ['E', 'A', 'A', 'A', 'A', 'A']);
near(r.steps.filter(s => s.kind === 'A' && s.e).length, 4, 'E couvre 4 autos au niveau 1');
const k = E.autosToKill({ level: 5, items: ['1036', '1036'], qRank: 3, eRank: 1, patch: '16.23', qIso: true }, { level: 5, items: ['1056'], hpPct: 50 }, ['Q', 'E'], DB, sy);
near(k.n, 4, 'autos pour tuer après Q + E');
near(E.autosToKill({ level: 1, items: [], qRank: 1, eRank: 1 }, { level: 1, items: [], hpPct: 100 }, [], DB, fake).n, 14, 'autos seules sur 1000 PV');
console.log(fail ? fail + ' test(s) en échec' : 'Tous les tests passent'); process.exit(fail ? 1 : 0);
