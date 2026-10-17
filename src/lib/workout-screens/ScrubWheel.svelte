<script lang="ts">
  // The wheel shown while a set value is held and dragged. It grows out of the held button: the
  // highlighted band sits exactly over it and the values roll past. Feedback only; the button
  // itself announces the value.
  let { values, index, rect }: { values: string[]; index: number; rect: DOMRect } = $props();

  const ROW = 44;
  const VISIBLE = 5;
  const MIN_WIDTH = 88;
  const height = ROW * VISIBLE;
  const width = $derived(Math.max(rect.width, MIN_WIDTH));
  const left = $derived(
    Math.max(4, Math.min(window.innerWidth - width - 4, rect.left + rect.width / 2 - width / 2)),
  );
  // Centre the band on the button, but keep the whole wheel on screen.
  const top = $derived(
    Math.max(4, Math.min(window.innerHeight - height - 4, rect.top + rect.height / 2 - height / 2)),
  );
  // Where the band falls inside the wheel, so it can still line up with the button after clamping.
  const bandTop = $derived(rect.top + rect.height / 2 - top - ROW / 2);
  const centre = $derived(Math.max(0, Math.min(height - ROW, bandTop)));
</script>

<div class="scrub-backdrop" aria-hidden="true">
  <div
    class="scrub-wheel"
    style:left="{left}px"
    style:top="{top}px"
    style:width="{width}px"
    style:height="{height}px"
  >
    <div class="scrub-band" style:top="{centre}px" style:height="{ROW}px"></div>
    <ol class="scrub-track" style:transform="translateY({centre - index * ROW}px)">
      {#each values as value, position (value)}
        <li class={['scrub-item', position === index && 'is-current']} style:height="{ROW}px">
          {value}
        </li>
      {/each}
    </ol>
  </div>
</div>
