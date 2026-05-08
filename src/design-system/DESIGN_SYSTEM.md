# Joy Motion TV — Design System

> Référence vivante du design system. Mettre à jour à chaque ajout de composant.

---

## Principes fondamentaux

**Joy Motion TV** : habillage de jeu de mouvement pour enfants (4–10 ans), TV-friendly, fun, très lisible, construit **majoritairement en code Phaser** (pas de sprites).

| Principe | Règle |
|---|---|
| Phaser-first | Pas de sprites pour les éléments UI — tout en Graphics, Text, Container, Tween |
| Couleurs du thème | Uniquement les tokens — jamais de valeurs hardcodées |
| Polices | Fredoka (titres/feedbacks) · Nunito Sans (UI/labels) — jamais Orbitron |
| Lisibilité | Gros textes, contrastes forts, zones interactives larges |
| Motion | Rapide (120–350 ms), Back.easeOut pour les apparitions, Sine pour les loops |

---

## Tokens — `src/design-system/tokens.ts`

### Couleurs

```typescript
import { COLOR, HEX } from "../design-system/tokens";
// COLOR.* → strings CSS ("#1D2340")
// HEX.*   → nombres Phaser (0x1d2340)
```

| Token | CSS | Usage |
|---|---|---|
| `nightBlue` | `#1D2340` | Texte principal, fonds de badges, contours |
| `punchyPink` | `#FF4F93` | Cibles, vies, feedbacks positifs, danger |
| `sunYellow` | `#FFC93C` | Récompenses, combos, meilleur score, warning |
| `turquoise` | `#20CFC9` | Boutons CTA, progression, action principale |
| `popPurple` | `#7B61FF` | Timer, niveaux, badges secondaires, info |
| `cream` | `#FFF8F2` | Fond principal |
| `white` | `#FFFFFF` | Fond des cartes, texte sur fonds colorés |
| `textPrimary` | `#1D2340` | = nightBlue |
| `textSecondary` | `#4A5068` | Texte secondaire |
| `textMuted` | `#8B93B0` | Labels, hints, placeholders |
| `bgCanvas` | `#FFF8F2` | = cream |
| `bgSurface` | `#FFFFFF` | = white |
| `bgElevated` | `#F0EBE3` | Surfaces légèrement élevées |

### Typographies

```typescript
import { FONT } from "../design-system/tokens";

FONT.display  // "Fredoka" → titres, feedbacks, valeurs importantes, CTAs
FONT.ui       // "Nunito Sans" → labels, descriptions, scores, hints
FONT.identity // "Fredoka" (alias backward compat)
```

**Tailles recommandées :**
- Titre principal : `72–80px` Fredoka
- Feedback burst : `48px` Fredoka 700
- Valeur badge : `38–42px` Fredoka
- Titre carte : `21–24px` Fredoka
- Label UI : `13–16px` Nunito Sans 700
- Hint/muted : `11–13px` Nunito Sans 600

### Tokens de design

```typescript
import { TOKENS } from "../design-system/tokens";

TOKENS.radius.sm   // 12  → petits coins arrondis
TOKENS.radius.md   // 20  → coins moyens
TOKENS.radius.lg   // 28  → coins larges (cartes)
TOKENS.radius.pill // 999 → forme pill complète (boutons)

TOKENS.spacing.xs  // 8
TOKENS.spacing.sm  // 16
TOKENS.spacing.md  // 24
TOKENS.spacing.lg  // 32
```

### Profondeurs Z

```typescript
import { DEPTH } from "../design-system/tokens";

DEPTH.webcam  // -10  → flux webcam
DEPTH.bg      //  1   → fond, décorations
DEPTH.game    //  5   → éléments de gameplay
DEPTH.hud     // 10   → UI en jeu (badges, boutons)
DEPTH.topUi   // 20   → UI prioritaire (overlays)
DEPTH.cursor  // 30   → curseurs main
```

---

## Composants — Décision rapide

> **Quelle question se poser :** *Qu'est-ce que cet élément fait pour le joueur ?*

