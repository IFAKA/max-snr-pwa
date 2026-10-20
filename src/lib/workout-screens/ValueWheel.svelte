<script lang="ts">
  import { onMount } from 'svelte';
  import { prefersReducedMotion } from '../browser/device.ts';
  import { detent } from '../browser/feedback.ts';
  import {
    clamp,
    releaseVelocity,
    rollStyle,
    rubberBand,
    settleAt,
    settleTarget,
    type Sample,
  } from '../browser/wheel-motion.ts';

  // One set value as a picker wheel, like the platform's own: values roll through a middle band,
  // lower values above. It opens on a tap, centred on the current value. A drag anywhere on the
  // screen turns it, and a flick coasts on and slows down onto a value (wheel-motion.ts), as
  // native pickers do; native scroll snapping decides where a flick lands the moment the finger
  // lifts and jumps there on Android. Tapping outside, back or Escape closes it and keeps the
  // value in the band; tapping a value picks it; arrow keys and a mouse wheel step it. A native
  // modal <dialog> gives the back/Escape handling and the focus trap.
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
  // A finger has to move this far before a touch is a drag rather than a tap.
  const SLOP = 6;
  // Fit the screen on a watch with an odd number of rows, so the band sits exactly in the middle.
  const fit = Math.min(7, Math.floor((window.innerHeight - 16) / ROW));
  const rows = Math.max(3, fit % 2 ? fit : fit - 1);
  const pad = ROW * ((rows - 1) / 2);
  const top = () => (values.length - 1) * ROW;

  let dialog: HTMLDialogElement;
  let list: HTMLElement;
  let index = $state(0);
  let closing = $state(false);
  let closed = false;
  let offset = 0;

  onMount(() => {
    index = Math.max(0, values.indexOf(current));
    dialog.showModal();
    draw(index * ROW);
    list.querySelectorAll('button')[index]?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(frame);
  });

  // Moves the list on the compositor and styles only the values near the band.
  let styled: HTMLElement[] = [];
  function draw(next: number) {
    offset = next;
    list.style.transform = `translateY(${-offset}px)`;
    const items = list.children as HTMLCollectionOf<HTMLElement>;
    const centre = offset / ROW;
    const reach = (rows + 1) / 2;
    for (const item of styled) item.style.removeProperty('scale');
    for (const item of styled) item.style.removeProperty('opacity');
    styled = [];
    const from = Math.max(0, Math.floor(centre - reach));
    const to = Math.min(values.length - 1, Math.ceil(centre + reach));
    for (let at = from; at <= to; at++) {
      const { scale, opacity } = rollStyle(at - centre);
      items[at].style.scale = String(scale);
      items[at].style.opacity = String(opacity);
      styled.push(items[at]);
    }
    if (closing) return;
    const near = clamp(Math.round(offset / ROW), 0, values.length - 1);
    if (near === index) return;
    index = near;
    detent();
  }

  let frame = 0;
  function settle(to: number) {
    cancelAnimationFrame(frame);
    if (prefersReducedMotion()) {
      draw(to);
      return;
    }
    const from = offset;
    const start = performance.now();
    const tick = (now: number) => {
      const next = settleAt(from, to, now - start);
      draw(next);
      if (next !== to) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }

  // A drag from anywhere on the screen. A touch that never passes the slop stays a tap, so
  // tapping a value or the dimmed screen still works through the click that follows.
  let pointer: number | null = null;
  let startY = 0;
  let startOffset = 0;
  let dragging = false;
  let samples: Sample[] = [];
  function down(event: PointerEvent) {
    if (pointer !== null || event.button > 0) return;
    cancelAnimationFrame(frame);
    pointer = event.pointerId;
    startY = event.clientY;
    startOffset = offset;
    dragging = false;
    samples = [{ at: event.timeStamp, y: event.clientY }];
  }
  function move(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    const moved = event.clientY - startY;
    if (!dragging && Math.abs(moved) < SLOP) return;
    if (!dragging) {
      dragging = true;
      dialog.setPointerCapture(event.pointerId);
    }
    samples = [...samples.slice(-8), { at: event.timeStamp, y: event.clientY }];
    draw(rubberBand(startOffset - moved, top()));
  }
  function up(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (!dragging) {
      if (offset % ROW) settle(settleTarget(offset, 0, ROW, values.length));
      return;
    }
    const velocity = -releaseVelocity(samples, event.timeStamp);
    settle(settleTarget(clamp(offset, 0, top()), velocity, ROW, values.length));
  }
  // A drag ends in a click on whatever is under the finger; it must not pick or close.
  function swallowDragClick(event: MouseEvent) {
    if (!dragging) return;
    dragging = false;
    event.stopPropagation();
    event.preventDefault();
  }

  // A mouse wheel or a crown turns it directly, then it settles on the value it reached.
  let wheelTimer = 0;
  function wheel(event: WheelEvent) {
    event.preventDefault();
    cancelAnimationFrame(frame);
    draw(clamp(offset + event.deltaY, 0, top()));
    clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(() => settle(settleTarget(offset, 0, ROW, values.length)), 120);
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
    closing = true;
    settle(at * ROW);
    closing = false;
    dismiss();
  }

  function step(event: KeyboardEvent) {
    const move = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!move) return;
    event.preventDefault();
    const at = clamp(index + move, 0, values.length - 1);
    settle(at * ROW);
    index = at;
    list.querySelectorAll('button')[at]?.focus({ preventScroll: true });
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
  onclickcapture={swallowDragClick}
  onclick={(event) => {
    if (event.target === dialog) dismiss();
  }}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onwheel={wheel}
>
  <div class="value-wheel-face" style:height="{ROW * rows}px">
    <div class="value-wheel-band" style:top="{pad}px" style:height="{ROW}px"></div>
    <div
      class="value-wheel-list"
      bind:this={list}
      style:padding-block="{pad}px"
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
