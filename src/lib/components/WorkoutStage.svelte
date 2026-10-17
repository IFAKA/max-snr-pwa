<script lang="ts">
  import type { Snippet } from 'svelte';
  import Title from './Title.svelte';

  // Every workout step: title and context on top, the thumb zone with the primary action below.
  // `more` holds the actions the swipe gestures replace; it is hidden until keyboard focus reaches
  // it, so the screen stays clean while keyboards and screen readers keep every control.
  // `titleHref` makes the title a link (tap the exercise name to change it).
  let {
    title,
    className = '',
    countdown = false,
    info,
    actions,
    more,
    titleHref,
  }: {
    title: string;
    className?: string;
    countdown?: boolean;
    info?: Snippet;
    actions?: Snippet;
    more?: Snippet;
    titleHref?: string;
  } = $props();
</script>

<section
  class={['workout-stage', countdown && 'countdown-stage', className]}
  aria-labelledby="workout-title"
>
  <div class="stage-info">
    {#if titleHref}
      <a
        class="stage-title-link"
        href={titleHref}
        draggable="false"
        aria-label="{title}, change exercise"
        ><Title text={title} id="workout-title" className="workout-title" marquee /></a
      >
    {:else}
      <Title text={title} id="workout-title" className="workout-title" marquee />
    {/if}
    {#if info}{@render info()}{/if}
  </div>
  <div class="thumb-zone">
    {#if actions}{@render actions()}{/if}
  </div>
  {#if more}
    <div class="stage-more">{@render more()}</div>
  {/if}
</section>