| Besoin | Composant | Import |
|---|---|---|
| Afficher le score | `createScoreBadge()` | `components/ScoreBadge` |
| Afficher le temps restant | `createTimerBadge()` | `components/TimerBadge` |
| Afficher les vies | `createLivesBadge()` | `components/LivesBadge` |
| Cible à toucher en jeu | `createTarget()` | `components/Target` |
| Feedback positif (+100) | `showFeedback()` | `components/FeedbackBurst` |
| Feedback combo (×5) | `showCombo()` | `components/ComboBadge` |
| Barre de progression | `createProgressBar()` | `components/ProgressBar` |
| Carte de sélection de jeu | `createGameCard()` | `components/GameCard` |
| Bouton action (JOUER, REJOUER) | `DwellButton` | `DwellButton` |
| Flèche de navigation (◀/▶) | `NavArrow` | `components/NavArrow` |
| Animation d'apparition | `popIn()` | `motion/animations` |
| Animation pulsation (active) | `pulse()` | `motion/animations` |
| Animation destruction | `hitFeedback()` | `motion/animations` |
| Animation erreur | `shake()` | `motion/animations` |
| Célébration | `confetti()` | `motion/animations` |

---

## API complète des composants

### `createTarget(scene, x, y, variant?, radius?)`

Cible gameplay en cercles concentriques — **tout en code, sans sprite**.

```typescript
import { createTarget } from "../design-system/components/Target";
import type { TargetVariant, TargetState, TargetHandle } from "../design-system/components/Target";

const target = createTarget(scene, x, y, "pink", 52);
// variant : "pink" | "yellow" | "turquoise" | "purple"
// radius  : défaut 52

target.setState("idle");    // repos
target.setState("active");  // pulse en boucle
target.setState("hit");     // scale up + fade → auto-détruit
target.setState("missed");  // grisé

target.container // Phaser.GameObjects.Container
target.destroy() // nettoyage manuel
```

**Règles :** Toujours `setState("active")` quand la cible est prête à être touchée. `hit` déclenche la destruction automatique. Ne pas appeler `destroy()` après `hit`.

---

### `createScoreBadge(scene, x, y, initialBest?)`

Badge HUD score — fond nightBlue, Fredoka, badge best sunYellow.

```typescript
import { createScoreBadge } from "../design-system/components/ScoreBadge";
import type { ScoreBadgeHandle } from "../design-system/components/ScoreBadge";

const score = createScoreBadge(scene, 100, height * 0.06, bestScore);
score.setValue(1250);           // met à jour + anime le chiffre
score.setValue(1250, 2450);     // met à jour score + best
score.container                 // Container Phaser
score.destroy()
```

**Placement recommandé :** `x ≈ 100, y ≈ height * 0.06` (coin haut gauche).

---

### `createTimerBadge(scene, x, y)`

Badge HUD timer — fond popPurple pill, icône horloge, Fredoka.

```typescript
import { createTimerBadge } from "../design-system/components/TimerBadge";
import type { TimerBadgeHandle } from "../design-system/components/TimerBadge";

const timer = createTimerBadge(scene, cx, height * 0.06);
timer.setTime(60);   // mise à jour — passe en sunYellow si ≤ 10s
timer.container
timer.destroy()
```

**Placement recommandé :** `x ≈ cx, y ≈ height * 0.06` (centre haut).

---

### `createLivesBadge(scene, x, y, initialLives?)`

Badge HUD vies — fond punchyPink pill, symboles ♥/♡.

```typescript
import { createLivesBadge } from "../design-system/components/LivesBadge";
import type { LivesBadgeHandle } from "../design-system/components/LivesBadge";

const lives = createLivesBadge(scene, width - 100, height * 0.06, 3);
lives.setLives(2);   // met à jour (recalcule la largeur)
lives.container
lives.destroy()
```

**Placement recommandé :** `x ≈ width - 100, y ≈ height * 0.06` (coin haut droit).

---

### `showFeedback(scene, x, y, points, customLabel?)`

Feedback burst temporaire — apparaît, monte, disparaît. **Auto-détruit.**

```typescript
import { showFeedback } from "../design-system/components/FeedbackBurst";

showFeedback(scene, x, y, 100);              // "BRAVO ! +100" rose
showFeedback(scene, x, y, 200);              // "SUPER ! +200" jaune
showFeedback(scene, x, y, 300);              // "GÉNIAL ! +300" turquoise
showFeedback(scene, x, y, 0, "RECORD !");    // label custom, pas de points
```

**Durée totale ≈ 900 ms.** Appeler au centre de l'action (position de la cible touchée).

---

### `showCombo(scene, x, y, multiplier)`

Badge combo starburst jaune — apparaît + pulse + disparaît. **Auto-détruit.**

