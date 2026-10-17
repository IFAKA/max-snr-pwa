<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import type { IconName } from './icons.ts';
  import { holdScroll } from '../browser/text-overflow.ts';

  // One list row. `href` renders a link, `onclick` (or `disabled`) a button, otherwise a static
  // row; `status` marks a non-interactive state row such as "Done".
  let {
    label = '',
    href,
    onclick,
    disabled = false,
    icon,
    iconLabel = '',
    rowClass = '',
    linkClass = '',
    status = false,
    skip = false,
    primary = false,
    scroll = false,
    id,
    content,
    trailing,
    after,
  }: {
    label?: string;
    href?: string;
    onclick?: (event: MouseEvent) => void;
    disabled?: boolean;
    icon?: IconName;
    iconLabel?: string;
    rowClass?: string;
    linkClass?: string;
    status?: boolean;
    skip?: boolean;
    primary?: boolean;
    scroll?: boolean;
    id?: string;
    content?: Snippet;
    trailing?: Snippet;
    /** Rendered inside the row after the control, e.g. the row's confirmation dialog. */
    after?: Snippet;
  } = $props();

  const isButton = $derived(Boolean(onclick) || disabled);
</script>

{#snippet body()}
  {#if content}
    {@render content()}
  {:else if scroll}
    <span data-hold-scroll use:holdScroll><span class="hold-scroll-text">{label}</span></span>
  {:else}
    <span>{label}</span>
  {/if}
  {#if trailing}{@render trailing()}{/if}
  {#if icon}<Icon name={icon} label={iconLabel} />{/if}
{/snippet}

<li
  class={rowClass || undefined}
  data-picker-skip={skip || status ? '' : undefined}
  data-picker-primary={primary ? '' : undefined}
>
  {#if href}
    <a class={['list-link', linkClass]} {href} {id}>{@render body()}</a>
  {:else if isButton}
    <button class={['list-link', linkClass]} type="button" {id} {disabled} {onclick}
      >{@render body()}</button
    >
  {:else}
    <div class={['list-link', linkClass]} role={status ? 'status' : undefined} {id}>
      {@render body()}
    </div>
  {/if}
  {#if after}{@render after()}{/if}
</li>
