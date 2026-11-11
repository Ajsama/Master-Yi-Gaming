# Wuju Calc

Calculateur de dégâts pour Maître Yi (mid) : choisis l'adversaire, les niveaux, les objets et ton combo, et vois s'il meurt depuis ses PV actuels.

- Onglet « En game » : les combos de base sont déjà calculés, le plus court qui tue est mis en avant.
- Onglet « Labo » : runes, rangs des sorts, combo sur mesure coup par coup.
- `index.html` sans dépendance ni build, plus les images dans `assets/`.
- Stats des champions et des objets chargées en direct depuis Data Dragon (Riot) à chaque ouverture, avec une copie intégrée en secours.
- Le kit de Yi et les effets à l'impact sont codés à la main dans `index.html` (objets `YI`, `ONHIT` et la liste `PRESETS` des combos) : c'est là qu'il faut modifier les chiffres après un patch.

Pour le mettre en ligne : Settings → Pages → branche `main`, dossier racine.
