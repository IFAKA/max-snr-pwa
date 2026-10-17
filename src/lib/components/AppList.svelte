<script lang="ts">
  import type { Snippet } from 'svelte';
  import { magneticList } from '../browser/magnetic-list.ts';

  // `rows` identifies what the list currently shows so the picker can be rebuilt when it changes.
  let {
    label,
    rows = '',
    className = '',
    children,
  }: { label: string; rows?: unknown; className?: string; children: Snippet } = $props();
</script>

<ul class={['app-list', className]} aria-label={label} use:magneticList={rows}>
  {@render children()}
</ul>
