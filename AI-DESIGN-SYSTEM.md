# AI Design System

This is a product-agnostic visual and interaction specification. Use it when an
agent designs, implements, reviews, or extends a screen. Preserve the system's
character even when the product, domain, content, routes, data model, framework,
or device changes. Replace examples with domain-appropriate language; do not
copy product-specific names or schemas.

The desired result is a calm, focused, native-feeling interface that is easy to
operate on a very small viewport and still feels intentional on a phone or
desktop. The design is information-dense but interaction-generous: show only
what is needed for the next decision, while keeping every action readable and
comfortable.

## Copyable agent brief

```text
Design a calm, focused, native-feeling application from the smallest
representative viewport first. Every screen has one clear purpose, one obvious
primary action, a concise title, and a shallow hierarchy. Use one semantic flow
at every viewport; larger screens may add breathing room, never a second
navigation model.

Use a quiet green-on-neutral visual language: a soft light or near-black dark
canvas, raised surfaces, strong readable text, muted supporting text, subtle
dividers, and one restrained accent. Prefer continuous full-width list rows to
floating cards, dashboards, tabs, and dense grids when content is sequential.
Use generous vertical spacing around actions, but do not make information
ornamental or wasteful.

Use native HTML semantics and controls: headings, links, buttons, forms,
details/summary, dialog, output, time, and lists. Links navigate; buttons act;
forms submit; dialogs confirm consequential choices. Preserve browser history,
native back behavior, keyboard focus, platform scrolling, and reduced-motion
preferences. Avoid phone-only tab bars, drawers, bottom sheets, nested same-axis
scrollers, custom swipe navigation, and tiny controls unless an explicit product
requirement justifies the exception.

Every interactive target is at least 44px tall, keyboard reachable, visibly
focused, and named for assistive technology. Never rely on color alone. Let
long labels wrap or scroll vertically. Support dark mode, 200% text/zoom,
reduced motion, narrow widths, offline/degraded states, loading, saving, error,
empty, disabled, active, and completed states.

Reuse shared tokens, semantic components, and interaction contracts. Prefer CSS
and native behavior over JavaScript. Keep domain logic separate from rendering,
navigation, storage, timers, and other side effects. Before handoff, test the
smallest viewport, a slightly smaller one, a phone/desktop expansion, keyboard
focus, screen-reader names, touch targets, scrolling, back behavior, long copy,
dark mode, reduced motion, and the complete affected state flow.
```

## Design character

- Calm and utilitarian: remove decoration that does not clarify state or action.
- Focused: one screen, one job; one primary action per decision point.
- Native-feeling: use platform conventions for links, controls, scrolling,
  focus, dialogs, history, and back navigation.
- Dense in information, spacious in interaction: compact metadata is acceptable;
  compact touch targets are not.
- Honest status: distinguish available, active, complete, skipped, unavailable,
  loading, saving, and error states in text as well as styling.
- Quiet confidence: motion, color, vibration, and celebration confirm an action;
  they do not compete with the task.

## Visual language

### Tokens

Use semantic tokens as the source of truth. A product may tune values, but a
component must not invent unrelated one-off colors or radii.

| Token | Light example | Dark example | Purpose |
| --- | --- | --- | --- |
| `--bg` | `#f1f5f1` | `#0d1210` | Application canvas |
| `--surface` | `#ffffff` | `#171e1a` | Controls and raised surfaces |
| `--surface-raised` | `#e5eee7` | `#203428` | Hover, focus, selected surfaces |
| `--text` | `#17221a` | `#edf2ee` | Primary text |
| `--muted` | `#68766d` | `#a1aca4` | Supporting text |
| `--line` | `#d1ddd4` | `#344138` | Dividers and borders |
| `--accent` | `#17633f` | `#8fd0a9` | Primary action and emphasis |
| `--accent-soft` | `#dceee3` | `#21372a` | Secondary and selected surfaces |
| `--danger` | `#a45149` | `#e0a19a` | Destructive or cancel state |
| `--danger-soft` | `#f5e8e6` | `#2d2422` | Destructive surface |
| `--success` | `#18794e` | `#8fd0a9` | Completed or successful state |

Recommended system values:

- Font: `ui-rounded`, `SF Pro Rounded`, `system-ui`, sans-serif.
- Base size: at least `16px` at the smallest viewport.
- Base radius: `16px`; controls `12px–15px`; dialogs about `18px`.
- Minimum target: `44px`; primary buttons normally `52px` or taller.
- Outer padding: `12px` at a small viewport, increasing gradually with space.
- Readable content width: approximately `34rem` unless the product needs more.
- Motion easing: `cubic-bezier(0.23, 1, 0.32, 1)`.
- Numeric values: use tabular numerals when alignment aids scanning.

### Surfaces and borders

The canvas should be visually quiet. Use the background for the page, the
surface color for controls or meaningful raised regions, and the raised surface
only to communicate focus, hover, selection, or emphasis. A divider is usually
more appropriate than a card border. Avoid a page made of many floating cards.

### Typography

- Page titles are prominent, bold, tightly tracked, and allowed to wrap.
- Titles may use a large responsive size, but never shrink essential copy to
  prevent wrapping.
