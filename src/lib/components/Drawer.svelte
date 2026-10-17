<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Drawer } from 'vaul-svelte';
  import { drawerPeek } from '../browser/drawer-peek.svelte.ts';

  // The bottom drawer, built on vaul-svelte (drag to dismiss, velocity release, backdrop tied to
  // the drag). It closes with a slide-out first and then calls `onclose` to leave its route.
  // `children` receives `dismiss`, which slides it out and then runs a callback.
  let {
    label,
    onclose,
    children,
  }: { label: string; onclose: () => void; children: Snippet<[(after?: () => void) => void]> } =
    $props();

  const SLIDE_OUT_MS = 500;

  // Opened by a finger drag: it is already in place, so it must not slide in again.
  const handoff = drawerPeek.handoff;
  drawerPeek.handoff = false;

  let open = $state(true);
  let closing = false;

  function dismiss(after: () => void = onclose) {
    if (closing) return;
    closing = true;
    open = false;
    setTimeout(after, SLIDE_OUT_MS);
  }
</script>

<Drawer.Root
  {open}
  noBodyStyles
  shouldScaleBackground={false}
  onOpenChange={(next) => {
    if (!next) dismiss();
  }}
>
  <Drawer.Portal>
    <Drawer.Overlay class="drawer-overlay" data-handoff={handoff} />
    <Drawer.Content class="drawer-sheet" aria-label={label} data-handoff={handoff}>
      <Drawer.Handle class="drawer-handle" />
      <Drawer.Title class="sr-only">{label}</Drawer.Title>
      <div class="drawer-body" data-vaul-no-drag>{@render children(dismiss)}</div>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
