<script lang="ts">
  import { onMount } from 'svelte';
  import { prefersReducedMotion } from '../browser/device.ts';
  import { detent } from '../browser/feedback.ts';

  // One set value as a picker wheel, like the platform's own: a native scrolling list that snaps
  // each value into the middle band, lower values above. It opens on a tap, centred on the current
  // value; tapping outside, back or Escape closes it and keeps the value in the band, and tapping a
  // value picks it. A native modal <dialog> gives the back/Escape handling and the focus trap.
  let {
    values,
    current,
    label,
    format = (value: string) => value,
    onclose,
  }: {
    values: string[];
    current: string;
    label: string;
    format?: (value: string) => string;
    onclose: (value: string) => void;
  } = $props();

  const ROW = 52;
  // Fit the screen on a watch with an odd number of rows, so the band sits exactly in the middle.
  const fit = Math.min(7, Math.floor((window.innerHeight - 16) / ROW));
  const rows = Math.max(3, fit % 2 ? fit : fit - 1);
  const pad = ROW * ((rows - 1) / 2);

  let dialog: HTMLDialogElement;
  let list: HTMLElement;
  let index = $state(0);
  let closing = $state(false);
  let closed = false;

  onMount(() => {
    index = Math.max(0, values.indexOf(current));
    dialog.showModal();
    list.scrollTop = index * ROW;
    list.querySelectorAll('button')[index]?.focus({ preventScroll: true });
  });

  // The position is read once per frame at most, so a fast flick costs no more than a slow one.
  let frame = 0;
  function scrolled() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      // Once closing, the value is settled; a late snap must not change it.
      if (closing) return;
      const next = Math.max(0, Math.min(values.length - 1, Math.round(list.scrollTop / ROW)));
      if (next === index) return;
      index = next;
      detent();
    });
  }

  // Fade out, then close; the close event saves whatever sits in the band.
  function dismiss() {
    if (closing) return;
    closing = true;
    setTimeout(() => dialog.close(), prefersReducedMotion() ? 0 : 140);
  }

  // A tapped value slides into the band as the wheel fades.
  function choose(at: number) {
    index = at;
    list.scrollTo({ top: at * ROW, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    dismiss();
  }

  function step(event: KeyboardEvent) {
    const move = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!move) return;
    event.preventDefault();
    index = Math.max(0, Math.min(values.length - 1, index + move));
    list.scrollTo({ top: index * ROW, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    list.querySelectorAll('button')[index]?.focus({ preventScroll: true });
  }
</script>

<dialog
  bind:this={dialog}
  class={['value-wheel', closing && 'is-closing']}
  aria-label={label}
  oncancel={(event) => {
    event.preventDefault();
    dismiss();
  }}
  onclose={() => {
    if (closed) return;
    closed = true;
    onclose(values[index]);
  }}
  onclick={(event) => {
    if (event.target === dialog) dismiss();
  }}
>
  <div class="value-wheel-face" style:height="{ROW * rows}px">
    <div class="value-wheel-band" style:top="{pad}px" style:height="{ROW}px"></div>
    <div
      class="value-wheel-list"
      bind:this={list}
      style:padding-block="{pad}px"
      onscroll={scrolled}
      onkeydown={step}
      role="presentation"
    >
      {#each values as value, at (value)}
        <button
          type="button"
          class={['value-wheel-item', at === index && 'is-current']}
          style:height="{ROW}px"
          aria-current={at === index ? 'true' : undefined}
          onclick={() => choose(at)}>{format(value)}</button
        >
      {/each}
    </div>
  </div>
</dialog>
