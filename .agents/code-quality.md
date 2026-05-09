# Code Quality Contract

Ce document définit le niveau de qualité minimal attendu pour toute modification de code.

## Definition of Done

- `pnpm lint` doit retourner `0 error` et `0 warning`.
- Toute nouvelle fonction doit rester lisible et testable.
- Aucun changement cosmétique non nécessaire au ticket en cours.

## Limites de structure

- Complexité cyclomatique max par fonction: `10`
- Nombre de lignes max par fonction: `40`
- Nombre de lignes max par fichier: `200`
- Nombre de paramètres max par fonction: `4` (utiliser un objet `options` sinon)

## Règles de lisibilité

- Préférer les early returns au nesting profond.
- Extraire les blocs de logique en helpers nommés quand un bloc dépasse 5-10 lignes ou mélange plusieurs responsabilités.
- Utiliser des noms explicites orientés intention (`verb + domain`).
- Éviter les identifiants à un seul caractère hors cas standards (`x`, `y`, `i`).

## Règles de refactor

- Si un fichier dépasse la limite, extraire en modules ciblés:
  - `*Config.ts` pour constantes et paramètres
  - `*UI.ts` pour composition et widgets UI
  - `*Gameplay.ts` pour orchestration gameplay
  - `*Effects.ts` / `*FX.ts` pour effets visuels et audio
- Garder la scène principale comme orchestrateur.
- Préserver strictement le comportement gameplay lors des extractions.

## Validation avant livraison

1. Lancer `pnpm lint`.
2. Corriger tous les warnings et erreurs.
3. Vérifier rapidement les fichiers modifiés avec le linter IDE.
4. Ne finaliser la tâche qu'une fois l'état lint propre.
