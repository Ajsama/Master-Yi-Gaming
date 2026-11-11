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
| `js/live.js` | Mode en direct, actif seulement dans l'application de bureau |
| `desktop/` | Application Electron |
| `tests/engine.test.js` | Tests du moteur |
| `tools/update-data.js` | Régénère `js/data.js` |

## Application de bureau (remplissage automatique en partie)

Le dossier `desktop/` contient une fenêtre Electron qui ouvre ce même site et le remplit avec les données de la partie en cours : ton niveau, tes objets, tes stats réelles, les rangs de tes sorts, ta rune clé, puis le champion, le niveau et les objets de ton adversaire. Les PV adverses restent à régler à la main, le jeu ne les donne pas.

```
cd desktop
npm install
npm start
```

Elle interroge une fois par seconde l'API locale officielle du jeu (`https://127.0.0.1:2999/liveclientdata/allgamedata`) et ne touche pas au processus du jeu. Hors partie, le site reste en saisie manuelle. `js/live.js` fait la traduction entre la réponse du jeu et l'état du site.

## Commandes

```
node tests/engine.test.js     # tests du moteur de calcul
node tests/live.test.js       # tests de la lecture des données du jeu
node tools/update-data.js     # met à jour la copie de secours des données
```

Wuju Calc n'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games.
