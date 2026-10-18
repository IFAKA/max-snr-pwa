<script lang="ts">
  import { swipeLearned } from '../browser/swipe-log.ts';

  // The swipe directions, spelled out until the first swipe that acts; after that the screen
  // stays clean. Screen readers use the buttons, so the hint is hidden from them.
  let { text }: { text: string } = $props();
  const learned = swipeLearned();
</script>

{#if !learned}<p class="swipe-hint" aria-hidden="true">{text}</p>{/if}
