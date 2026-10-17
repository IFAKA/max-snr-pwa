<script lang="ts">
  import type { Snippet } from 'svelte';
  import { drawerPeek, settleDuration } from '../browser/drawer-peek.svelte.ts';
  import { cue } from '../browser/feedback.ts';
  import {
    ARM_RATIO,
    ARM_RATIO_LIGHT,
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
    quickConfirm = false,
    disabled = false,
  }: {
    children: Snippet;
    onconfirm: () => void;
    onundo?: () => void;
    onup?: () => void;
    /** The confirm action can be undone: it needs only a light swipe, with no ring. */
    quickConfirm?: boolean;
    disabled?: boolean;
  } = $props();

  let swipe = $state({ progress: 0, armed: false, dragging: false, axis: 'x' as 'x' | 'y' });
  let leaving = $state(false);
  let card: HTMLElement | undefined;
  // Up opens the exercise list, so the card owns vertical touch drags when it offers that.
  const canSwipeUp = $derived(Boolean(onup));
  // Only a confirm that cannot be undone gets the ring and the haptic at its threshold; undoable
  // actions (log set, undo, opening the list) act on a light swipe.
  const ringed = $derived(swipe.axis === 'x' && swipe.progress < 0 && !quickConfirm);
  // The ring fills as the drag nears the threshold and is full when releasing will commit.
  const ring = $derived(ringed ? Math.min(1, Math.abs(swipe.progress) / ARM_RATIO) : 0);
  const icon = $derived(swipe.axis === 'y' ? 'list' : swipe.progress < 0 ? 'confirm' : 'undo');

  let upCommit: { velocity: number } | null = null;

  // The finger let go: the drawer settles open (then the real one takes over) or drops back, over
  // a time that follows how fast the flick was.
  function releaseDrawer() {
    const ms = settleDuration(upCommit?.velocity ?? 0.3);
    drawerPeek.settleMs = ms;
    if (!upCommit) {
      drawerPeek.px = 0;
      setTimeout(() => (drawerPeek.settleMs = 0), ms);
      return;
    }
    upCommit = null;
    drawerPeek.px = card?.clientHeight ?? 0;
    drawerPeek.handoff = true;
    setTimeout(() => onup?.(), ms);
  }

  const options = {
    disabled: () => disabled,
    allow: (direction: 1 | -1) => direction < 0 || Boolean(onundo),
    allowUp: () => canSwipeUp,
    onProgress: (progress: number, armed: boolean, dragging: boolean, axis: 'x' | 'y') => {
      swipe = { progress, armed, dragging, axis };
      if (axis === 'x') drawerPeek.px = 0;
      // Up drags the drawer into view with the finger (progress is a share of the card height).
      else if (dragging) {
        drawerPeek.px = progress * (card?.clientHeight ?? 0);
        drawerPeek.settleMs = 0;
      } else queueMicrotask(releaseDrawer);
    },
    ratio: (direction: 1 | -1 | 'up') =>
      direction === -1 && !quickConfirm ? ARM_RATIO : ARM_RATIO_LIGHT,
    onArm: (direction: 1 | -1 | 'up') => {
      if (direction === -1 && !quickConfirm) cue('armed');
    },
    onCommit: (direction: 1 | -1 | 'up', velocity: number) => {
      markSwipeLearned();
      if (direction === 'up') {
        upCommit = { velocity };
        return;
      }
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
  data-vertical={canSwipeUp}
  style:--swipe={swipe.axis === 'x' ? swipe.progress : 0}
  style:--swipe-abs={swipe.axis === 'x' ? Math.abs(swipe.progress) : 0}
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
