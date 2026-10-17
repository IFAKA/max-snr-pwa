<script lang="ts">
  import type { Snippet } from 'svelte';

  // A bottom drawer on a native modal <dialog>: it slides up over the screen, and closes with
  // Escape, a backdrop tap, the handle (a real button) or a downward drag of the handle.
  let { label, onclose, children }: { label: string; onclose: () => void; children: Snippet } =
    $props();

  const CLOSE_RATIO = 0.3;
  const FLICK_PX_PER_MS = 0.6;

  let dialog: HTMLDialogElement | undefined = $state();
  let sheet: HTMLElement | undefined = $state();
  let offset = $state(0);
  let dragging = $state(false);
  let startY = 0;
  let startTime = 0;
  let swallowClick = false;

  $effect(() => {
    if (dialog && !dialog.open) {
      dialog.showModal();
      // Start on the sheet itself, not on the handle, so no focus ring covers the title.
      sheet?.focus({ preventScroll: true });
    }
  });

  function cancel(event: Event) {
    event.preventDefault();
    onclose();
  }

  function backdrop(event: MouseEvent) {
    if (event.target === dialog) onclose();
  }

  function down(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    startY = event.clientY;
    startTime = event.timeStamp;
    dragging = true;
  }

  function move(event: PointerEvent) {
    if (!dragging) return;
    offset = Math.max(0, event.clientY - startY);
  }

  function up(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    const distance = Math.max(0, event.clientY - startY);
    const height = sheet?.getBoundingClientRect().height || 1;
    const flick =
      distance > 24 && distance / Math.max(1, event.timeStamp - startTime) > FLICK_PX_PER_MS;
    offset = 0;
    if (distance > 6) {
      swallowClick = true;
      setTimeout(() => (swallowClick = false), 0);
    }
    if (distance / height > CLOSE_RATIO || flick) onclose();
  }

  function click() {
    if (!swallowClick) onclose();
  }
</script>

<dialog
  bind:this={dialog}
  class="drawer"
  aria-label={label}
  oncancel={cancel}
  onclick={backdrop}
  data-dragging={dragging}
>
  <div class="drawer-sheet" tabindex="-1" bind:this={sheet} style:--drag="{offset}px">
    <button
      class="drawer-handle"
      type="button"
      aria-label="Close {label}"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={() => {
        dragging = false;
        offset = 0;
      }}
      onclick={click}><span aria-hidden="true"></span></button
    >
    <div class="drawer-body">{@render children()}</div>
  </div>
</dialog>
