# AI Design System

Use this document when designing or implementing screens, flows, components, or interactions for any application. It defines a reusable visual and interaction language; it must remain independent of a product name, industry, domain model, route structure, data schema, framework, or platform-specific feature.

## Copyable agent brief

```text
Design this feature as part of a calm, focused, native-feeling application.

Start from the smallest representative viewport. Use one shared semantic flow across
small and large screens; larger layouts may add space but must not introduce a
second navigation model. Give every screen one clear purpose, one obvious
primary action, concise copy, readable metrics, and vertically scrollable
secondary content.

Use a quiet green-on-neutral visual language: a soft light or near-black dark
canvas, raised surfaces, readable primary text, muted supporting text, subtle
dividers, and one restrained accent. Use rounded corners sparingly. Prefer
full-width list rows over cards, dashboards, tabs, and dense grids when the
content is sequential.

Use native HTML semantics and controls: headings, links, buttons, forms,
details/summary, dialog, output, time, and lists. Preserve browser history,
native back behavior, focus, and platform scrolling. Avoid phone-only
navigation, horizontal tab bars, nested same-axis scrollers, drawers, bottom
sheets, custom swipe gestures, and tiny controls unless the product genuinely
requires them and the exception is documented.

Every interactive target must be at least 44px tall, keyboard reachable,
visibly focused, and named for assistive technology. Do not rely on color
alone. Support long labels without clipping, dark mode, reduced motion, 200%
text/zoom, offline or degraded loading where relevant, and narrow viewports
without horizontal overflow.

Prefer CSS and semantic HTML over JavaScript. Reuse the shared design tokens
and components. Keep the implementation simple, dependency-light, and
maintainable. Validate small and large viewports, keyboard focus, accessible
names, touch targets, scrolling, reduced motion, dark mode, long content, and
the relevant navigation and state flows before handoff.
```

## Product character

- Calm and utilitarian: reduce unnecessary decisions and visual noise.
- Focused: give each screen one primary metric, task, or action.
- Native-feeling: use browser and platform conventions for controls, scrolling, history, focus, and dialogs.
- Dense in information, spacious in interaction: information may be compact, but controls must remain generous.
- Honest status: distinguish available, active, complete, skipped, unavailable, error, and saving states.
- Quiet confidence: use motion and color as confirmation, not decoration.

## Visual tokens

Use semantic tokens as the source of truth. Product themes may change the values, but components should not invent unrelated one-off colors.

| Token | Light example | Dark example | Use |
| --- | --- | --- | --- |
| `--bg` | `#f1f5f1` | `#0d1210` | Application canvas |
| `--surface` | `#ffffff` | `#171e1a` | Controls and raised surfaces |
| `--surface-raised` | `#e5eee7` | `#203428` | Hover, focus, and selected surfaces |
| `--text` | `#17221a` | `#edf2ee` | Primary text |
| `--muted` | `#68766d` | `#a1aca4` | Supporting text |
| `--line` | `#d1ddd4` | `#344138` | Dividers and borders |
| `--accent` | `#17633f` | `#8fd0a9` | Primary action and emphasis |
| `--accent-soft` | `#dceee3` | `#21372a` | Secondary actions and selected rows |
| `--danger` | `#a45149` | `#e0a19a` | Destructive or cancel state |
| `--danger-soft` | `#f5e8e6` | `#2d2422` | Destructive surface |
| `--success` | `#18794e` | `#8fd0a9` | Completed or successful state |

Additional system values:

- Font: `ui-rounded`, `SF Pro Rounded`, `system-ui`, sans-serif.
- Base font size: at least 16px on the smallest layout.
- Base radius: `16px`; controls commonly use `12px–15px`; dialogs use `18px`.
- Interactive rows: at least `44px` tall; use more height when labels or supporting text need it.
- Main content: centered, full-height where appropriate, with a readable max width and consistent outer padding.
- Motion easing: `cubic-bezier(0.23, 1, 0.32, 1)`; disable nonessential motion for reduced-motion users.
- Numeric content uses tabular numerals when alignment improves comprehension.

## Typography

- Page titles are prominent, tightly tracked, bold, and allowed to wrap.
- Supporting copy is muted and short. Prefer a label or status line over a paragraph when it communicates the same thing.
- Use uppercase labels only for compact metadata, with strong weight and letter spacing.
- Never solve overflow by shrinking essential text. Wrap, scroll vertically, or move detail to a dedicated view.
- Maintain readable contrast and line length across light mode, dark mode, and increased text size.

## Layout and screen patterns

### Landing or overview

Show the current context as the title, followed by the small set of primary destinations or actions needed for the next decision. Keep status messaging visually quiet but announce important updates accessibly.

### List view

Use a full-width, vertically scrollable list with subtle dividers. A row is usually a native link or button with:

- a left-aligned primary label;
- optional secondary text beneath or at the right;
- a simple trailing indicator when needed;
- generous vertical alignment and a minimum 44px target.

