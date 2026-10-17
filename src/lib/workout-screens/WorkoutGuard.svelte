<script lang="ts">
  import { beforeNavigate, goto } from '$app/navigation';
  import { act } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { cancelWorkout, finishEarly } from '../workout/index.ts';
  import { completionUrl } from '../browser/routes.ts';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  // While a main workout step is showing, a single back gesture is ignored (it is easy to trigger
  // by accident on a watch) and a quick double back — or Escape — asks what to do. Keeping the
  // workout going is always the highlighted default.
  let { main }: { main: boolean } = $props();

  const DOUBLE_BACK_MS = 500;
  let open = $state(false);
  let lastBackAt = Number.NEGATIVE_INFINITY;
  let hasCompletedSets = $state(false);
  let canFinishEarly = $state(false);

  function request() {
    const active = getState().active;
    if (!active || open) return;
    hasCompletedSets = active.tasks.some((task) => task.completed);
    canFinishEarly = active.tasks.some((task) => !task.completed && !task.skipped);
    open = true;
  }

  beforeNavigate((navigation) => {
    if (navigation.type !== 'popstate' || !main || open) return;
    navigation.cancel();
    const now = performance.now();
    const isDoubleBack = now - lastBackAt <= DOUBLE_BACK_MS;
    lastBackAt = isDoubleBack ? Number.NEGATIVE_INFINITY : now;
    if (isDoubleBack) request();
  });

  function onkeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const editable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable;
    if (event.key !== 'Escape' || !main || editable || document.querySelector('dialog[open]'))
      return;
    event.preventDefault();
    request();
  }

  async function handleClose(value: string) {
    if (value === 'discard') {
      if (await act(cancelWorkout)) await goto('/', { replace: true });
    } else if (value === 'finish-early') {
      const saved = await act(finishEarly);
      if (saved) await goto(completionUrl(saved.id), { replace: true });
    }
  }
</script>

<svelte:window {onkeydown} />

<ConfirmDialog
  bind:open
  title="Cancel workout?"
  body={hasCompletedSets
    ? `Cancel discards this workout. ${canFinishEarly ? 'Finish early' : 'Finish'} saves the sets you have done.`
    : 'Cancel discards this workout.'}
  actions={[
    { value: 'keep', label: 'Keep Working Out', primary: true },
    {
      value: 'finish-early',
      label: canFinishEarly ? 'Finish Early' : 'Finish and Save',
      hidden: !hasCompletedSets,
    },
    { value: 'discard', label: 'Cancel Workout', destructive: true },
  ]}
  onclose={handleClose}
/>