- Supporting copy is short and muted; use a status line instead of a paragraph
  when both communicate the same thing.
- Uppercase text is reserved for compact metadata and uses strong weight and
  letter spacing.
- Line height should remain comfortable at 200% zoom.
- Dates, durations, counts, and measurements should have stable alignment when
  that improves comprehension.

### Icons and imagery

Use a small, consistent vocabulary of monochrome line icons with
`currentColor`. Icons are supporting affordances, not the only label. Give
action icons an accessible name; mark decorative icons as hidden from assistive
technology. Use imagery only when it adds meaning, not as a generic hero layer.

## Layout grammar

Start with a full-height, narrow canvas. The main region is centered when extra
width exists, but the small-screen composition remains the source of truth.

```text
page title / context
short status or supporting line
continuous list or focused content

stable action zone near the bottom when the screen is task-oriented
```

Rules:

- Keep horizontal overflow at zero. Let titles and values wrap; let long lists
  scroll vertically.
- Do not put a secondary same-axis scroller inside the main scroller. If a
  section becomes too long, move it to a dedicated view or disclosure.
- Use a stable action zone for repeated task stages so the primary control stays
  in a predictable location.
- Use full-width content on small screens. On larger screens, add whitespace and
  readable max width before adding columns.
- Do not solve overflow with clipped text, ellipsis on essential values, reduced
  font size, or compressed hit areas.

## Screen patterns

### Landing or overview

The title states the current context. Under it, show only the destinations or
actions required for the next decision. Status is visually quiet but announced
with `role="status"` when it changes. Keep secondary utilities below the main
decision and visually subordinate.

### List view

Use a continuous, vertically scrollable list with subtle dividers. A row usually
contains a left-aligned primary label, optional supporting text, and a simple
trailing indicator. The whole row is the target, not just the icon.

- Use a native link for navigation and a native button for an in-place action.
- Give rows at least `44px` height; use `52px–64px` where labels wrap or a
  secondary line is present.
- Keep the label from being compressed by trailing metadata.
- Use disabled rows for unavailable choices and non-interactive status rows for
  completed or informational items.
- Use a selected background and text/icon state together; do not rely on a dot
  or color alone.

### Detail view

Use a clear title followed by one focused list of details or actions. Make the
return path obvious through the browser/platform back behavior and meaningful
history entries. When details are long, scroll the page or move deeper content
to a dedicated screen instead of shrinking it into the first viewport.

### Focused task stage

Use a full-height stage for an activity that the user performs continuously:

```text
context / stage title
supporting state or next item
large metric, input, or timer

primary action
secondary action or escape path
```

The primary action is full width, accent colored, and near the bottom. A
secondary action uses the soft accent surface. Use two equal actions only when
they are genuinely equivalent and fit at the smallest target width. Keep the
metric visually dominant and the instruction concise.

### Stepper or numeric entry

Use a large bordered rounded control with decrease, centered live `output`, and
increase. Label the value visibly. Give buttons names such as `Decrease value`
and `Increase value`; expose the current value to assistive technology. Add
press-and-hold acceleration only when repeated changes are common and the
behavior is discoverable.

### Confirmation and consequential actions

Use a real native `dialog` for confirmation. Ask one short question, describe
the consequence only when needed, make the safe/primary choice obvious, and
make cancellation easy. Preserve keyboard, Escape, focus, backdrop, and native
dialog semantics. Do not use a custom div overlay as a substitute.

### Empty, loading, saving, and error states

- Empty: say what is absent and provide the next useful action if one exists.
- Loading: preserve the screen structure where possible and communicate that
  work is in progress without causing layout jumps.
- Saving: expose a concise status such as `Saving` or `Saved`; prevent duplicate
  submissions while the action is pending.
- Error: use `role="alert"`, the danger palette, a plain explanation, and a
  recovery action. Keep recoverable errors inside the current flow.
- Offline/degraded: state what remains available and avoid implying that data
  was persisted if it was not.

## Interaction contracts

### Actions

- One primary action per screen or stage.
- Primary: full width, accent background, strong weight, minimum `52px` high.
- Secondary: soft accent background and accent text; never competes with primary.
- Destructive: danger treatment and explicit confirmation when consequences are
  meaningful.
- Disabled: visibly unavailable, not focusable if native semantics permit, and
  never used as a replacement for explaining why an action cannot happen.
- On activation: prevent repeat submission, persist or transition state, then
  provide visible and accessible feedback.

### Navigation

Prefer native links for route changes and buttons for local state changes. Keep
navigation shallow and meaningful. Each transition must answer: where am I, what
can I do here, and how do I go back? Use browser history so browser, Android, and
assistive-technology back behavior unwind detail → parent → landing naturally.

Avoid horizontal phone-style tab bars, custom swipe navigation, fake gesture
systems, drawers, and generic bottom sheets. A deliberate exception must
document the user need, why native scrolling/disclosure/dialog is insufficient,
and how it remains keyboard and screen-reader operable. A narrow-screen dialog
may be visually presented from the bottom when it remains a real native
`dialog`, keeps focus/backdrop/Escape semantics, has a clear handle only as a
visual affordance, and does not require dragging to dismiss.

