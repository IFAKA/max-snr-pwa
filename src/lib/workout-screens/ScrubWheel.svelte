<script lang="ts">
  // The wheel shown while a set value is held and dragged: centred on the screen over a dimmed
  // backdrop, with the values rolling through a highlighted band and fading out above and below.
  // Feedback only; the button itself announces the value.
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import { prefersReducedMotion } from '../browser/device.ts';

  let { values, index }: { values: string[]; index: number } = $props();

  // It swells into place on the hold and settles away a little quicker on release; reduced
  // motion shows and hides it at once.
  const still = prefersReducedMotion();
  const ms = (duration: number) => (still ? 0 : duration);
  const pop = (_node: Element, { duration, from }: { duration: number; from: number }) => ({
    duration: ms(duration),
    easing: cubicOut,
    css: (t: number) => `opacity: ${t}; transform: scale(${from + (1 - from) * t});`,
  });

  const ROW = 52;
  const VISIBLE = 7;
  // Fit the screen on a watch with an odd number of rows, so the band sits exactly in the middle.
  const fit = Math.min(VISIBLE, Math.floor((window.innerHeight - 8) / ROW));
  const rows = Math.max(3, fit % 2 ? fit : fit - 1);
  const height = ROW * rows;
  const centre = ROW * ((rows - 1) / 2);
  // Higher values sit above, so dragging the thumb up reaches them.
  const shown = $derived([...values].reverse());
  const position = $derived(values.length - 1 - index);
</script>

<div
  class="scrub-backdrop"
  aria-hidden="true"
  in:fade={{ duration: ms(180) }}
  out:fade={{ duration: ms(160) }}
>
  <div
    class="scrub-wheel"
    style:height="{height}px"
    in:pop={{ duration: 240, from: 0.88 }}
    out:pop={{ duration: 160, from: 0.94 }}
  >
    <div class="scrub-band" style:top="{centre}px" style:height="{ROW}px"></div>
    <ol class="scrub-track" style:transform="translateY({centre - position * ROW}px)">
      {#each shown as value, row (value)}
        <li class={['scrub-item', row === position && 'is-current']} style:height="{ROW}px">
          {value}
        </li>
      {/each}
    </ol>
  </div>
</div>
