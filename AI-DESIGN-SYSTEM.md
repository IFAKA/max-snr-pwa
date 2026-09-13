# MaxSNR Design System for AI Agents

Use this document when designing or implementing new screens, flows, components, or interactions for MaxSNR. Treat it as the product's visual and interaction contract. Preserve the feeling of the existing app: calm, focused, native, readable, and efficient on a smartwatch-sized canvas.

## Copyable agent brief

```text
Design this feature as part of MaxSNR, a watch-first workout PWA.

Start from the smallest representative smartwatch viewport, approximately 225×225 CSS pixels. The phone layout is an expansion of the same semantic flow, not a separate phone UI. Every screen must have one clear purpose, one obvious primary action, concise copy, large readable metrics, and vertically scrollable secondary content.

Use a quiet green-on-neutral visual language: soft off-white or near-black background, white or dark raised surfaces, dark readable text, muted gray-green secondary text, thin green-gray dividers, and a restrained green accent. Use rounded corners sparingly, with 12–18px radii. Prefer full-width list rows over cards, dashboards, tabs, or dense grids.

Use native HTML semantics and controls: headings, links, buttons, forms, details/summary, dialog, output, time, and lists. Preserve browser history and native back behavior. Do not invent phone-only navigation, horizontal tab bars, nested same-axis scrollers, drawers, bottom sheets, custom swipe gestures, or tiny controls. A bottom sheet is allowed only for a focused confirmation dialog and must retain a native dialog contract.

All interactive targets must be at least 44px tall, keyboard reachable, visibly focused, and named for assistive technology. Do not rely on color alone. Support long labels without clipping, dark mode, reduced motion, 200% text/zoom, offline loading, and watch widths without horizontal overflow.

Prefer CSS and semantic HTML over JavaScript. Reuse the existing design tokens and shared components. Keep the implementation dependency-free, maintainable, and consistent with the project's one-way architecture. Before calling the work complete, validate representative watch widths, a phone width, keyboard focus, screen-reader names, touch targets, vertical scrolling, reduced motion, dark mode, and the relevant route flow.
```

## Product character

- Calm and utilitarian: the interface should reduce decision-making during a workout.
- Focused: one primary metric or action per screen.
- Native-feeling: use browser controls, platform scrolling, history, focus, and dialogs.
- Dense in information, spacious in interaction: short rows can be information-dense, but controls must remain generous.
- Honest status: clearly distinguish available, active, complete, skipped, unavailable, error, and saving states.
- Quiet confidence: use animation and color as confirmation, not decoration.

## Visual tokens

Use these existing CSS custom properties as the source of truth. Do not create one-off colors unless a new semantic state genuinely requires one.

| Token | Light value | Dark value | Use |
| --- | --- | --- | --- |
| `--bg` | `#f1f5f1` | `#0d1210` | App canvas |
| `--surface` | `#fff` | `#171e1a` | Controls and raised surfaces |
| `--surface-raised` | `#e5eee7` | `#203428` | Hover/focus/selected surface |
| `--text` | `#17221a` | `#edf2ee` | Primary text |
| `--muted` | `#68766d` | `#a1aca4` | Supporting text |
| `--line` | `#d1ddd4` | `#344138` | Dividers and borders |
| `--accent` | `#17633f` | `#8fd0a9` | Primary action and emphasis |
| `--accent-soft` | `#dceee3` | `#21372a` | Secondary actions and selected rows |
| `--danger` | `#a45149` | `#e0a19a` | Destructive/cancel state |
| `--danger-soft` | `#f5e8e6` | `#2d2422` | Destructive surface |
| `--success` | `#18794e` | `#8fd0a9` | Completed/success state |

Additional system values:

- Font: `ui-rounded`, `SF Pro Rounded`, `system-ui`, sans-serif.
- Base font size: 16px on the smallest layout; 20px above 260px width.
- Base radius: `16px`; controls commonly use `12px–15px`; dialogs use `18px`.
- List row: `52px` minimum on the smallest layout, `64px` above 260px.
- Main content: centered, full viewport height, max-width `34rem`, with about `12px` outer padding.
- Motion easing: `cubic-bezier(0.23, 1, 0.32, 1)`.
- Numeric content uses tabular numerals.

## Typography

- Page titles are large, tightly tracked, bold, and allowed to wrap when necessary. Existing titles use roughly `30px–60px` depending on viewport.
- Workout titles are slightly smaller than page titles so the metric/action area remains usable.
- Workout metrics and timers are intentionally oversized, with compact line-height and tabular numerals.
- Supporting copy is muted and short. Avoid paragraphs when a label or status line is enough.
- Use uppercase labels only for compact control metadata such as `Load · kg` or `RIR`, with strong weight and letter spacing.
- Never solve overflow by shrinking essential text. Wrap, scroll vertically, or use the existing long-label hold-to-scroll/marquee behavior.

## Layout and screen patterns

### Today / landing

Today is the landing view. Show the current workout type as the title, then exactly two primary navigation actions: `Routine` and `History`. The current workout action or status may appear before those navigation rows. Keep update/status messaging visually quiet and announced accessibly.

### List view

Use a full-width, vertically scrollable list with thin top and bottom dividers. A row is usually a native link or button with:

- a left-aligned label;
- optional secondary text beneath or at the right;
- a 22px-ish line icon at the trailing edge;
- generous vertical alignment and a minimum 44px target.

