<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    text,
    id,
    rowClass = '',
    detail,
    attributes = {},
  }: {
    text: string;
    id?: string;
    rowClass?: string;
    detail?: Snippet;
    attributes?: Record<string, string>;
  } = $props();
</script>

<li class={rowClass || undefined} data-picker-skip {...attributes}>
  <h2 class="list-link list-title" {id}>
    {#if detail}<span>{text}</span>{@render detail()}{:else}{text}{/if}
  </h2>
</li>
