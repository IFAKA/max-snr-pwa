<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cue } from '../browser/feedback.ts';
  import { markSwipeLearned, swipeToConfirm } from '../browser/swipe-log.ts';

  // A workout screen as a card: drag left to confirm its main action, right to undo, so the right
  // thumb sweeps toward its palm. The card
  // follows the finger and a badge names what releasing does. Every action keeps its own button,
  // so taps, the keyboard and screen readers never need the gesture.
  let {
    children,
    confirmLabel,
    onconfirm,
    undoLabel = '',
    onundo,
    disabled = false,
  }: {
    children: Snippet;
    confirmLabel: string;
    onconfirm: () => void;
    undoLabel?: string;
    onundo?: () => void;
    disabled?: boolean;
  } = $props();

  let swipe = $state({ progress: 0, armed: false, dragging: false });
  let leaving = $state(false);
  const label = $derived(swipe.progress < 0 ? confirmLabel : undoLabel);
  const badge = $derived(
    swipe.armed
      ? `✓ Release to ${label.toLowerCase()}`
      : swipe.progress < 0
        ? `← ${confirmLabel}`
        : `${undoLabel} →`,
  );

  const options = {
    disabled: () => disabled,
    allow: (direction: 1 | -1) => direction < 0 || Boolean(onundo),
    onProgress: (progress: number, armed: boolean, dragging: boolean) =>
      (swipe = { progress, armed, dragging }),
    onArm: () => cue('pick'),
    onCommit: (direction: 1 | -1) => {
      markSwipeLearned();
      if (direction > 0) return onundo?.();
      // The card slides away; if the screen is still here a moment later, it slides back.
      leaving = true;
      setTimeout(() => (leaving = false), 700);
      onconfirm();
    },
  };
</script>

<div
  class="swipe-card"
  data-armed={swipe.armed}
  data-dragging={swipe.dragging}
  data-leaving={leaving}
  style:--swipe={swipe.progress}
  style:--swipe-abs={Math.abs(swipe.progress)}
  use:swipeToConfirm={options}
>
  {@render children()}
  <div class="swipe-badge" aria-hidden="true">{badge}</div>
</div>
