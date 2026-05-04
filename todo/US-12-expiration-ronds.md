# US-12 — Expiration des ronds après 5 secondes

**Statut :** ✅ Terminé  
**Milestone :** M1 — Gameplay de base  
**Dépend de :** US-10

## Story

En tant que joueur, si un rond n'est pas attrapé en 5 secondes, il disparaît tout seul avec une animation différente, pour créer une contrainte temporelle et de la pression.

## Critères d'acceptance

- [ ] Chaque rond expire exactement **5 secondes** après son apparition
- [ ] Animation d'expiration distincte : flash rouge + scale `1 → 0` en **300ms**
- [ ] L'événement `"circle:expired"` est émis (pour US-22)
- [ ] Un rond expiré ne peut plus être attrapé
- [ ] Un indicateur visuel de temps restant (ex: arc de cercle qui se vide) est optionnel mais souhaitable

## Notes techniques

- Utiliser `Phaser.Time.TimerEvent` avec `delay: 5000` créé à chaque spawn
- Annuler le timer si le rond est attrapé avant expiration (`timer.destroy()`)
- Animation : tween sur `fillColor` vers rouge puis scale → 0
- Optionnel : `Phaser.GameObjects.Graphics` pour dessiner l'arc de progression
