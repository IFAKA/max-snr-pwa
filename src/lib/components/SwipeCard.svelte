<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cue } from '../browser/feedback.ts';
  import {
    ARM_RATIO,
    ARM_RATIO_UP,
    markSwipeLearned,
    swipeToConfirm,
  } from '../browser/swipe-log.ts';

  // A workout screen as a card: drag left to confirm its main action, right to undo, so the right
  // thumb sweeps toward its palm. The card
  // follows the finger and a badge names what releasing does. Every action keeps its own button,
  // so taps, the keyboard and screen readers never need the gesture.
  let {
    children,
    onconfirm,
    onundo,
    onup,
    disabled = false,
  }: {
    children: Snippet;
    onconfirm: () => void;
    onundo?: () => void;
    onup?: () => void;
    disabled?: boolean;
  } = $props();

  let swipe = $state({ progress: 0, armed: false, dragging: false, axis: 'x' as 'x' | 'y' });
  let leaving = $state(false);
  // Up opens the exercise list, so the card owns vertical touch drags when it offers that.
  const canSwipeUp = $derived(Boolean(onup));
  // The ring fills as the drag nears the threshold and is full when releasing will commit.
  const ring = $derived(
    Math.min(1, Math.abs(swipe.progress) / (swipe.axis === 'y' ? ARM_RATIO_UP : ARM_RATIO)),
  );
  const icon = $derived(swipe.axis === 'y' ? 'list' : swipe.progress < 0 ? 'confirm' : 'undo');

  const options = {
    disabled: () => disabled,
    allow: (direction: 1 | -1) => direction < 0 || Boolean(onundo),
    allowUp: () => canSwipeUp,
    onProgress: (progress: number, armed: boolean, dragging: boolean, axis: 'x' | 'y') =>
      (swipe = { progress, armed, dragging, axis }),
    onArm: () => cue('armed'),
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
  data-vertical={canSwipeUp}
  style:--swipe={swipe.axis === 'x' ? swipe.progress : 0}
  style:--swipe-y={swipe.axis === 'y' ? swipe.progress : 0}
  style:--swipe-abs={Math.abs(swipe.progress)}
  style:--ring={ring}
  use:swipeToConfirm={options}
>
  {@render children()}
  <div class="swipe-ring" aria-hidden="true">
    <svg class="swipe-ring-progress" viewBox="0 0 80 80">
      <circle class="swipe-ring-track" cx="40" cy="40" r="36" />
      <circle class="swipe-ring-bar" cx="40" cy="40" r="36" pathLength="1" />
    </svg>
    <svg class="swipe-ring-icon" viewBox="0 0 24 24">
      {#if icon === 'confirm'}
        <path d="M5 12.5l4.5 4.5L19 7" />
      {:else if icon === 'undo'}
        <path d="M9 6L4 11l5 5M4 11h10a5 5 0 010 10h-2" />
      {:else}
        <path d="M5 7h14M5 12h14M5 17h14" />
      {/if}
    </svg>
  </div>
</div>
