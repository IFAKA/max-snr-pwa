<script lang="ts">
  import type { Snippet } from 'svelte';
  import Title from './Title.svelte';

  // Every workout step: title and context on top, the thumb zone with the primary action below.
  // `more` is a second vertical page (secondary details and actions) that scrolls into view.
  let {
    title,
    className = '',
    countdown = false,
    info,
    actions,
    more,
  }: {
    title: string;
    className?: string;
    countdown?: boolean;
    info?: Snippet;
    actions?: Snippet;
    more?: Snippet;
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
  {#if more}
    <span class="stage-hint" aria-hidden="true">⌄</span>
    <div class="stage-more">{@render more()}</div>
  {/if}
</section>