### Focus and feedback

Every interactive element needs a visible `:focus-visible` state with sufficient
contrast. After rendering a new view, move focus to its heading or first
meaningful control without stealing focus during an uninterrupted timer update.
Use semantic status or alert regions for changes that are not otherwise obvious.

Short transitions may fade or move a view by a few pixels. Never animate the
primary metric in a way that harms reading. Respect
`prefers-reduced-motion: reduce`; remove nonessential animation, marquee,
confetti, vibration, and drag effects there.

### Narrow content

Preserve the full value. For a long single-line label, prefer wrapping or a
dedicated vertically scrollable/detail view. If a temporary marquee or hold-to-
reveal treatment is truly needed, it is an enhancement only: the full value
must remain available to assistive technology and must not block scrolling or
activation.

### Timers and live values

Store an absolute end time rather than trusting an interval counter. Recompute
remaining time after refresh, tab switching, sleep, or visibility changes.
Keep the visual update lightweight, announce completion once, and provide a
clear action when the timer ends. A timer must never prevent cancellation or
make the user guess whether work was saved.

## Optional interaction enhancements

These are part of the system's feel only when they improve a real interaction.
They are enhancements over native behavior, never replacements for it.

### Magnetic list selection

For a long, sequential list on a small touch surface, a list may offer a
detent-like selection mode: nearby rows become easy to target, the active row is
visually highlighted, and the selected row activates its underlying native
link/button. Keep ordinary tap, click, keyboard, screen-reader, and vertical
scroll behavior fully functional. Do not hijack a list with horizontal motion,
prevent normal scrolling, or make a hidden gesture the only way to select.
Provide an accessible live status for the current selection and a clear cancel
row/action when selection mode is active.

### Long-label reveal

Labels normally remain still and wrap or scroll vertically. If a narrow row
needs a temporary reveal, holding or focusing the label may slowly pan the full
text after a short delay. Stop on release, pointer cancellation, blur, or a new
action. The full label must exist in the accessible name and must remain
available without the gesture.

### View transitions

Short cross-fade or small vertical-offset transitions may signal that a new view
has replaced the old one. Keep them brief, do not move controls unexpectedly,
and focus the new view's heading after navigation. Skip nonessential animation
when reduced motion is requested and never animate a live timer every tick.

### Haptics and wake behavior

Where the platform supports it, brief haptics may confirm timer completion or a
meaningful state change. They are supplemental and must never carry essential
meaning. During a focused timed task, a screen-wake request may prevent the
display from sleeping; release it when the task ends or the page is hidden, and
continue to function when the API is unavailable.

## Accessibility and responsive readiness gate

Validate every affected screen at:

- the smallest representative wearable/small viewport;
- a slightly smaller viewport;
- phone width and, when relevant, a larger desktop width;
- 200% text/zoom and long translated or user-generated labels;
- light mode, dark mode, forced colors, and reduced motion;
- keyboard-only navigation and visible focus;
- screen-reader names, headings, live status, dialog semantics, and form errors;
- touch targets, vertical scrolling, back behavior, refresh/resume, and offline
  or degraded loading.

The feature is not ready if it has horizontal overflow, clipped essential copy,
an essential target below `44px`, invisible focus, an unnamed control, ambiguous
loading/saving/error feedback, color-only meaning, gesture interference with
native scrolling or assistive technology, or a second navigation model at a
larger viewport.

## Implementation guidance

- Keep the system independent of product names, routes, data schemas,
  persistence layers, frameworks, and device-specific APIs.
- Prefer semantic HTML and CSS; use JavaScript only for behavior that cannot be
  expressed natively.
- Define reusable atoms (tokens, buttons, labels, icons), molecules (rows,
  steppers, notices, timer blocks), organisms (lists, action zones, dialogs),
  and pages (landing, list, detail, focused stage) without duplicating the
  semantic flow for different viewport sizes.
- Keep domain logic separate from rendering, navigation, timers, storage, and
  other side effects. Use explicit outcomes for loading, success, cancellation,
  errors, and navigation.
- Preserve user content and state when changing presentation. Escape all
  untrusted or user-derived values before inserting them into HTML.
- Keep components small and replaceable. Put deliberate exceptions next to the
  implementation and in the relevant design review.

## Agent completion checklist

1. Identify the screen's one primary task and write a clear title.
2. Choose the smallest suitable screen pattern and reuse its interaction
   contract.
3. Confirm the same semantic DOM/flow works at small and large viewports.
4. Confirm links, buttons, forms, disclosure, and dialog semantics are native.
5. Confirm primary/secondary/destructive hierarchy, disabled state, and feedback.
6. Confirm labels, focus, status/errors, touch targets, contrast, zoom, dark
   mode, reduced motion, long content, and no horizontal overflow.
7. Confirm scrolling, refresh/resume, persistence, loading, and back behavior.
8. Run the application's relevant static checks, tests, and route/interaction
   smoke tests before handoff.

When uncertain, choose the smaller, calmer, more native interaction that
preserves the user's focus and the full meaning of the content.
