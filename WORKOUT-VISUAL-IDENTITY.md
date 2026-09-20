# Workout Visual Identity

Reusable visual and interaction direction for Workout-style products. This document describes the identity visible in the current app, so it can be recreated in another web, mobile, or native product without copying the implementation.

## 1. Identity in one sentence

Workout is **quietly technical, physically grounded, and action-first**: a calm training tool that puts the next useful decision in reach, uses space and typography to make effort legible, and avoids decorative fitness-app energy.

## 2. Brand character

### Attributes

- **Calm:** low visual noise, soft sage surfaces, restrained motion.
- **Capable:** precise numbers, explicit states, reliable feedback.
- **Focused:** one task per screen and one obvious next action.
- **Native-feeling:** familiar system controls, natural scrolling, clear back behavior.
- **Honest:** no inflated claims, no color-only status, no mystery behind recommendations.
- **Physical:** the identity is anchored by the barbell mark, large metrics, touchable rows, and timer-first workout stages.

### Avoid

- Neon gym or esports styling.
- Black backgrounds with aggressive red/orange accents as the default.
- Dashboard grids, floating cards, pill-heavy UI, and phone tab bars.
- Tiny labels, clipped exercise names, fake swipe navigation, or decorative animation.
- Motivational copy that competes with the actual workout instruction.

## 3. Logo and image direction

The mark is a simple, symmetrical barbell: a mint-green horizontal bar with four blocky plates on a near-black field. It should feel engineered and balanced, not illustrated or aggressive.

- Use a flat geometric silhouette.
- Keep the barbell centered with generous negative space.
- Use the mint accent on dark charcoal for app icons and launch surfaces.
- Do not add gradients, shadows, flames, lightning, photographs, or bodybuilding imagery to the core mark.
- For product imagery, prefer close, abstract, high-contrast details: plates, bars, timer digits, hands, and clean equipment surfaces.

## 4. Color system

Use semantic tokens. Product implementations may rename the tokens, but the relationships should remain stable.

### Light theme

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#F1F5F1` | Main canvas; pale cool sage |
| `--surface` | `#FFFFFF` | Inputs, controls, dialogs |
| `--surface-raised` | `#E5EEE7` | Hover, focus, selected row |
| `--text` | `#17221A` | Primary copy and metrics |
| `--muted` | `#68766D` | Supporting copy and metadata |
| `--line` | `#D1DDD4` | Dividers and quiet borders |
| `--accent` | `#17633F` | Primary action and emphasis |
| `--accent-soft` | `#DCEEE3` | Secondary action and selected surface |
| `--danger` | `#A45149` | Cancel, destructive, limit reached |
| `--danger-soft` | `#F5E8E6` | Destructive background |
| `--success` | `#18794E` | Complete, saved, on-track |

### Dark theme

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0D1210` | Main canvas |
| `--surface` | `#171E1A` | Inputs, controls, dialogs |
| `--surface-raised` | `#203428` | Hover, focus, selected row |
| `--text` | `#EDF2EE` | Primary copy and metrics |
| `--muted` | `#A1ACA4` | Supporting copy and metadata |
| `--line` | `#344138` | Dividers and quiet borders |
| `--accent` | `#8FD0A9` | Primary action and emphasis |
| `--accent-soft` | `#21372A` | Secondary action and selected surface |
| `--danger` | `#E0A19A` | Cancel, destructive, limit reached |
| `--danger-soft` | `#2D2422` | Destructive background |
| `--success` | `#8FD0A9` | Complete, saved, on-track |

### Color rules

- Use one accent family for action, focus, progress, and selection.
- Use a muted line instead of a heavy card border.
- Pair status color with text, icon, shape, or native semantics; never rely on color alone.
- Keep primary action text high contrast. In dark mode, the mint primary button uses dark forest text.
- Reserve danger for cancellation, destructive actions, and hard limits—not general emphasis.

## 5. Typography

Use a rounded system sans stack:

```css
font-family: ui-rounded, 'SF Pro Rounded', system-ui, sans-serif;
```

| Role | Direction |
| --- | --- |
| Base text | `16px` minimum on small screens; tabular numerals |
| Screen title | Bold, tight tracking, allowed to wrap; roughly `30–50px` |
| Section heading | Roughly `22–28px`, compact and direct |
| Supporting text | Muted color, around `0.9rem`, line-height around `1.4` |
| Workout metric | Very large, tight tracking, tabular numerals; roughly `42–96px` |
| Timer | The dominant object on timer stages; scale to the viewport |
| Labels | Short, explicit, sentence case; uppercase is reserved for compact stepper labels |

Typography should feel like a readable instrument panel: strong numbers, short labels, generous line height where copy wraps, and no novelty display font.

## 6. Layout grammar

Design from the smallest representative canvas first, especially a watch-like viewport around `225 × 225`. Larger screens add breathing room but keep the same semantic flow and navigation model.

```text
screen title / current context
short status or instruction
primary content: list, detail, metric, or timer
primary action
secondary or destructive action
```

### Geometry

- Center the readable region when extra width exists; cap it around `34rem`.
- Use `12px` outer padding on the smallest canvas.
- Prefer an `8px` rhythm: `4`, `8`, `12`, `16`, `20`, `24`.
- Use `16px` as the dominant radius; controls use `12–15px`; dialogs use about `18px`.
- Keep interactive targets at least `44px`; primary buttons are normally `52px` or taller.
- Use full-width content rows and vertical flow instead of floating cards.
- Let long content scroll vertically. Never solve overflow by shrinking essential text.

