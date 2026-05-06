# Sound Design — Refonte immersive

## Objectifs

- Son adapté à chaque jeu (actuellement : 3 sons synthétisés globaux, SableMagiqueScene et JeuDeFicelleScene muets)
- Écran de fin positif, centré sur le score — supprimer le lexique "GAME OVER"
- Célébration visuelle + sonore pour les nouveaux records

## Stack audio retenue

**Phaser sound system** (`this.sound.add/play`) + Web Audio API pour les synthétisés simples.

Si des fichiers MP3 sont fournis, les charger dans `BootScene.preload()` et les jouer via Phaser. Sinon, tout reste synthétisé via Web Audio API.

---

## Fichiers MP3 à fournir (par priorité)

### Priorité haute
| Fichier | Usage | Durée |
|---|---|---|
| `catch_0.mp3` | Attraper un rond tier 1 | ~0.2s |
| `catch_1.mp3` | Attraper un rond tier 2 | ~0.2s |
| `catch_2.mp3` | Attraper un rond tier 3 | ~0.2s |
| `expire.mp3` | Rond expiré (doux, pas punitif) | ~0.3s |
| `game_end.mp3` | Fin de partie normale — fanfare courte positive | ~1.5s |
| `new_record.mp3` | Nouveau record — fanfare triomphante | ~2s |

### Priorité moyenne
| Fichier | Usage | Durée |
|---|---|---|
| `combo.mp3` | Combo de 3+ attrapés d'affilée | ~0.5s |
| `urgency_tick.mp3` | Tic métronome (10 dernières secondes) | ~0.1s |
| `button.mp3` | Clic de bouton UI | ~0.1s |

### Priorité basse (ambiances)
| Fichier | Usage | Durée |
|---|---|---|
| `sand_ambient.mp3` | Loop doux pour SableMagiqueScene | 4–8s loop |
| `strings_pluck_0.mp3` à `strings_pluck_4.mp3` | 5 sons de harpe/corde (un par doigt) pour JeuDeFicelleScene | ~0.8s chacun |

---

## Architecture audio cible

```
src/audio/
  AudioFX.ts           ← actuel (conservé, backward-compat)
  gameFX.ts            ← catch(tier), expire, combo, urgency, gameEnd
  sableFX.ts           ← init(scene) / setMotion(velocity) / dispose()
  ficelleFX.ts         ← pluck(scene, fingerIndex, distT) / collisionBurst(scene)
  celebrationFX.ts     ← newRecord(scene)
```

Chaque module utilise `scene.sound` si un fichier est chargé, sinon fallback Web Audio API synthétisé.

---

## Sound design synthétisé (fallback sans MP3)

### GameScene
| Événement | Recette |
|---|---|
| `catch(tier 0/1/2)` | Sinus sweep montant : 440→800 / 520→1000 / 660→1200 Hz, 0.12s |
| `catchCombo(n≥3)` | Accord root+5e+octave, 0.25s |
| `expire()` | Triangle sweep 300→150 Hz, gain 0.12 (atténué vs. actuel) |
| `urgency(sec≤10)` | Sawtooth 220→440 Hz (monte chaque seconde), 0.05s |
| `gameEnd()` | Fanfare ascendante C4→E4→G4→C5 (4 notes, sinus) |

### SableMagiqueScene
- Bruit blanc filtré par `BiquadFilterNode` bandpass (Q=3)
- Cutoff 400→2000 Hz selon vélocité totale des doigts
- Gain = `clamp(totalVelocity / 200, 0, 0.18)` — silence quand immobile
- Burst triangle 300→200 Hz si vélocité > 50 px/frame (throttlé 200ms)

### JeuDeFicelleScene
- `pluck(fingerIndex, distT)` : triangle 0.04s attaque + sinus 0.6s décroissant, fréquences [392, 440, 523, 659, 784] Hz par doigt, throttlé 80ms/corde
- `collisionBurst()` : arpège C4→E4→G4 (0.04s chacun), throttlé 150ms

### Célébration nouveau record
- Fanfare 5 notes ascendante C4→E4→G4→C5→E5, sinus + triangle, queue reverb 1.5s

---

## Refonte écran de fin (GameOverScene)

### Titre
- ~~"GAME OVER"~~ (rouge, négatif)
- → **"TEMPS ÉCOULÉ"** en cyan `COLOR.brandPrimary` avec glow

### Score animé
- Count-up de 0 → score final via `this.tweens.addCounter`
- Durée : `min(score × 12ms, 1800ms)`, easing `Cubic.Out`

### Nouveau record
- Particules Phaser depuis la position du texte record (~40 particules radiales, palette `GAME_CIRCLE_PALETTE`, 1200ms)
- Pop-in du texte "★ NOUVEAU RECORD ★" avec `Back.Out` scale 0→1 (400ms)
- Pulsation alpha en boucle
- Son `celebrationFX.newRecord()`

### Timing
- Le son de fin se déclenche dans `GameScene.endGame()` (avant `scene.launch("GameOverScene")`)
- Plus dans `GameOverScene.create()`

---

## Fichiers à modifier

| Fichier | Changements |
|---|---|
| `src/audio/gameFX.ts` | **Créer** |
| `src/audio/sableFX.ts` | **Créer** |
| `src/audio/ficelleFX.ts` | **Créer** |
| `src/audio/celebrationFX.ts` | **Créer** |
| `src/scenes/GameOverScene.ts` | Titre, count-up, particules, célébration |
| `src/scenes/GameScene.ts` | urgency, gameEnd, combo tracker |
| `src/scenes/CirclePool.ts` | Champ `tier` sur `CircleConfig`, route vers `gameFX` |
| `src/games/sable-magique/SableMagiqueScene.ts` | Lifecycle `sableFX` |
| `src/games/cats-cradle/JeuDeFicelleScene.ts` | `prevCordsActive`, `ficelleFX` |
| `src/scenes/BootScene.ts` | `preload()` des MP3 si fournis |
