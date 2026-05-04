# US-31 — Effets sonores

**Statut :** ✅ Terminé  
**Milestone :** M3 — Game feel & polish  
**Dépend de :** US-11, US-12, US-23

## Story

En tant que joueur, j'entends des sons différents quand j'attrape un rond, quand un rond expire, et quand la partie se termine, pour un feedback sensoriel complet.

## Critères d'acceptance

- [ ] Son "pop" court et joyeux quand un rond est attrapé
- [ ] Son "raté" discret quand un rond expire
- [ ] Son de fin de partie (fanfare ou buzzer) à Game Over
- [ ] Volume raisonnable, pas agressif
- [ ] Fonctionne sans interaction préalable (autoplay policy : déclenché après le clic "Jouer")

## Notes techniques

- Charger les assets dans `BootScene.preload()` : `this.load.audio("pop", "assets/pop.wav")`
- Jouer avec `this.sound.play("pop")` dans `GameScene`
- Assets libres de droits : Freesound.org (licence CC0)
- Taille cible par son : < 50 Ko
