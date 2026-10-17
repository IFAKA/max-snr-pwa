<script lang="ts">
  import { titleMarquee } from '../browser/text-overflow.ts';

  let {
    text,
    id,
    level = 'h1',
    className = '',
    marquee = false,
  }: {
    text: string;
    id: string;
    level?: 'h1' | 'h2';
    className?: string;
    marquee?: boolean;
  } = $props();
</script>

{#if marquee}
  <svelte:element
    this={level}
    {id}
    class={['app-title', className]}
    data-title-marquee
    use:titleMarquee
    ><span class="title-marquee-track"><span class="title-marquee-text">{text}</span></span
    ></svelte:element
  >
{:else}
  <svelte:element this={level} {id} class={['app-title', className]}>{text}</svelte:element>
{/if}
