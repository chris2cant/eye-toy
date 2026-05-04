# US-11 — Collision main/rond → disparition animée

**Statut :** ✅ Terminé  
**Milestone :** M1 — Gameplay de base  
**Dépend de :** US-10

## Story

En tant que joueur, quand je pose ma main sur un rond, il disparaît avec une petite animation, pour avoir un feedback immédiat et valider la détection de collision.

## Critères d'acceptance

- [ ] La collision est détectée quand le centre de la main est dans le rayon du rond
- [ ] Animation de disparition : scale `1 → 0` + fade out en **150ms**
- [ ] Un rond ne peut être attrapé qu'une seule fois (pas de double pop)
- [ ] Les deux mains peuvent attraper des ronds simultanément
- [ ] L'événement `"circle:popped"` est émis (pour US-21)

## Notes techniques

- Détection de collision : distance euclidienne entre `(handX, handY)` et `(circleX, circleY)` < `rayon + 20px` (zone de tolérance)
- Point de référence main recommandé : **landmark 9** (milieu de la paume) ou moyenne des 21 landmarks
- Utiliser `Phaser.Math.Distance.Between(x1, y1, x2, y2)`
- Vérifier la collision dans le handler `"landmarks"` de `GameScene`
- Désactiver le rond (`.setActive(false)`) avant le tween pour éviter les doubles détections
