---
name: split
description: Découpe un fichier TypeScript trop gros en modules focused avec de bonnes responsabilités
trigger: /split
---

# /split

Découpe un fichier TypeScript en modules plus petits, chacun avec une seule responsabilité claire.

## Usage

```
/split src/scenes/GameScene.ts    # découpe un fichier spécifique
/split                            # analyse tout src/ et propose les fichiers à découper
```

## Ce que tu dois faire

### Si aucun fichier n'est précisé

1. Lance `pnpm lint 2>&1 | grep "max-lines"` pour trouver les fichiers qui dépassent 200 lignes.
2. Liste aussi : `find src -name "*.ts" | xargs wc -l | sort -rn | head -10`
3. Présente les candidats (fichier, nb lignes, raison) et demande lequel traiter.

### Pour un fichier ciblé

**Étape 1 — Analyse**

Lis le fichier en entier. Identifie :
- Les blocs logiques distincts (état, rendu, physique, input, utils…)
- Les dépendances entre blocs (quoi appelle quoi)
- Les règles d'architecture AGENTS.md à respecter :
  - Zéro import MediaPipe dans les scènes Phaser
  - Les landmarks passent uniquement par l'EventEmitter
  - HandTracker reste isolé dans `src/camera/`

**Étape 2 — Proposition**

Affiche un plan clair :
```
GameScene.ts (187 lignes) → 3 fichiers :
  src/scenes/GameScene.ts       (~60 lignes)  orchestration principale
  src/scenes/BallPhysics.ts     (~70 lignes)  logique physique balle
  src/scenes/InputHandler.ts    (~50 lignes)  gestion landmarks → actions
```

Explique en une phrase pourquoi chaque frontière.

**Étape 3 — Exécution** (seulement après accord explicite de l'utilisateur)

- Crée les nouveaux fichiers avec le code extrait
- Met à jour les imports dans le fichier d'origine et partout où il est référencé
- Supprime le code déplacé du fichier d'origine
- Vérifie que `pnpm lint` passe sans nouvelles erreurs
- Vérifie que TypeScript compile : `npx tsc --noEmit`

## Règles

- Ne jamais créer de fichier de plus de 150 lignes (hors commentaires et blancs)
- Une classe = un fichier. Pas de barrel files inutiles.
- Noms de fichiers : PascalCase pour les classes, camelCase pour les utilitaires
- Après le split, chaque module doit avoir une responsabilité décrivable en une phrase
- Ne pas sur-ingéniérer : 2 bons fichiers valent mieux que 5 trop petits
