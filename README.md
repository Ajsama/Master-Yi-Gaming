# Wuju Calc

Calculateur de dégâts pour Maître Yi (mid) : choisis l'adversaire, les niveaux et les objets, et vois quels combos le tuent depuis ses PV actuels.

- Onglet « En game » : les combos de base sont déjà calculés, le plus court qui tue est mis en avant.
- Onglet « Labo » : runes, rangs des sorts, combo sur mesure coup par coup.
- Site statique, sans dépendance ni build. En ligne via GitHub Pages (branche `main`, dossier racine).

## Organisation

| Fichier | Rôle |
|---|---|
| `index.html`, `css/style.css` | Structure et design |
| `js/engine.js` | Moteur de calcul, sans DOM. Chiffres du kit de Yi (`YI`) et effets à l'impact des objets (`ONHIT`) : c'est ici qu'on modifie après un patch |
| `js/ui.js` | Interface, état, liste des combos de base (`PRESETS`) |
| `js/ddragon.js` | Extraction des stats depuis Data Dragon |
| `js/data.js` | Copie de secours des données Riot, utilisée si le chargement en direct échoue |
| `tests/engine.test.js` | Tests du moteur |
| `tools/update-data.js` | Régénère `js/data.js` |

## Commandes

```
node tests/engine.test.js     # lance les tests
node tools/update-data.js     # met à jour la copie de secours des données
```

Wuju Calc n'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games.