```typescript
import { showCombo } from "../design-system/components/ComboBadge";

showCombo(scene, cx, cy, 5); // "x5" en starburst jaune
```

---

### `createProgressBar(scene, x, y, width?, height?)`

Barre de progression pill — fond crème, fill turquoise.

```typescript
import { createProgressBar } from "../design-system/components/ProgressBar";
import type { ProgressBarHandle } from "../design-system/components/ProgressBar";

const bar = createProgressBar(scene, cx, y, 300, 18);
bar.setProgress(0.75);  // 0.0 → 1.0
bar.container
bar.destroy()
```

---

### `createGameCard(scene, config)`

Carte de sélection de jeu — fond blanc, bande accent, cercle icône, Fredoka + Nunito.

```typescript
import { createGameCard } from "../design-system/components/GameCard";
import type { GameCardConfig, GameCardHandle } from "../design-system/components/GameCard";

const card = createGameCard(scene, {
  name:      "Kung Foo",
  desc:      "Frappe les ninjas !",
  tag:       "ACTION",
  icon:      "🥷",          // emoji affiché dans le cercle accent
  accentHex: HEX.punchyPink,
  accentCss: COLOR.punchyPink,
});

card.container.setPosition(x, y);
card.redraw(380, 220, true);   // active : grande, description visible, badge ACTIF
card.redraw(260, 175, false, 0.65); // inactive : petite, réduite, semi-transparente

// Textes exposés pour tweens spécifiques :
card.tag / card.icon / card.title / card.desc / card.activeBadge
card.destroy()
```

**Dimensions recommandées :** active `380×220`, inactive `260×175`, scale `0.82`.

---

### `DwellButton` — Bouton d'action principal

Bouton pill turquoise avec ring de progression pour l'activation main.

```typescript
import { DwellButton } from "../design-system/DwellButton";
import type { DwellButtonConfig } from "../design-system/DwellButton";

const btn = new DwellButton(scene, x, y, {
  label:       "JOUER →",    // texte Fredoka
  onActivate:  () => { ... },
  dwellMs:     1200,          // durée de charge (défaut 1200)
  drainMs:     500,           // vitesse de vidage (défaut 500)
  zonePad:     70,            // zone autour du bouton (défaut 70)
  cooldownMs:  500,           // pause post-activation (défaut 500)
  depth:       DEPTH.hud,
  fontSize:    "28px",        // défaut "28px"
  fillColor:   HEX.turquoise, // défaut turquoise — peut être punchyPink, nightBlue...
});

// Dans update() de la scène :
btn.update(this.handPositions, delta);
btn.reset(); // après activation pour réutilisation
```

**Usage :** CTAs (`JOUER`, `REJOUER`, `← MENU`), toujours y ≤ `height * 0.50`.

---

### `NavArrow` — Flèche de navigation

Bouton circulaire ◀/▶ avec ring dwell — pour le carousel menu.

```typescript
import { NavArrow } from "../design-system/components/NavArrow";
import type { NavArrowConfig } from "../design-system/components/NavArrow";

const arrow = new NavArrow(scene, x, y, {
  direction:  "left",          // "left" | "right"
  onActivate: () => { ... },
  radius:     44,              // défaut 44
  dwellMs:    900,             // défaut 900 (plus rapide que DwellButton)
  fillColor:  HEX.nightBlue,   // défaut nightBlue — turquoise pour droite
  depth:      DEPTH.hud,
});

// Dans update() :
arrow.update(this.handPositions, delta);
arrow.reset();
```

**Usage :** navigation carousel uniquement. Gauche = nightBlue, droite = turquoise (convention).

---

### Animations — `motion/animations.ts`

```typescript
import { popIn, pulse, hitFeedback, shake, confetti } from "../design-system/motion/animations";

popIn(scene, gameObject)           // scale 0.85→1, 140ms, Back.easeOut
                                   // → apparition d'une cible, d'un badge

const tween = pulse(scene, obj)    // scale ↔1.08, loop Sine 650ms
tween.stop()                       // arrêter la pulsation

hitFeedback(scene, obj, () => {    // scale 1.35 + fade, 300ms
  obj.destroy()                    // callback de nettoyage
})

shake(scene, obj)                  // ±8px horizontal, 4 cycles, 45ms
                                   // → erreur, mauvaise zone

confetti(scene, x, y, 20)         // 20 rectangles colorés qui retombent
                                   // → victoire, record, fin de round
```