Rows should feel like one continuous native list, not a collection of floating cards. Use a disabled row for unavailable/rest items and a status row for complete items.

### Detail view

Use a clear title followed by one focused list of details or actions. When a list becomes long, let it scroll vertically or move the detail to a dedicated route. Preserve the route structure and make browser/native back unwind detail → parent → Today.

### Workout stage

Workout screens use a full-height vertical stage:

```text
title / phase context
supporting status or previous performance
large metric or timer when relevant

primary action anchored near the bottom
secondary action beside or below it
```

Keep the action zone stable so the user's thumb can find it across phases. Use one full-width green primary button. Use a soft green secondary button for a safe alternative; use a two-column control row only when both actions are genuinely equivalent and fit at watch width.

### Stepper / numeric entry

Use a large, bordered, rounded stepper with a minus button, centered live `output`, and plus button. Buttons should be easy to press and support press-and-hold acceleration when the value benefits from repeated changes. Provide a visible label and an accessible name such as `Decrease load` / `Increase load`.

### Confirmation

Use a native `dialog` for confirmation. Keep the question short, put the safe/primary action first, and make cancellation obvious. On small phone widths a confirmation dialog may become a bottom sheet, but it must remain a real dialog with keyboard and backdrop behavior. Do not use an arbitrary modal overlay.

## Components and interaction contracts

### Primary button

- Full width in a stage or action list.
- Green `--accent` background with readable contrasting text.
- Strong weight, usually around 800.
- Minimum height 52px.
- Disabled state lowers opacity and blocks repeat submission.

### Secondary button

- Full width unless paired with an equivalent action in `.controls`.
- `--accent-soft` background and `--accent` text.
- Never visually compete with the primary action.

### List link/button

- Use the shared `list-link` pattern.
- Transparent row background by default.
- `--surface-raised` on keyboard focus and fine-pointer hover.
- Trailing icon is decorative; provide a screen-reader label or meaningful link text.
- Keep the row's primary label from being compressed by the trailing icon.

### Status row

Use a non-interactive `div` with `role="status"` for complete, on-track, saved, or similar states. Pair the status with a check icon and a semantic color, but include text so color is never the only signal.

### Error state

Use a live `role="alert"` notice with the existing error palette. Explain what happened and what the user can do next. Keep errors inside the app flow; do not replace the whole screen with a generic error page for a recoverable action.

### Icons

Use small monochrome line icons with `currentColor`, no decorative fills, and a clear accessible name when the icon communicates an action. Prefer the existing icon vocabulary: chevron, check, dash, minus, plus, download, upload.

### Long labels

Preserve the full label. Use wrapping in titles, vertical scrolling in content, and the existing hold-to-scroll or title marquee behavior for single-line list labels where a watch-sized row needs it. Never use ellipsis for essential information unless the full value remains discoverable.

## Navigation and state

- Prefer native links for route changes and buttons for in-place actions.
- Preserve trailing-slash-compatible routes: `/`, `/routine/`, `/history/`, `/workout/`.
- Use query parameters for detail views instead of duplicating HTML shells.
- Keep browser history meaningful. Back should return from detail to its parent; during an active workout, back/cancel requires an explicit confirmation.
- Keep domain logic independent of rendering, navigation, timers, and storage.
- Use explicit outcomes for navigation and rendering.
- Preserve the existing state schema, persistence behavior, and offline operation when adding UI.

## Accessibility and responsive gate

Before handoff, check the feature at 225×225, a smaller watch width, and a phone width. Also check 200% text/zoom, long labels, dark mode, reduced motion, keyboard focus, screen-reader names, and offline loading.

The feature is not ready if any of these are true:

- horizontal overflow or clipped essential copy exists;
- an essential control is below 44px tall;
- focus is invisible or a control has no accessible name;
- a secondary action competes with the primary task;
- a gesture interferes with native vertical scrolling or assistive technology;
- the phone layout introduces a separate navigation model;
- motion continues when reduced motion is requested;
- timer state fails to refresh or resume after visibility changes;
- the interface depends on color alone for meaning.

## Implementation rules for this repository

- Keep the app dependency-free and browser-native unless a requirement clearly needs a dependency.
- Reuse `styles.css` tokens and shared markup patterns.
- Put routine data in `js/routine-data.js`, persistence and compatibility in `js/storage.js`, workout rules in `js/workout/`, and user-visible workout markup/events in `js/render-workout/`.
- Keep workout domain modules independent of renderers.
- Escape user/history-derived values with `esc()` before inserting HTML.
- Use two-space indentation, semicolon-terminated JavaScript, concise camelCase names, and small focused modules.
- Do not add service-worker caching or alter persistence identifiers/schema without an explicit product requirement.

## Agent completion checklist

1. Confirm the screen has one primary task and a clear title.
2. Confirm the shared semantic DOM works for watch and phone widths.
3. Confirm all actions use native links, buttons, forms, details, or dialog where appropriate.
4. Confirm targets, focus, labels, errors, status, reduced motion, dark mode, and long text.
5. Confirm scrolling, browser back, refresh/resume, and offline behavior for the affected flow.
6. Run the repository's static checks and route smoke tests before reporting completion.

When uncertain, choose the smaller, calmer, more native interaction that preserves the user's focus.
