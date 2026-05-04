# US-00 — Setup Phaser + Vite + TypeScript

**Statut :** ✅ Terminé

## Story

En tant que dev, je peux lancer `pnpm dev` et voir un canvas Phaser qui s'affiche dans le navigateur, pour valider que Vite + Phaser + TypeScript sont correctement configurés.

## Critères d'acceptance

- [ ] `pnpm dev` démarre sans erreur
- [ ] Un canvas Phaser est visible dans le navigateur
- [ ] La console affiche `"Phaser v3.x.x"` au démarrage
- [ ] TypeScript strict mode activé (`tsconfig.json`)

## Notes techniques

- BootScene → GameScene déjà câblé
- `src/game.ts` contient la config Phaser
- `src/main.ts` instancie `new Phaser.Game(config)`
