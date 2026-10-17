<script lang="ts">
  // The wheel shown while a set value is held and dragged: the highlighted value in the middle,
  // its neighbours above and below. It is feedback only; the button announces the value.
  let {
    values,
    index,
    rect,
    label,
  }: { values: string[]; index: number; rect: DOMRect; label: string } = $props();

  const NEIGHBOURS = [-2, -1, 0, 1, 2];
  const left = $derived(Math.max(4, Math.min(window.innerWidth - rect.width - 4, rect.left)));
</script>

<div class="scrub-backdrop" aria-hidden="true">
  <ol class="scrub-wheel" style:left="{left}px" style:width="{rect.width}px">
    {#each NEIGHBOURS as offset (offset)}
      {@const value = values[index - offset]}
      <li class={['scrub-item', offset === 0 && 'is-current']} data-offset={Math.abs(offset)}>
        {value ?? ''}
        {#if offset === 0}<small>{label}</small>{/if}
      </li>
    {/each}
  </ol>
</div>
