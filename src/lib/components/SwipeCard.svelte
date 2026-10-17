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

  // A workout screen as a card, the way Tinder deals them: drag left to confirm its main action,
  // right to undo, so the right thumb sweeps toward its palm. The card follows the finger, tilts and
  // fades, a stamp names what releasing does, and each crossing of the threshold ticks like a
  // detent. Every action keeps its own button, so taps, the keyboard and screen readers never need
  // the gesture.
  let {
    children,
    onconfirm,
    onundo,
    onup,
    quickConfirm = false,
    confirmLabel = 'Done',
    undoLabel = 'Undo',
    behindConfirm,
    behindUndo,
    disabled = false,
  }: {
    children: Snippet;
    onconfirm: () => void;
    onundo?: () => void;
    onup?: () => void;
    /** The confirm action can be undone: it needs only a light swipe. */
    quickConfirm?: boolean;
    /** Short words stamped on the card while dragging toward each action. */
    confirmLabel?: string;
    undoLabel?: string;
    /** The screen each action leads to, shown behind the card while it is dragged that way. */
    behindConfirm?: Snippet;
    behindUndo?: Snippet;
    disabled?: boolean;
  } = $props();

  let swipe = $state({ progress: 0, armed: false, dragging: false, axis: 'x' as 'x' | 'y' });
  let leaving = $state<'left' | 'right' | null>(null);
  let card: HTMLElement | undefined;
  // Up opens the exercise list, so the card owns vertical touch drags when it offers that.
  const canSwipeUp = $derived(Boolean(onup));
  // Only a confirm that cannot be undone needs the long drag; undoable actions (log set, undo,
  // opening the list) act on a light swipe.
  const ratio = (direction: 1 | -1 | 'up') =>
    direction === -1 && !quickConfirm ? ARM_RATIO : ARM_RATIO_LIGHT;
  const sideways = $derived(swipe.axis === 'x' ? swipe.progress : 0);
  // Each stamp fades in as the drag nears its threshold and is solid once releasing will act.
  const confirmReveal = $derived(sideways < 0 ? Math.min(1, -sideways / ratio(-1)) : 0);
  const undoReveal = $derived(sideways > 0 ? Math.min(1, sideways / ratio(1)) : 0);
  // The next screen waits under the card on the side being dragged toward, and comes forward as
  // the card leaves; it stays mounted while the card is thrown so the real screen replaces it.
  const behindSide = $derived(leaving ?? (sideways < 0 ? 'left' : sideways > 0 ? 'right' : null));
  const behind = $derived(
    behindSide === 'left' ? behindConfirm : behindSide === 'right' ? behindUndo : undefined,
  );
  const peek = $derived(leaving ? 1 : Math.max(confirmReveal, undoReveal));

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
    ratio,
    onThreshold: (_direction: 1 | -1 | 'up', armed: boolean) => cue(armed ? 'armed' : 'disarmed'),
    onCommit: (direction: 1 | -1 | 'up', velocity: number) => {
      markSwipeLearned();
      if (direction === 'up') {
        upCommit = { velocity };
        return;
      }
      // The card flies off the way it was thrown; if the screen is still here a moment later (the
      // action failed or kept it), it springs back.
      leaving = direction > 0 ? 'right' : 'left';
      setTimeout(() => (leaving = null), 700);
      if (direction > 0) return onundo?.();
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
  style:--swipe={sideways}
  style:--swipe-abs={Math.abs(sideways)}
  style:--confirm-reveal={confirmReveal}
  style:--undo-reveal={undoReveal}
  style:--peek={peek}
  data-lifted={Boolean(behindSide)}
  use:swipeToConfirm={options}
>
  {#if behind}
    <div class="swipe-behind" inert aria-hidden="true">{@render behind()}</div>
  {/if}
  <div class="swipe-sheet">
    {@render children()}
    <div class="swipe-stamps" aria-hidden="true">
      <span class="swipe-stamp is-confirm">{confirmLabel}</span>
      {#if onundo}<span class="swipe-stamp is-undo">{undoLabel}</span>{/if}
    </div>
  </div>
</div>
