<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Drawer } from 'vaul-svelte';
  import { drawerPeek } from '../browser/drawer-peek.svelte.ts';

  // The bottom drawer, built on vaul-svelte (drag to dismiss, velocity release, backdrop tied to
  // the drag). `open` is driven by the route, so closing by any means (drag, backdrop, Escape,
  // the back gesture) slides out; `onrequestclose` asks the route to leave when the user closes it.
  let {
    label,
    open,
    onrequestclose,
    children,
  }: { label: string; open: boolean; onrequestclose: () => void; children: Snippet } = $props();

  // Opened by a finger drag: it is already in place, so it must not slide in again.
  const handoff = drawerPeek.handoff;
  drawerPeek.handoff = false;

  // A drag-down can report the close twice; leaving the route once is enough.
  let requested = false;
  $effect(() => {
    if (open) requested = false;
  });
</script>

<Drawer.Root
  {open}
  noBodyStyles
  shouldScaleBackground={false}
  onOpenChange={(next) => {
    if (next || !open || requested) return;
    requested = true;
    onrequestclose();
  }}
>
  <Drawer.Portal>
    <Drawer.Overlay class="drawer-overlay" data-handoff={handoff} />
    <Drawer.Content class="drawer-sheet" aria-label={label} data-handoff={handoff}>
      <Drawer.Handle class="drawer-handle" />
      <Drawer.Title class="sr-only">{label}</Drawer.Title>
      <div class="drawer-body" data-vaul-no-drag>{@render children()}</div>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
