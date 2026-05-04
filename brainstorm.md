Web recherché, a utilisé l'intégration Context7, outils chargés
Parfait, j'ai tout ce qu'il faut. Voici le plan complet.

Structure du repo
eyetoy-web/
├── AGENTS.md ← source de vérité cross-tools
├── CLAUDE.md → @AGENTS.md
├── .cursorrules → voir AGENTS.md
├── .mcp.json ← Context7 configuré
├── src/
│ ├── scenes/
│ │ ├── BootScene.ts
│ │ ├── GameScene.ts
│ │ └── UIScene.ts
│ ├── camera/
│ │ └── HandTracker.ts
│ ├── game.ts
│ └── main.ts
├── public/assets/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
MCP et tooling agent
Context7 est dispo pour Phaser et MediaPipe :

Lib Context7 ID Snippets
Phaser (API docs) /websites/phaser_io 19 538
MediaPipe Samples /google-ai-edge/mediapipe-samples 301
MediaPipe core /google-ai-edge/mediapipe 1 001
Il existe aussi un Claude Code Skill "Phaser Game Development" publié sur MCP Market qui couvre les patterns de scènes, physique, et object pooling.

.mcp.json à la racine du projet :

json
{
"mcpServers": {
"context7": {
"url": "https://mcp.context7.com/mcp"
}
}
}
AGENTS.md (extrait clé) :

markdown

## Libs & Context7 IDs

- Phaser 3 → use library /websites/phaser_io
- MediaPipe → use library /google-ai-edge/mediapipe-samples
- Always use context7 before writing Phaser or MediaPipe code

## Architecture rules

- HandTracker runs independently of Phaser game loop
- Pass landmarks to GameScene via EventEmitter only
- No MediaPipe imports inside Phaser Scenes
- All client-side only, no SSR
  User Stories — plan itératif
  Milestone 0 - Setup & validation tooling
  US-00 : En tant que dev, je peux lancer npm run dev et voir un canvas Phaser qui affiche "Phaser OK" dans la console, pour valider que Vite + Phaser + TypeScript sont correctement configurés.

US-01 : En tant que dev, j'autorise l'accès à ma webcam et je vois le flux vidéo s'afficher dans le canvas Phaser (via this.add.video), pour valider que Phaser gère bien le stream webcam.

US-02 : En tant que dev, je vois dans la console les coordonnées XY des landmarks de mes deux mains en temps réel, pour valider que @mediapipe/tasks-vision est correctement initialisé et qu'il détecte les mains.

US-03 : En tant que dev, je vois deux curseurs visuels (cercles rouges) qui suivent mes mains en overlay sur le flux webcam dans Phaser, pour valider que le bridge HandTracker → GameScene via EventEmitter fonctionne correctement.

Milestone 1 - Jeu de base : Pop les ronds
US-10 : En tant que joueur, je vois des ronds colorés apparaître à des positions aléatoires sur l'écran toutes les 2 secondes, pour avoir des cibles à atteindre.

US-11 : En tant que joueur, quand je pose ma main sur un rond, il disparaît avec une petite animation (scale to 0 + fade), pour avoir du feedback immédiat et valider la détection de collision main/cible.

US-12 : En tant que joueur, si un rond n'est pas attrapé en 5 secondes, il disparaît tout seul avec une animation différente (rouge + fade), pour créer une contrainte temporelle.

Milestone 2 - Système de score
US-20 : En tant que joueur, je vois mon score affiché en haut de l'écran dans une UIScene séparée, pour suivre ma progression.

US-21 : En tant que joueur, attraper un rond m'ajoute +10 points avec un feedback visuel flottant au-dessus du rond, pour récompenser l'action.

US-22 : En tant que joueur, laisser un rond expirer me retire 5 points, pour créer de la pression.

US-23 : En tant que joueur, après 60 secondes le jeu s'arrête et affiche mon score final avec un bouton "Rejouer", pour avoir un cycle de jeu complet.

Ce qu'on construit en premier (US-00)
bash
git clone https://github.com/phaserjs/template-vite-ts eyetoy-web
cd eyetoy-web
npm install
npm install @mediapipe/tasks-vision