## 7. Core components

### Screen shell

One focused section with a real heading, readable content region, and an action zone. Every screen should answer: where am I, what matters now, what can I do, and how do I go back?

### List rows

Lists are the main navigation and data primitive. Use full-width, border-separated rows with generous hit areas. A row can contain a label, supporting metadata, and a simple line icon at the trailing edge.

- Default row height: about `52px` on compact screens, `64px` when space permits.
- Row padding: about `8px 2px`; preserve horizontal room for long labels.
- Use a thin divider, not a card shadow.
- Links navigate; buttons perform local actions.
- A selected row uses the soft accent background and accent edge treatment.
- A completed row uses success color and a check icon.
- A disabled/rest row uses muted color and a dash or equivalent neutral icon.

### Primary button

Full width, solid accent fill, bold label, high contrast. It is the strongest visual object in an action zone and should describe the next action (`Start`, `Save`, `Finish`, `Continue`).

### Secondary button

Full width, soft accent surface, accent text, quieter than the primary. Use it for alternate progress paths or safe supporting actions.

### Destructive action

Explicitly labeled, separated from continuation, and shown with danger color/surface. Never hide cancellation behind an unlabeled icon.

### Dialog

Use a native dialog with a concise title, a short consequence statement, and stacked actions. On narrow screens it may visually sit at the bottom with a subtle handle, but it remains a real dialog with Escape and keyboard support.

### Stepper

One grouped control with a visible label, large minus/plus targets, and a centered output. Use a surface, one quiet border, and accent-colored controls. The value should be the visual center.

### Focused workout stage

Use a stable stage layout:

```text
exercise or stage title
instruction / set context / previous performance
large metric or timer
primary action
secondary actions
```

Keep the stage vertically scrollable. Use wake-lock or haptics only as progressive enhancement; the visual and semantic flow must work without them.

## 8. Interaction language

- Prefer native links, buttons, forms, `dialog`, `details`, and browser history.
- Use vertical scrolling and native Digital Crown-like behavior; do not invent horizontal tab navigation.
- Preserve browser/Android back behavior: detail → parent → Today.
- Use a whole row as the target for list navigation.
- For long labels, allow wrapping first. A short delayed hold-to-reveal or marquee can help with scanning, but the full text must remain accessible.
- Feedback is immediate and legible: selected rows, checkmarks, status text, and a single short transition.
- Motion is soft and short. The app uses an ease-out curve similar to `cubic-bezier(0.23, 1, 0.32, 1)` and avoids constant motion.
- Respect reduced motion by removing transitions, marquee, confetti, and nonessential animation.

## 9. Content and voice

Write like a precise coach, not a hype machine.

- Use short, concrete labels: `Start`, `Continue`, `Finish`, `Routine`, `History`.
- Put the useful number first: `Set 2 of 4`, `Target: 8–10 reps · 2 RIR`.
- Explain recommendations in plain language and expose uncertainty when a value is heuristic.
- State consequences before destructive confirmation: completed sets remain saved, or cancellation will discard the active session.
- Avoid exclamation marks, slogans, guilt, and exaggerated promises.
- Keep system states human: `No workouts yet`, `Not completed`, `On track`, `Rest`.

## 10. Iconography

Use a small, consistent set of geometric line icons. Icons are supporting signals, not the only label.

- Stroke style: rounded or clean geometric line, approximately `2–2.5px`.
- Typical size: `20–22px` in rows; optically larger only for primary workout feedback.
- Use chevron for navigation, check for completed/success, dash for unavailable/rest, plus/minus for steppers, and refresh for update actions.
- Keep icons monochrome and inherit the current text/accent color.
- Hide decorative SVGs from assistive technology and provide accessible labels for icon-only controls.

## 11. Responsive and accessibility contract

Validate every screen at:

- `225 × 225` watch-sized viewport.
- A smaller watch-sized viewport.
- Phone width.
- `200%` text/zoom.
- Light and dark color schemes.
- Reduced motion and forced colors.
- Keyboard focus and screen-reader names/headings.
- Long labels, empty/error states, refresh/resume, offline use, and vertical scrolling.

The identity is not successfully reproduced if there is horizontal overflow, clipped essential copy, a target below `44px`, invisible focus, unnamed controls, color-only meaning, or a second navigation model on larger screens.

## 12. Starter token block

```css
:root {
  --bg: #f1f5f1;
  --surface: #fff;
  --surface-raised: #e5eee7;
  --text: #17221a;
  --muted: #68766d;
  --line: #d1ddd4;
  --accent: #17633f;
  --accent-soft: #dceee3;
  --danger: #a45149;
  --danger-soft: #f5e8e6;
  --success: #18794e;
  --radius: 16px;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  font-family: ui-rounded, 'SF Pro Rounded', system-ui, sans-serif;
  color: var(--text);
  background: var(--bg);
  font-size: 16px;
}
```

## 13. Prompt-sized version

> Design a calm, watch-first fitness interface with a pale sage canvas, dark forest typography, mint/emerald actions, rounded system sans, full-width divider-separated list rows, large tabular workout metrics, and native-feeling links, buttons, dialogs, scrolling, and back navigation. Use one focused task per screen, one obvious primary action, generous 44px targets, soft short motion, and vertical overflow. Keep copy precise and honest. Avoid neon gym aesthetics, dense dashboards, tab bars, floating cards, tiny text, clipped labels, and decorative complexity. Support light/dark mode, reduced motion, keyboard/screen readers, long content, and a 225×225 watch-sized viewport first.
