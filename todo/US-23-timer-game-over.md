# US-23 — Timer 60s → écran Game Over

**Statut :** ✅ Terminé  
**Milestone :** M2 — Système de score  
**Dépend de :** US-20, US-21, US-22

## Story

En tant que joueur, après 60 secondes le jeu s'arrête et affiche mon score final avec un bouton "Rejouer", pour avoir un cycle de jeu complet.

## Critères d'acceptance

- [ ] La partie dure exactement **60 secondes**
- [ ] Le timer en UIScene décompte de 60 à 0 en temps réel
- [ ] À 0, tous les spawns s'arrêtent et les interactions sont désactivées
- [ ] Un écran de fin s'affiche : score final, meilleur score de la session, bouton "Rejouer"
- [ ] "Rejouer" redémarre `GameScene` et remet le score à 0

## Notes techniques

- Timer dans `GameScene` : `Phaser.Time.TimerEvent` avec `delay: 1000, repeat: 59`
- À l'expiration : `this.scene.start("GameOverScene")` en passant `{ score: this.score }`
- `GameOverScene` reçoit les données via `this.scene.settings.data`
- Stocker le `bestScore` dans `localStorage` pour la persistance inter-parties
- Émettre `this.game.events.emit("timer:update", remaining)` chaque seconde
