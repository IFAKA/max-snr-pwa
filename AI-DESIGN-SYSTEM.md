# AI Design System

This is a product-agnostic visual and interaction specification. Use it when an
agent designs, implements, reviews, or extends a screen. Product names, routes,
data schemas, persistence layers, frameworks, and device APIs belong to the
consuming application—not to this system.

The desired result is calm, focused, native-feeling UI that works on a very
small viewport first and expands gracefully to a phone or desktop. The system
is information-dense but interaction-generous: show what is needed for the
next decision, while keeping every action readable and comfortable.

## Core principles

- One screen has one clear purpose, one concise title, and one obvious primary action.
- Use one semantic flow at every viewport; larger screens add breathing room, never a second navigation model.
- Prefer native HTML semantics and browser behavior over simulated controls.
- Prefer continuous full-width rows and vertical flow over floating cards, tabs, dashboards, and dense grids when content is sequential.
- Use visual hierarchy to clarify state, not decoration to compete with the task.
- Preserve the full meaning of long labels and user content; never solve overflow with tiny text or clipped controls.
- Color, motion, haptics, and icons supplement meaning; they never carry essential meaning alone.

## Layout grammar

Start from the smallest representative canvas. Center the readable region when
extra width exists, but keep the small-screen composition as the source of
truth.

```text
screen title / current context
short supporting status or instruction
primary content: list, detail, metric, or timer
primary action
secondary or destructive actions
```

The canonical semantic shell is:

```html
<main id="app">
  <section aria-labelledby="screen-title">
    <h1 id="screen-title">Screen title</h1>
    <div class="primary-content">
      <!-- one focused content region -->
    </div>
    <div class="action-zone">
      <!-- primary and secondary actions -->
    </div>
  </section>
</main>
```

Every screen should answer, in order: where am I, what matters now, what can I
do, and how do I go back? Move secondary content into a vertically scrollable
list, a dedicated detail view, or a native disclosure instead of cramming it
into the first viewport.

## Tokens

Use semantic tokens as the source of truth. A product may tune the values, but
components must not invent unrelated one-off colors, radii, spacing, or motion.

### Color

| Token              | Light example | Dark example | Purpose                         |
| ------------------ | ------------- | ------------ | ------------------------------- |
| `--bg`             | `#f1f5f1`     | `#0d1210`    | Application canvas              |
| `--surface`        | `#ffffff`     | `#171e1a`    | Controls and raised surfaces    |
| `--surface-raised` | `#e5eee7`     | `#203428`    | Hover, focus, selected surfaces |
| `--text`           | `#17221a`     | `#edf2ee`    | Primary text                    |
| `--muted`          | `#68766d`     | `#a1aca4`    | Supporting text                 |
| `--line`           | `#d1ddd4`     | `#344138`    | Dividers and borders            |
| `--accent`         | `#17633f`     | `#8fd0a9`    | Primary action and emphasis     |
| `--accent-soft`    | `#dceee3`     | `#21372a`    | Secondary and selected surfaces |
| `--danger`         | `#a45149`     | `#e0a19a`    | Destructive or cancel state     |
| `--danger-soft`    | `#f5e8e6`     | `#2d2422`    | Destructive surface             |
| `--success`        | `#18794e`     | `#8fd0a9`    | Completed or successful state   |

Always pair color with text, shape, iconography, or native status semantics.
Check contrast in light mode, dark mode, and forced colors.

### Recommended type, space, and shape values

| Token or property | Recommendation                                              |
| ----------------- | ----------------------------------------------------------- |
| Font              | `ui-rounded`, `SF Pro Rounded`, `system-ui`, sans-serif     |
| Base size         | At least `16px` at the smallest viewport                    |
| Base radius       | `16px`; controls `12px–15px`; dialogs about `18px`          |
| Minimum target    | `44px`; primary buttons normally `52px` or taller           |
| Outer padding     | `12px` at a small viewport, increasing with available space |
| Readable width    | Approximately `34rem` unless the product needs less         |
| Motion easing     | `cubic-bezier(0.23, 1, 0.32, 1)`                            |
| Numeric values    | Tabular numerals when alignment improves scanning           |

Prefer an `8px` spacing scale: `4`, `8`, `12`, `16`, `20`, `24`. Promote any
value used more than once to a token.

## Shared semantic components

### Titles

Use a real heading with a stable ID and connect the containing region with
`aria-labelledby`. Titles are prominent, tightly tracked, and allowed to wrap.
A marquee or temporary reveal is progressive enhancement only; the complete
title must remain available to assistive technology.

### Lists and rows

Use a semantic `<ul>` with one `<li>` per item. The canonical interactive row is:

```html
<li>
  <a class="list-link" href="/target/">
    <span>Label</span>
    <svg aria-hidden="true"><!-- supporting icon --></svg>
  </a>
</li>
```

