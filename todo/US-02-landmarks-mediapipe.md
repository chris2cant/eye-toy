# US-02 — Landmarks MediaPipe dans la console

**Statut :** ✅ Terminé  
**Milestone :** M0 — Fondations techniques  
**Dépend de :** US-01

## Story

En tant que dev, je vois dans la console les coordonnées XY des landmarks de mes deux mains en temps réel, pour valider que `@mediapipe/tasks-vision` est correctement initialisé et détecte les mains.

## Critères d'acceptance

- [ ] `HandTracker.ts` initialise `HandLandmarker` depuis `@mediapipe/tasks-vision`
- [ ] Le modèle `.task` est chargé depuis `public/wasm/`
- [ ] La boucle de détection tourne via un `requestAnimationFrame` indépendant
- [ ] Les coordonnées des landmarks s'affichent dans la console à chaque frame
- [ ] Aucun import MediaPipe dans les scènes Phaser

## Notes techniques

- `HandTracker` vit dans `src/camera/HandTracker.ts`
- Utiliser `HandLandmarker.createFromOptions(...)` avec `runningMode: "VIDEO"`
- `.wasm` copiés par `copy-wasm.js` → `public/wasm/`
- Toujours `await landmarker.setOptions(...)` avant de démarrer la boucle
