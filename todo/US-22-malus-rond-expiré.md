# US-22 — -5 points par rond expiré

**Statut :** ✅ Terminé  
**Milestone :** M2 — Système de score  
**Dépend de :** US-12, US-20

## Story

En tant que joueur, laisser un rond expirer me retire 5 points, pour créer de la pression et m'inciter à réagir vite.

## Critères d'acceptance

- [ ] `score -= 5` à chaque fois que l'événement `"circle:expired"` est reçu
- [ ] Le score ne descend jamais en dessous de **0**
- [ ] Un texte `"-5"` en rouge apparaît à la position du rond expiré et monte en s'effaçant
- [ ] Le score en UIScene se met à jour immédiatement

## Notes techniques

- Même mécanique de texte flottant que US-21, couleur `#ff4444`
- `score = Math.max(0, score - 5)`
- Émettre `this.game.events.emit("score:update", newScore)`
