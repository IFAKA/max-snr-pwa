<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cue } from '../browser/feedback.ts';
  import { markSwipeLearned, swipeToConfirm } from '../browser/swipe-log.ts';

  // A workout screen as a card: drag right to confirm its main action, left to undo. The card
  // follows the finger and a badge names what releasing does. Every action keeps its own button,
  // so taps, the keyboard and screen readers never need the gesture.
  let {
    children,
    rightLabel,
    onright,
    leftLabel = '',
    onleft,
    disabled = false,
  }: {
    children: Snippet;
    rightLabel: string;
    onright: () => void;
    leftLabel?: string;
    onleft?: () => void;
    disabled?: boolean;
  } = $props();

  let swipe = $state({ progress: 0, armed: false, dragging: false });
  let leaving = $state(false);
  const label = $derived(swipe.progress < 0 ? leftLabel : rightLabel);
  const badge = $derived(
    swipe.armed
      ? `✓ Release to ${label.toLowerCase()}`
      : swipe.progress < 0
        ? `← ${leftLabel}`
        : `${rightLabel} →`,
  );

  const options = {
    disabled: () => disabled,
    allowLeft: () => Boolean(onleft),
    onProgress: (progress: number, armed: boolean, dragging: boolean) =>
      (swipe = { progress, armed, dragging }),
    onArm: () => cue('pick'),
    onCommit: (direction: 1 | -1) => {
      markSwipeLearned();
      if (direction < 0) return onleft?.();
      // The card slides away; if the screen is still here a moment later, it slides back.
      leaving = true;
      setTimeout(() => (leaving = false), 700);
      onright();
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