Rows should feel like one continuous native list rather than a collection of floating cards. Use disabled rows for unavailable items and status rows for completed or informational items.

### Detail view

Use a clear title followed by one focused list of details or actions. When content becomes long, let it scroll vertically or move it to a dedicated view. Make the return path obvious and preserve meaningful browser or platform back behavior.

### Focused task stage

Use a full-height stage when a user is completing a task:

```text
title / context
supporting status or previous state
large metric, input, or timer when relevant

primary action near the bottom
secondary action beside or below it
```

Keep the action zone stable so it remains easy to find across related stages. Use one full-width accent primary button. Use a soft accent secondary button; use a two-column row only when both actions are genuinely equivalent and fit at the smallest target width.

### Stepper or numeric entry

Use a large, bordered, rounded stepper with a decrease button, centered live `output`, and increase button. Provide a visible label and accessible names such as `Decrease value` and `Increase value`. Support press-and-hold acceleration only when repeated changes are useful and the behavior remains discoverable.

### Confirmation

Use a native `dialog` for confirmation. Keep the question short, make the safe or primary action clear, and make cancellation obvious. Any responsive presentation must remain a real dialog with keyboard and backdrop behavior.

## Components and interaction contracts

### Primary button

- Full width in a focused stage or action list.
- Accent background with readable contrasting text.
- Strong weight, usually around 800.
- Minimum height 52px.
- Disabled state lowers opacity and prevents repeat submission.

### Secondary button

- Full width unless paired with an equivalent action.
- Soft accent background and accent text.
- Never visually competes with the primary action.

### List link or button

- Use a shared list-row pattern.
- Transparent row background by default.
- Raised surface on keyboard focus and fine-pointer hover.
- Decorative indicators do not replace meaningful link or button text.
- Keep the primary label from being compressed by trailing content.

### Status row

Use a non-interactive element with `role="status"` for saved, complete, on-track, or similar updates. Pair semantic color with text or an icon so color is never the only signal.

### Error state

Use a live `role="alert"` notice with the danger palette. Explain what happened and what the user can do next. Keep recoverable errors inside the current flow rather than replacing the whole screen.

### Icons

Use small, monochrome line icons with `currentColor`. Give action icons an accessible name and keep decorative icons hidden from assistive technology. Prefer a small consistent vocabulary over bespoke artwork for every action.

### Long labels and content

Preserve the full value. Use wrapping in titles, vertical scrolling in content, and a clearly discoverable expansion or detail view for long single-line values. Do not use ellipsis for essential information unless the full value remains accessible.

## Navigation and state

- Prefer native links for route changes and buttons for in-place actions.
- Use shallow, meaningful navigation and preserve browser or platform back behavior.
- Keep confirmation and cancellation explicit for consequential actions.
- Keep domain logic independent of rendering, navigation, timers, storage, and other side effects.
- Use explicit outcomes for navigation, rendering, loading, and errors.
- Preserve existing application state, persistence, compatibility, and offline behavior when adding UI.

## Accessibility and responsive gate

Before handoff, check the feature at the smallest representative viewport, a slightly smaller viewport, and a phone or desktop viewport as relevant. Also check 200% text/zoom, long labels, dark mode, reduced motion, keyboard focus, screen-reader names, touch targets, scrolling, loading/error states, and the relevant navigation flow.

The feature is not ready if any of these are true:

- horizontal overflow or clipped essential copy exists;
- an essential control is below 44px tall;
- focus is invisible or a control has no accessible name;
- a secondary action competes with the primary task;
- a gesture interferes with native scrolling or assistive technology;
- a larger layout introduces a separate navigation model without a documented reason;
- motion continues when reduced motion is requested;
- status or meaning depends on color alone;
- loading, saving, or error feedback is missing or ambiguous.

## Implementation principles

- Keep the system independent of any product, industry, route convention, data model, framework, or persistence layer.
- Prefer semantic HTML and CSS; add JavaScript only for behavior that cannot be expressed natively.
- Reuse shared tokens, components, and interaction contracts across equivalent views.
- Keep components small, focused, and easy to replace.
- Preserve user content and state when changing presentation.
- Escape untrusted or user-derived values before inserting them into HTML.
- Document deliberate exceptions to the interaction rules next to the implementation.

## Agent completion checklist

1. Confirm the screen has one primary task and a clear title.
2. Confirm the same semantic flow works across small and large viewports.
3. Confirm actions use native links, buttons, forms, disclosure, or dialog where appropriate.
4. Confirm targets, focus, labels, errors, status, reduced motion, dark mode, and long text.
5. Confirm scrolling, back behavior, loading, refresh, and state transitions for the affected flow.
6. Run the application's relevant static checks, tests, and route or interaction smoke tests.

When uncertain, choose the smaller, calmer, more native interaction that preserves the user's focus.
