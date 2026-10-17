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
    upLabel = '',
    onup,
    disabled = false,
  }: {
    children: Snippet;
    confirmLabel: string;
    onconfirm: () => void;
    undoLabel?: string;
    onundo?: () => void;
    upLabel?: string;
    onup?: () => void;
    disabled?: boolean;
  } = $props();

  let swipe = $state({ progress: 0, armed: false, dragging: false, axis: 'x' as 'x' | 'y' });
  let card: HTMLElement;
  let overflowing = $state(false);
  // Taking over vertical drags would stop a stage that is taller than the screen from scrolling.
  const canSwipeUp = $derived(Boolean(onup) && !overflowing);

  $effect(() => {
    const stage = card.querySelector('.workout-stage');
    if (!stage) return;
    const measure = () => (overflowing = stage.scrollHeight > stage.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  });
  let leaving = $state(false);
  const label = $derived(
    swipe.axis === 'y' ? upLabel : swipe.progress < 0 ? confirmLabel : undoLabel,
  );
  const badge = $derived(
    swipe.armed
      ? `✓ Release to ${label.toLowerCase()}`
      : swipe.axis === 'y'
        ? `↑ ${upLabel}`
        : swipe.progress < 0
          ? `← ${confirmLabel}`
          : `${undoLabel} →`,
  );

  const options = {
    disabled: () => disabled,
    allow: (direction: 1 | -1) => direction < 0 || Boolean(onundo),
    allowUp: () => canSwipeUp,
    onProgress: (progress: number, armed: boolean, dragging: boolean, axis: 'x' | 'y') =>
      (swipe = { progress, armed, dragging, axis }),
    onArm: () => cue('pick'),
    onCommit: (direction: 1 | -1 | 'up') => {
      markSwipeLearned();
      if (direction === 'up') return onup?.();
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
  bind:this={card}
  style:touch-action={canSwipeUp ? 'none' : 'pan-y'}
  style:--swipe={swipe.axis === 'x' ? swipe.progress : 0}
  style:--swipe-y={swipe.axis === 'y' ? swipe.progress : 0}
  style:--swipe-abs={Math.abs(swipe.progress)}
  use:swipeToConfirm={options}
>
  {@render children()}
  <div class="swipe-badge" aria-hidden="true">{badge}</div>
</div>
