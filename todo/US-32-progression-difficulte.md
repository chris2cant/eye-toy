# US-32 — Progression de difficulté

**Statut :** ✅ Terminé  
**Milestone :** M3 — Game feel & polish  
**Dépend de :** US-23

## Story

En tant que joueur, le jeu devient progressivement plus difficile au fil des 60 secondes, pour maintenir l'intérêt et le challenge jusqu'à la fin.

## Critères d'acceptance

- [ ] Les 20 premières secondes : spawn toutes les 2s, ronds de 80px, durée de vie 5s
- [ ] De 20 à 40 secondes : spawn toutes les 1.5s, ronds de 65px, durée de vie 4s
- [ ] De 40 à 60 secondes : spawn toutes les 1s, ronds de 50px, durée de vie 3s
- [ ] La transition entre les paliers est progressive (pas de saut brutal)
- [ ] Le bonus de points augmente avec la difficulté (+10 / +15 / +20)

## Notes techniques

- Gérer les paliers dans `GameScene` via le temps écoulé `(60 - remaining)`
- Reconfigurer le `TimerEvent` de spawn à chaque palier (`timer.delay = newDelay`)
- Passer les paramètres du palier courant à la fonction de spawn
- Afficher discrètement le palier actuel en UIScene (optionnel)
