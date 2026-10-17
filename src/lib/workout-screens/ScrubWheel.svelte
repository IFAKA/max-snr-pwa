<script lang="ts">
  // The wheel shown while a set value is held and dragged: centred on the screen over a dimmed
  // backdrop, with the values rolling through a highlighted band and fading out above and below.
  // Feedback only; the button itself announces the value.
  let { values, index }: { values: string[]; index: number } = $props();

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

<div class="scrub-backdrop" aria-hidden="true">
  <div class="scrub-wheel" style:height="{height}px">
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
