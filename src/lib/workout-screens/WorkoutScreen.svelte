<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { act, appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { finishWorkout } from '../workout/index.ts';
  import { completionUrl } from '../browser/routes.ts';
  import { drawerBase, isMainStep, workoutView } from './workout-view.ts';
  import ActivityScreen from './ActivityScreen.svelte';
  import Completion from './Completion.svelte';
  import Drawer from '../components/Drawer.svelte';
  import DrawerPeek from '../components/DrawerPeek.svelte';
  import { drawerPeek } from '../browser/drawer-peek.svelte.ts';
  import ExercisePicker from './ExercisePicker.svelte';
  import Lifting from './Lifting.svelte';
  import Plank from './Plank.svelte';
  import Rest from './Rest.svelte';
  import StartScreen from './StartScreen.svelte';
  import Stretch from './Stretch.svelte';
  import ValuePicker from './ValuePicker.svelte';
  import WorkoutGuard from './WorkoutGuard.svelte';

  const params = $derived(new URLSearchParams(page.url.search));
  const view = $derived.by(() => {
    void appVersion.value;
    return workoutView(getState(), params);
  });
  // The exercise list is a drawer over the screen it was opened from, which stays mounted.
  const shown = $derived.by(() => {
    void appVersion.value;
    return view.kind === 'picker' ? drawerBase(getState(), params) : view;
  });
  const main = $derived.by(() => {
    void appVersion.value;
    return isMainStep(getState(), params);
  });
  // Each state change re-mounts the step, like a fresh render of the persisted state.
  const key = $derived.by(() => {
    const current = shown;
    const taskId = 'task' in current ? current.task.id : '';
    return `${current.kind}:${taskId}:${appVersion.value}`;
  });

  let savingLegacy = false;

  // The real drawer has taken over from the one that followed the finger.
  $effect(() => {
    if (view.kind === 'picker') {
      drawerPeek.px = 0;
      drawerPeek.settleMs = 0;
    }
  });

  $effect(() => {
    const current = view;
    if (current.kind === 'home' && !savingLegacy) void goto('/', { replace: true });
    else if (current.kind === 'redirect') void goto(current.to, { replace: true });
    else if (current.kind === 'save-legacy' && !savingLegacy) {
      // A workout left on the old unsaved review step is saved, never silently lost.
      savingLegacy = true;
      void act(finishWorkout).then(async (saved) => {
        if (saved) await goto(completionUrl(saved.id), { replace: true });
        savingLegacy = false;
      });
    }
  });
</script>

<WorkoutGuard {main} />

{#key key}
  {#if shown.kind === 'activity'}
    <ActivityScreen type={shown.type} />
  {:else if shown.kind === 'start'}
    <StartScreen day={shown.day} />
  {:else if shown.kind === 'summary'}
    <Completion workout={shown.workout} />
  {:else if shown.kind === 'lifting'}
    <Lifting active={shown.active} task={shown.task} />
  {:else if shown.kind === 'pick'}
    <ValuePicker
      active={shown.active}
      task={shown.task}
      field={shown.field}
      onpicked={() => history.back()}
    />
  {:else if shown.kind === 'plank'}
    <Plank active={shown.active} />
  {:else if shown.kind === 'rest'}
    <Rest active={shown.active} />
  {:else if shown.kind === 'stretch'}
    <Stretch active={shown.active} />
  {/if}
{/key}
{#if view.kind !== 'picker' && (drawerPeek.px > 0 || drawerPeek.settleMs > 0) && 'active' in shown}
  <DrawerPeek px={drawerPeek.px} settleMs={drawerPeek.settleMs}>
    <ExercisePicker active={shown.active} onselected={() => {}} />
  </DrawerPeek>
{/if}
{#if view.kind === 'picker'}
  {@const returnTo = view.returnTo}
  <Drawer label="Exercises" onclose={() => history.back()}>
    {#snippet children(dismiss)}
      <ExercisePicker active={view.active} onselected={() => dismiss(() => goto(returnTo))} />
    {/snippet}
  </Drawer>
{/if}
