# US-10 — Spawn des ronds colorés

**Statut :** ✅ Terminé  
**Milestone :** M1 — Gameplay de base  
**Dépend de :** US-03

## Story

En tant que joueur, je vois des ronds colorés apparaître à des positions aléatoires sur l'écran, pour avoir des cibles à atteindre avec mes mains.

## Critères d'acceptance

- [ ] Un rond apparaît toutes les **2 secondes** à une position aléatoire
- [ ] Maximum **5 ronds simultanément** à l'écran
- [ ] Chaque rond a une couleur aléatoire parmi une palette définie
- [ ] Les ronds ont une taille fixe de **80px de diamètre**
- [ ] Apparition avec une animation de scale `0 → 1` (tween 200ms)
- [ ] Les ronds ne spawent pas hors des limites du canvas

## Notes techniques

- Utiliser un `Phaser.Time.TimerEvent` avec `delay: 2000, loop: true`
- Object pool recommandé (`Phaser.GameObjects.Group`) pour les performances
- Palette suggérée : rouge, bleu, vert, jaune, orange, violet
- Stocker le timestamp de spawn sur chaque rond (nécessaire pour US-12)