---

## Règles UX — Non-négociables

### Placement des boutons

> **Tous les boutons interactifs doivent être à `y ≤ height × 0.50`**

```
y ≈ 0.08–0.14  → Titre / branding
y ≈ 0.20–0.30  → Bouton(s) d'action principal(aux) ← ICI
y ≈ 0.45–0.75  → Zone gameplay / carousel / cibles
y ≈ 0.80–0.90  → Scores, records (lecture seule)
```

### Activation par dwell

Toute interaction main = dwell temporisé visible. **Ne jamais activer au simple survol.**

- `DwellButton.dwellMs` : 900–1500 ms selon criticité
- `NavArrow.dwellMs` : 700–1000 ms (navigation légère)
- Ring de progression punchyPink visible pendant la charge

### Bouton retour — Standard obligatoire

Chaque scène de jeu **doit** avoir un `DwellButton` retour :

```typescript
this.btnBack = new DwellButton(this, 100, height * 0.12, {
  label:      "← MENU",
  fontSize:   "20px",
  onActivate: () => this.scene.start("MenuScene"),
  depth:      DEPTH.hud,
  dwellMs:    1000,
  fillColor:  HEX.nightBlue,
});
```

---

## Règles visuelles

### Fonds et surfaces
- Fond global : `HEX.cream` (#FFF8F2)
- Cartes / panneaux : `HEX.white` avec ombre douce (alpha 0.06–0.10)
- **Jamais de fond sombre** en dehors de la webcam elle-même

### Ombres
```typescript
// Ombre douce standard (à appliquer avant le fond)
gfx.fillStyle(0x000000, 0.07);
gfx.fillRoundedRect(x + 3, y + 5, w, h, radius);
```

### Texte sur fond coloré → blanc
### Texte sur fond clair → nightBlue ou textSecondary

### Coins arrondis
- Boutons : `TOKENS.radius.pill` (999 → toujours pill)
- Cartes : `TOKENS.radius.lg` (28)
- Badges : `TOKENS.radius.md` (20) ou `H/2` pour pill automatique
- Petits éléments : `TOKENS.radius.sm` (12)

---

## Règles de performance

- **Éviter `gfx.clear()` + redraw à chaque frame** — ne redessiner que si l'état change
- **Throttler la webcam** : `15–24 fps` selon la scène
- **Throttler le tracker MediaPipe** : `15–20 fps` pour les menus, `20–24 fps` pour le gameplay
- **`pulse()` retourne un Tween** → stocker la référence pour pouvoir l'arrêter avec `tween.stop()`
- **`confetti()` est temporaire** — les Graphics se détruisent tout seuls, ne pas stocker

---

## Checklist d'intégration d'une nouvelle scène

```
□ Fond cream (ou webcam + voile cream alpha 0.70–0.80)
□ Toutes les couleurs via HEX.* et COLOR.*
□ Toutes les polices via FONT.display ou FONT.ui
□ Profondeurs via DEPTH.*
□ Bouton retour DwellButton à y ≤ height * 0.20
□ Score → createScoreBadge() si le jeu a un score
□ Timer → createTimerBadge() si le jeu a un timer
□ Vies → createLivesBadge() si le jeu a des vies
□ Feedbacks → showFeedback() sur chaque bonne action
□ Tous les boutons interactifs à y ≤ height * 0.50
□ update() appelle btn.update(handPositions, delta) pour chaque bouton
□ TypeScript sans erreurs (npx tsc --noEmit)
```

---

## Ajouter un composant — Protocole

1. **Fichier** : `src/design-system/components/<NomCamelCase>.ts`
2. **Pattern** : factory function `create<Nom>(scene, x, y, config?)` → retourne une interface `<Nom>Handle` avec `container` et `destroy()`
   - Exception : si le composant gère le dwell/interaction → class extends Container (cf. DwellButton, NavArrow)
3. **Couleurs** : uniquement `HEX.*` et `COLOR.*` — jamais de valeurs brutes
4. **Ombre** : toujours un rectangle/cercle légèrement décalé en fond (`alpha 0.07–0.12`)
5. **Export** : ajouter dans `src/design-system/index.ts`
6. **Vitrine** : ajouter une section dans `src/scenes/DesignSystemScene.ts`
7. **Documentation** : ajouter l'entrée dans ce fichier (DESIGN_SYSTEM.md)
