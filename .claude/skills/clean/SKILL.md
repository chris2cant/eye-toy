---
name: clean
description: Revue et correction du nommage, de la complexité cyclomatique et de la lisibilité du code TypeScript
trigger: /clean
---

# /clean

Revue et corrige le nommage, la complexité, et la lisibilité d'un fichier ou de tout `src/`.

## Usage

```
/clean src/scenes/GameScene.ts   # revue ciblée d'un fichier
/clean                           # revue complète de src/
```

## Ce que tu dois faire

### Étape 1 — Mesure objective

Lance ESLint sur la cible :
```bash
pnpm lint 2>&1
```

Note toutes les violations `complexity`, `max-lines`, `max-lines-per-function`, `max-depth`, `max-params`, `naming-convention`.

Pour chaque fichier concerné, lis-le en entier.

### Étape 2 — Diagnostic

Présente un tableau concis :

| Fichier | Problème | Sévérité |
|---------|----------|----------|
| GameScene.ts:45 | complexité 14 dans `handleLandmarks()` | ⚠ élevée |
| BootScene.ts:12 | variable `d` — nom trop court | ℹ faible |

### Étape 3 — Corrections (applique directement, pas de questions)

**Nommage — règles de ce projet :**
- Variables : camelCase, min 2 caractères, nom qui décrit l'intention (pas le type)
  - `d` → `delta`, `p` → `position`, `cb` → `onComplete`
  - Éviter les suffixes de type : `handData` → `handLandmarks`, `arr` → `items`
- Booleans : préfixe `is`, `has`, `can`, `should` — `active` → `isActive`
- EventEmitter listeners : `on` + nom d'événement — `handler` → `onLandmarks`
- Constantes module-level : UPPER_CASE

**Complexité — techniques de réduction :**
- Early return pour les garde-fous en tête de fonction
- Extraire les blocs `if/else` imbriqués en méthodes privées nommées
- Remplacer les switch/if chains par des maps d'objets si > 3 cas
- Séparer "récupérer les données" de "agir sur les données"

**Taille de fonction :**
- Si > 40 lignes : chercher un sous-problème nommable et l'extraire
- Les boucles de jeu (`update()`) peuvent dépasser si elles délèguent à des méthodes courtes

### Étape 4 — Vérification finale

Après chaque correction :
1. `pnpm lint` — zéro nouvelles erreurs
2. `npx tsc --noEmit` — pas de régression TypeScript

### Étape 5 — Résumé

```
Corrigé dans GameScene.ts :
  - handleLandmarks() : complexité 14→6 (3 méthodes extraites)
  - 4 variables renommées (d→delta, p→palmPosition…)
  - update() : 52→38 lignes (logique collision extraite dans checkBallCollision)
```

## Ce que tu ne fais pas

- Ne pas reformater le code (Prettier s'en charge)
- Ne pas ajouter d'abstraction si une seule utilisation
- Ne pas déplacer du code entre fichiers (utilise /split pour ça)
- Ne pas écrire de commentaires qui expliquent ce que le code fait déjà
