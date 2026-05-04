# US-21 — +10 points par rond attrapé

**Statut :** ✅ Terminé  
**Milestone :** M2 — Système de score  
**Dépend de :** US-11, US-20

## Story

En tant que joueur, attraper un rond m'ajoute +10 points avec un feedback visuel flottant au-dessus du rond, pour récompenser l'action immédiatement.

## Critères d'acceptance

- [ ] `score += 10` à chaque fois que l'événement `"circle:popped"` est reçu
- [ ] Un texte `"+10"` apparaît à la position du rond et monte en s'effaçant (tween 600ms)
- [ ] Le score en UIScene se met à jour immédiatement
- [ ] Le score ne peut pas descendre en dessous de 0

## Notes techniques

- Créer le texte flottant dans `GameScene` avec `this.add.text(x, y, "+10", {...})`
- Tween : `y -= 60`, `alpha: 0` sur 600ms, puis `destroy()` à la fin du tween
- Émettre `this.game.events.emit("score:update", newScore)` pour UIScene
