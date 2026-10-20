<script lang="ts">
  import { swipeLearned } from '../browser/swipe-log.ts';

  // Arrows along the bottom edge pointing the ways the screen can be swiped, until the first swipe
  // that acts; after that the screen stays clean. Screen readers use the buttons, so the hint is
  // hidden from them.
  type Direction = 'left' | 'right' | 'up';
  const ARROWS: Record<Direction, string> = { left: '←', right: '→', up: '↑' };
  let { directions }: { directions: Direction[] } = $props();
  const learned = swipeLearned();
</script>

{#if !learned}
  <p class="swipe-hint" data-count={directions.length} aria-hidden="true">
    {#each directions as direction (direction)}<span>{ARROWS[direction]}</span>{/each}
  </p>
{/if}
