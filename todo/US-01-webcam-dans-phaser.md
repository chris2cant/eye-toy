# US-01 — Flux webcam dans le canvas Phaser

**Statut :** ✅ Terminé  
**Milestone :** M0 — Fondations techniques  
**Dépend de :** US-00

## Story

En tant que joueur, j'autorise l'accès à ma webcam et je vois le flux vidéo s'afficher en fond du canvas Phaser, pour que le jeu fonctionne comme un miroir augmenté.

## Critères d'acceptance

- [x] Le navigateur demande la permission caméra au démarrage
- [x] Le flux vidéo remplit l'intégralité du canvas (mirroring horizontal activé)
- [x] La vidéo est rendue en fond, sous tous les éléments de jeu (`depth: -10`)
- [x] Si l'utilisateur refuse la caméra, un message d'erreur s'affiche

## Ce qui a été implémenté

- `getUserMedia({ video: true })` dans `GameScene.create()`
- `<video>` caché alimenté par le stream
- `CanvasTexture` Phaser rafraîchie à chaque frame dans `update()`
- Mirroring horizontal via `ctx.translate(width, 0) + ctx.scale(-1, 1)`
- **Cover ratio** : `drawImage` avec crop centré (`srcX/srcY`) pour respecter le ratio caméra quelle que soit la taille de la fenêtre
- Redimensionnement géré via `scale.on("resize")`

## Fichiers modifiés

- `src/scenes/GameScene.ts`
