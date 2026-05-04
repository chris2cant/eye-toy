# US-20 — Affichage du score en UIScene

**Statut :** ✅ Terminé  
**Milestone :** M2 — Système de score  
**Dépend de :** US-10

## Story

En tant que joueur, je vois mon score et le temps restant affichés en permanence en haut de l'écran, pour suivre ma progression pendant la partie.

## Critères d'acceptance

- [ ] Une `UIScene` tourne en parallèle de `GameScene` (scène overlay)
- [ ] Le score s'affiche en haut à gauche : `Score : 0`
- [ ] Le timer s'affiche en haut à droite : `00:60`
- [ ] L'affichage se met à jour en temps réel sans affecter les performances
- [ ] Le texte est lisible sur le fond webcam (ombre ou contour)

## Notes techniques

- Lancer `UIScene` en parallèle : `this.scene.launch("UIScene")` depuis `GameScene`
- Communication via `this.game.events` (EventEmitter global)
- `UIScene` écoute les événements `"score:update"` et `"timer:update"`
- Style texte recommandé : `fontSize: "32px"`, `stroke: "#000000"`, `strokeThickness: 4`