Links navigate, buttons act, and labels own form controls. Make the whole row
the target, keep it at least `44px` tall, and use a divider rather than a card
where the content is sequential. Empty, disabled, loading, error, active, and
completed rows need text or semantic status—not styling alone.

### Buttons and actions

Use native `<button>` for actions and a visible text label whenever possible.
Primary actions are full-width, high-contrast, and visually dominant. Secondary
actions use a quieter surface. Destructive actions are explicit and separated
from safe continuation. Every control has a visible focus state and accessible
name.

### Forms and steppers

Use visible `<label>` elements, native input types, `inputmode`, constraints,
and connected help/error text. Keep inputs at least `16px` on mobile. Use a
native `<select>` when platform selection is the clearest interaction.

A stepper is one grouped semantic control: two labeled buttons and a central
`<output>`. Keep side controls large enough to operate without precision.

### Dialogs and disclosures

Use native `<dialog>`, `details`, and `summary` when they fit. Dialogs need a
labeled heading, sensible focus behavior, Escape support, an explicit safe
action, and a no-motion path. A narrow-screen dialog may visually enter from
the bottom only when it remains a real native dialog and does not require
dragging to dismiss. Do not use generic bottom sheets for ordinary navigation.

### Focused stages, metrics, and timers

For a focused task, keep a stable structure:

```html
<section class="focused-stage" aria-labelledby="stage-title">
  <div class="stage-info">
    <h1 id="stage-title">Task title</h1>
    <!-- instruction, metric, or timer -->
  </div>
  <div class="action-zone">
    <!-- primary and secondary actions -->
  </div>
</section>
```

Use one prominent metric or instruction. Store an absolute end time for timers,
recompute after refresh, visibility changes, and sleep, and announce
completion once. A timer must never block cancellation or make saved state
ambiguous.

## Navigation and interaction

Prefer native links for route changes and buttons for local state changes. Keep
navigation shallow and meaningful. Use browser history so browser, Android, and
assistive-technology back behavior unwind detail → parent → landing naturally.

Avoid horizontal phone-style tab bars, custom swipe navigation, fake gesture
systems, nested same-axis scrollers, and drawers. A deliberate exception must
document the user need, why native scrolling/disclosure/dialog is insufficient,
and how keyboard and screen-reader operation remains available.

Optional enhancements may include magnetic list selection, temporary long-label
reveal, short view transitions, haptics, or wake behavior. They are never the
only path to selection, meaning, navigation, or completion. Gestures must not
hijack vertical scrolling or assistive technology.

## Responsive and accessibility gate

Validate every affected screen at a representative watch-sized viewport such as
`225 × 225`, a smaller watch viewport, a phone width, and 200% text/zoom.
Also validate light mode, dark mode, forced colors, reduced motion, keyboard
navigation, screen-reader names and headings, long labels, empty/error states,
vertical scrolling, back behavior, refresh/resume, and offline/degraded state.

The feature is not ready if it has horizontal overflow, clipped essential
copy, a target below `44px`, invisible focus, an unnamed control, ambiguous
feedback, color-only meaning, gesture interference, or a second navigation
model at a larger viewport.

Respect `prefers-reduced-motion: reduce`: remove nonessential movement,
marquee, confetti, vibration, and drag effects while preserving understandable
state changes. Do not animate a live metric every tick.

## Construction method

Build in this order:

1. Define the screen's one task and title.
2. Choose the smallest suitable pattern: landing, list, detail, form, dialog, or focused stage.
3. Build the semantic HTML and native interaction path first.
4. Apply shared tokens and the same DOM at every viewport.
5. Add progressive enhancement only for behavior native HTML cannot provide.
6. Add visual polish only when it improves comprehension, feedback, or spatial continuity.
7. Document any exception and apply the pattern consistently to equivalent screens.
8. Run static checks and inspect the complete affected state flow before handoff.

Keep product-specific composition in an adapter layer. The adapter maps product
routes, copy, data, and domain outcomes onto these generic atoms, molecules,
organisms, and page patterns; it does not redefine their semantics or create a
second watch/phone system.

## Agent completion checklist

- One primary task, concise title, and clear primary action.
- Shared tokens and semantic components reused.
- Same semantic DOM and navigation model at every viewport.
- Native links, buttons, forms, disclosures, dialogs, and scrolling used where applicable.
- Primary, secondary, destructive, disabled, loading, error, empty, active, and completed states are explicit.
- Labels, focus, status announcements, touch targets, contrast, zoom, dark mode, reduced motion, and long content verified.
- Timers, persistence, refresh/resume, offline behavior, and back navigation verified when relevant.
- Any unavailable real-device or browser evidence reported rather than assumed.

When uncertain, choose the smaller, calmer, more native interaction that
preserves the user's focus and the full meaning of the content.
