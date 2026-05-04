// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "public/wasm/"] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ── TypeScript ──────────────────────────────────────────────────────────
      // Autorisé dans les boucles de jeu temps-réel pour éviter les allocations
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Les landmarks MediaPipe sont typés `any` dans le SDK
      "@typescript-eslint/no-explicit-any": "warn",
      // Les callbacks Phaser utilisent souvent des promesses non attendues
      "@typescript-eslint/no-floating-promises": "error",

      // ── Nommage ─────────────────────────────────────────────────────────────
      "@typescript-eslint/naming-convention": [
        "warn",
        // camelCase pour variables et paramètres
        { selector: "variable", format: ["camelCase", "UPPER_CASE"] },
        { selector: "parameter", format: ["camelCase"], leadingUnderscore: "allow" },
        // PascalCase pour classes, interfaces, types, enums
        { selector: "typeLike", format: ["PascalCase"] },
        // camelCase pour les méthodes
        { selector: "memberLike", format: ["camelCase"], leadingUnderscore: "allow" },
      ],

      // Identifiants trop courts (i, j, k OK dans les boucles, x/y OK pour coordonnées)
      "id-length": ["warn", { min: 2, exceptions: ["i", "j", "k", "x", "y", "z", "_"] }],

      // ── Complexité / taille ─────────────────────────────────────────────────
      // Complexité cyclomatique max 10 par fonction (warning au-delà)
      "complexity": ["warn", 10],
      // Max 200 lignes par fichier — au-delà, c'est signe de trop de responsabilités
      "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
      // Max 40 lignes par fonction (boucles de jeu exclues via // eslint-disable)
      "max-lines-per-function": ["warn", { max: 40, skipBlankLines: true, skipComments: true }],
      // Max 3 niveaux d'imbrication
      "max-depth": ["warn", 3],
      // Max 4 paramètres par fonction
      "max-params": ["warn", 4],
    },
  }
);
