# Roadmap — Eye-Toy Web Game

> Jeu de 60 secondes : attraper le maximum de ronds avec ses mains détectées par la webcam.

## Vision finale

- Durée fixe : **60 secondes**
- Objectif : **maximiser son score** en touchant des ronds colorés avec ses mains
- Feedback immédiat à chaque action (animation, son, score flottant)
- Cycle complet : accueil → countdown → jeu → score final → rejouer

---

## Avancement

| Story | Titre | Statut | Notes |
|-------|-------|--------|-------|
| US-00 | Setup Phaser + Vite + TypeScript | ✅ Terminé | |
| US-01 | Flux webcam dans le canvas Phaser | ✅ Terminé | Cover ratio + mirroring |
| US-02 | Landmarks MediaPipe dans la console | ✅ Terminé | |
| US-03 | Curseurs visuels qui suivent les mains | ✅ Terminé | |
| US-10 | Spawn des ronds colorés aléatoires | ✅ Terminé | |
| US-11 | Collision main/rond → disparition animée | ✅ Terminé | |
| US-12 | Expiration des ronds après 5s | ✅ Terminé | Arc de progression inclus |
| US-20 | Score affiché en UIScene | ✅ Terminé | |
| US-21 | +10 points par rond attrapé (score flottant) | ✅ Terminé | |
| US-22 | -5 points par rond expiré | ✅ Terminé | |
| US-23 | Timer 60s → écran Game Over + bouton Rejouer | ✅ Terminé | |
| US-30 | Écran d'accueil + countdown 3-2-1 | ✅ Terminé | |
| US-31 | Effets sonores (pop, expire, game over) | ✅ Terminé | Web Audio API synthétisée |
| US-32 | Progression de difficulté | ✅ Terminé | Seuils 33%/66% du temps |

---

## Milestones

| Milestone | Nom | Stories | Statut |
|-----------|-----|---------|--------|
| M0 | Fondations techniques | US-00 → US-03 | ✅ Terminé |
| M1 | Gameplay de base | US-10 → US-12 | ✅ Terminé |
| M2 | Système de score | US-20 → US-23 | ✅ Terminé |
| M3 | Game feel & polish | US-30 → US-32 | ✅ Terminé |

---

## Définition de "terminé" (DoD globale)

- Le jeu tourne à 60 fps sur Chrome desktop avec webcam active
- Aucune import MediaPipe dans les scènes Phaser
- Les landmarks transitent uniquement via EventEmitter
- Les tests Playwright passent (`pnpm test`)
