# eye-toy

Jeu web inspiré de l'EyeToy PlayStation — les mains devant la webcam pour attraper des cibles à l'écran.

**Stack :** Phaser 3 · MediaPipe Tasks Vision · Vite · TypeScript

## Concept

Le flux webcam s'affiche en canvas. MediaPipe détecte les landmarks des deux mains en temps réel et les transmet à Phaser via EventEmitter. Des cibles colorées apparaissent aléatoirement ; le joueur les "attrape" en posant sa main dessus avant qu'elles expirent.

## Architecture

```
src/
├── scenes/
│   ├── BootScene.ts      # init assets & webcam
│   ├── GameScene.ts      # logique jeu + collisions
│   └── UIScene.ts        # score overlay
├── camera/
│   └── HandTracker.ts    # boucle MediaPipe, émet landmarks
├── game.ts               # config Phaser
└── main.ts               # entry point
```

**Règles d'architecture :**
- `HandTracker` tourne indépendamment de la game loop Phaser
- Les landmarks sont transmis à `GameScene` uniquement via `EventEmitter`
- Aucun import MediaPipe dans les Scenes Phaser
- 100 % client-side, pas de SSR

## Milestones

### Milestone 0 — Setup & validation tooling
| US | Description |
|----|-------------|
| US-00 | `npm run dev` → canvas Phaser avec "Phaser OK" en console |
| US-01 | Flux webcam affiché dans le canvas Phaser |
| US-02 | Coordonnées XY des deux mains loggées en temps réel |
| US-03 | Deux curseurs (cercles rouges) qui suivent les mains en overlay |

### Milestone 1 — Jeu de base : Pop les ronds
| US | Description |
|----|-------------|
| US-10 | Ronds colorés apparaissant toutes les 2 secondes à positions aléatoires |
| US-11 | Collision main/rond → disparition avec animation (scale + fade) |
| US-12 | Expiration après 5 s → disparition animation rouge |

### Milestone 2 — Système de score
| US | Description |
|----|-------------|
| US-20 | Score affiché dans UIScene séparée |
| US-21 | +10 points par rond attrapé, feedback visuel flottant |
| US-22 | −5 points par rond expiré |
| US-23 | Fin de partie après 60 s → score final + bouton "Rejouer" |

## Démarrage

```bash
git clone https://github.com/phaserjs/template-vite-ts eyetoy-web
cd eyetoy-web
npm install
npm install @mediapipe/tasks-vision
npm run dev
```

## Tooling agent

Context7 est configuré pour Phaser et MediaPipe :

| Lib | Context7 ID |
|-----|-------------|
| Phaser 3 | `/websites/phaser_io` |
| MediaPipe Samples | `/google-ai-edge/mediapipe-samples` |
| MediaPipe core | `/google-ai-edge/mediapipe` |

`.mcp.json` à la racine :

```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```
