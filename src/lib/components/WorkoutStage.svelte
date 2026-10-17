<script lang="ts">
  import type { Snippet } from 'svelte';
  import Title from './Title.svelte';

  // Every workout step: title and context on top, the thumb zone with the primary action below.
  let {
    title,
    className = '',
    countdown = false,
    info,
    actions,
  }: {
    title: string;
    className?: string;
    countdown?: boolean;
    info?: Snippet;
    actions?: Snippet;
  } = $props();
</script>

<section
  class={['workout-stage', countdown && 'countdown-stage', className]}
  aria-labelledby="workout-title"
>
  <div class="stage-info">
    <Title text={title} id="workout-title" className="workout-title" marquee />
    {#if info}{@render info()}{/if}
  </div>
  <div class="thumb-zone">
    {#if actions}{@render actions()}{/if}
  </div>
</section>
