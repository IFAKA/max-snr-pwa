<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { leaveToToday, leavingProgrammatically, replaceUrl } from '../browser/navigation.ts';
  import { act } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { cancelWorkout, finishEarly, stretchEarly } from '../workout/index.ts';
  import { completionUrl } from '../browser/routes.ts';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  // While a main workout step is showing, a single back gesture is ignored (it is easy to trigger
  // by accident on a watch) and a quick double back — or Escape — asks what to do. Keeping the
  // workout going is always the highlighted default.
  // A timed activity (a walk, …) has no workout state, so it brings its own choices.
  interface ActivityChoices {
    title: string;
    save: () => Promise<void>;
    discard: () => Promise<void>;
  }
  let { main, activity }: { main: boolean; activity?: ActivityChoices } = $props();

  const DOUBLE_BACK_MS = 500;
  let open = $state(false);
  let lastBackAt = Number.NEGATIVE_INFINITY;
  let hasCompletedSets = $state(false);
  let canFinishEarly = $state(false);

  function request() {
    if (activity) {
      open = true;
      return;
    }
    const active = getState().active;
    if (!active || open) return;
    hasCompletedSets = active.tasks.some((task) => task.completed);
    canFinishEarly = active.tasks.some((task) => !task.completed && !task.skipped);
    open = true;
  }

  beforeNavigate((navigation) => {
    if (navigation.type !== 'popstate' || !main || open || leavingProgrammatically()) return;
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
    if (
      event.key !== 'Escape' ||
      !main ||
      editable ||
      document.querySelector('dialog[open], [data-state="open"] [data-confirm-drawer]')
    )
      return;
    event.preventDefault();
    request();
  }

  async function handleClose(value: string) {
    if (activity) {
      if (value === 'finish-early') await activity.save();
      if (value === 'discard') await activity.discard();
      return;
    }
    if (value === 'discard') {
      await leaveToToday(() => act(cancelWorkout));
    } else if (value === 'finish-early' && canFinishEarly) {
      if (await act(stretchEarly)) await replaceUrl('/workout/');
    } else if (value === 'finish-early') {
      const saved = await act(finishEarly);
      if (saved) await replaceUrl(completionUrl(saved.id));
    }
  }
</script>

<svelte:window {onkeydown} />

{#if activity}
  <ConfirmDialog
    bind:open
    title={`End ${activity.title.toLowerCase()}?`}
    body="Finish saves the time so far. Discard ends it without saving."
    actions={[
      { value: 'keep', label: 'Keep Going', primary: true },
      { value: 'finish-early', label: 'Finish and Save' },
      { value: 'discard', label: `Discard ${activity.title}`, destructive: true },
    ]}
    onclose={handleClose}
  />
{:else}
  <ConfirmDialog
    bind:open
    title="Cancel workout?"
    body={hasCompletedSets
      ? `Cancel discards this workout. ${canFinishEarly ? 'Finish early skips the sets left and goes to the stretch, which saves the sets you have done.' : 'Finish saves the sets you have done.'}`
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
{/if}
