<script lang="ts">
  import type { Snippet } from 'svelte';

  // The drawer while a finger is still dragging it up: a plain sheet `px` up the screen with the
  // backdrop dimming. Releasing past the threshold swaps in the real drawer in the same place.
  let { px, children }: { px: number; children: Snippet } = $props();
</script>

<div class="drawer-peek" aria-hidden="true" style:--peek="{px}px">
  <div class="drawer-overlay"></div>
  <div class="drawer-sheet">
    <div class="drawer-handle"><span></span></div>
    <div class="drawer-body">{@render children()}</div>
  </div>
</div>
