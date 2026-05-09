@AGENTS.md

# ds — Design System Joy Motion TV
- **ds** (`~/.claude/skills/ds/SKILL.md`) - créer ou appliquer le design system Joy Motion TV. Trigger : `/ds`
- `/ds add <nom>` → créer un nouveau composant DS (composant, export, vitrine, doc)
- `/ds apply` → appliquer le DS à une scène Phaser existante
- `/ds` → analyser et guider selon le contexte

When the user types `/ds`, invoke the Skill tool with `skill: "ds"` before doing anything else.

**Référence DS :** `src/design-system/DESIGN_SYSTEM.md` — à lire avant tout travail UI.
**Référence qualité :** `.agents/code-quality.md` — contrat qualité obligatoire avant de finaliser une tâche.

# create-new-game — Créer un mini-jeu Joy Motion TV
- **create-new-game** (`~/.claude/skills/create-new-game/SKILL.md`) - créer le squelette complet d'un nouveau jeu. Trigger : `/create-new-game`

When the user types `/create-new-game`, invoke the Skill tool with `skill: "create-new-game"` before doing anything else.

# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
