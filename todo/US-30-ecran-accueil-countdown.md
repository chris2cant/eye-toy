# US-30 — Écran d'accueil + countdown 3-2-1

**Statut :** ✅ Terminé  
**Milestone :** M3 — Game feel & polish  
**Dépend de :** US-23

## Story

En tant que joueur, je vois un écran d'accueil avec les instructions, puis un countdown 3-2-1 avant le début de la partie, pour me préparer mentalement et comprendre le jeu.

## Critères d'acceptance

- [ ] `MenuScene` affiche le titre, les instructions (attraper les ronds avec les mains), et un bouton "Jouer"
- [ ] Après "Jouer", un countdown **3 – 2 – 1 – GO!** s'affiche en grand en overlay
- [ ] La détection des mains est active pendant le countdown (le joueur se positionne)
- [ ] La partie commence dès que "GO!" disparaît
- [ ] Le meilleur score précédent est affiché sur l'écran d'accueil

## Notes techniques

- `MenuScene` → lance `GameScene` + overlay countdown via `this.scene.launch("CountdownScene")`
- Ou gérer le countdown directement dans `GameScene` avant d'activer les spawns
- Texte countdown avec tween scale `2 → 1` + fade pour chaque chiffre
