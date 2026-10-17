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
