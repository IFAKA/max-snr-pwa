<script lang="ts" module>
  export interface DialogAction {
    value: string;
    label: string;
    /** The safe, expected choice: styled primary and focused when the dialog opens. */
    primary?: boolean;
    destructive?: boolean;
    hidden?: boolean;
  }
</script>

<script lang="ts">
  import Drawer from './Drawer.svelte';

  // On a phone the confirmation rises as a bottom drawer (drag it down, tap the backdrop,
  // Escape or back to keep things as they are); on a watch it stays a native modal <dialog>.
  // Native modal <dialog>: Escape, the Android back gesture handled by the screen, and a
  // backdrop tap all close it with the safe "cancel" result.
  let {
    open = $bindable(false),
    title,
    body = '',
    actions,
    onclose,
  }: {
    open?: boolean;
    title: string;
    body?: string;
    actions: DialogAction[];
    onclose: (value: string) => void;
  } = $props();

  const phoneQuery = globalThis.matchMedia?.('(min-width: 261px)');
  let phone = $state(phoneQuery?.matches ?? false);
  $effect(() => {
    const update = () => (phone = Boolean(phoneQuery?.matches));
    phoneQuery?.addEventListener('change', update);
    return () => phoneQuery?.removeEventListener('change', update);
  });

  let dialog: HTMLDialogElement | undefined = $state();
  const titleId = `dialog-${Math.random().toString(36).slice(2, 8)}`;

  // Focus the safe choice without scrolling it into view, so on a watch the dialog opens on its
  // title and the rest is reached by scrolling.
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('button.primary')?.focus({ preventScroll: true });
      dialog.scrollTop = 0;
    }
    if (!open && dialog.open) dialog.close('cancel');
  });

  // The drawer is portaled out of the component, so the safe choice is found by its marker.
  $effect(() => {
    if (!phone || !open) return;
    // The drawer's own focus handling runs while it mounts, so keep claiming the safe choice
    // until it sticks.
    const started = performance.now();
    let frame = 0;
    const claim = () => {
      const primary = document.querySelector<HTMLButtonElement>(
        '[data-confirm-drawer] button.primary',
      );
      primary?.focus({ preventScroll: true });
      if (document.activeElement !== primary && performance.now() - started < 1000) {
        frame = requestAnimationFrame(claim);
      }
    };
    frame = requestAnimationFrame(claim);
    return () => cancelAnimationFrame(frame);
  });

  function finish(value: string) {
    if (!open) return;
    open = false;
    onclose(value);
  }

  function handleClose() {
    const value = dialog?.returnValue || 'cancel';
    if (dialog) dialog.returnValue = '';
    open = false;
    onclose(value);
  }

  function handleClick(event: MouseEvent) {
    if (event.target === dialog) dialog?.close('cancel');
  }
</script>

{#if phone}
  <Drawer label={title} {open} onrequestclose={() => finish('cancel')}>
    <div
      class="confirm-drawer"
      data-confirm-drawer
      role="presentation"
      onkeydown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        finish('cancel');
      }}
    >
      <h2>{title}</h2>
      {#if body}<p>{body}</p>{/if}
      <div class="dialog-actions">
        {#each actions.filter((action) => !action.hidden) as action (action.value)}
          <button
            type="button"
            class={[action.primary && 'primary', action.destructive && 'destructive']}
            onclick={() => finish(action.value)}>{action.label}</button
          >
        {/each}
      </div>
    </div>
  </Drawer>
{:else}
  <dialog
    bind:this={dialog}
    class="confirm-dialog"
    aria-labelledby={titleId}
    onclose={handleClose}
    onclick={handleClick}
  >
    <form method="dialog">
      <h2 id={titleId}>{title}</h2>
      {#if body}<p>{body}</p>{/if}
      <div class="dialog-actions">
        {#each actions.filter((action) => !action.hidden) as action (action.value)}
          <button
            class={[action.primary && 'primary', action.destructive && 'destructive']}
            value={action.value}>{action.label}</button
          >
        {/each}
      </div>
    </form>
  </dialog>
{/if}
