<script lang="ts">
  import { ICON_PATHS, type IconName } from './icons.ts';

  let { name, label = '' }: { name: IconName; label?: string } = $props();
</script>

<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
  >{@html ICON_PATHS[name]}</svg
>{#if label}<span class="sr-only">{label}</span>{/if}
