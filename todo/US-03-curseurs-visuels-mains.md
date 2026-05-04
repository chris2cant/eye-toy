# US-03 — Curseurs visuels qui suivent les mains

**Statut :** ✅ Terminé  
**Milestone :** M0 — Fondations techniques  
**Dépend de :** US-02

## Story

En tant que joueur, je vois deux curseurs visuels (cercles) qui suivent mes mains en overlay sur le flux webcam dans Phaser, pour valider que le bridge `HandTracker → GameScene` via EventEmitter fonctionne.

## Critères d'acceptance

- [ ] `HandTracker` émet un événement `"landmarks"` avec `{ hands, pose, face }`
- [ ] `GameScene` écoute `"landmarks"` et met à jour la position des curseurs
- [ ] Un curseur par main détectée (max 2), invisible si la main sort du cadre
- [ ] Les curseurs sont mirrorés cohérentement avec le flux vidéo
- [ ] Aucun appel direct de `HandTracker` depuis `GameScene`

## Notes techniques

- Utiliser `Phaser.Events.EventEmitter` partagé (ex: `this.game.events`)
- Les coordonnées MediaPipe sont normalisées [0,1] → multiplier par `width`/`height`
- Créer les curseurs avec `this.add.circle(x, y, 20, 0xff0000)`
- Mettre à jour via `.setPosition(x, y)` dans le handler `"landmarks"`
