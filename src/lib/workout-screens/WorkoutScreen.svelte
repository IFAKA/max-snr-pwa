<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { act, appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { finishWorkout } from '../workout/index.ts';
  import { completionUrl } from '../browser/routes.ts';
  import { isMainStep, workoutView } from './workout-view.ts';
  import ActivityScreen from './ActivityScreen.svelte';
  import Completion from './Completion.svelte';
  import ExercisePicker from './ExercisePicker.svelte';
  import ExerciseSelection from './ExerciseSelection.svelte';
  import Lifting from './Lifting.svelte';
  import Plank from './Plank.svelte';
  import Rest from './Rest.svelte';
  import StartScreen from './StartScreen.svelte';
  import Stretch from './Stretch.svelte';
  import WorkoutGuard from './WorkoutGuard.svelte';

  const params = $derived(new URLSearchParams(page.url.search));
  const view = $derived.by(() => {
    void appVersion.value;
    return workoutView(getState(), params);
  });
  const main = $derived.by(() => {
    void appVersion.value;
    return isMainStep(getState(), params);
  });
  // Each state change re-mounts the step, like a fresh render of the persisted state.
  const key = $derived.by(() => {
    const current = view;
    const taskId = 'task' in current ? current.task.id : '';
    return `${current.kind}:${taskId}:${appVersion.value}`;
  });

  let savingLegacy = false;

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
  {#if view.kind === 'activity'}
    <ActivityScreen type={view.type} />
  {:else if view.kind === 'start'}
    <StartScreen day={view.day} />
  {:else if view.kind === 'summary'}
    <Completion workout={view.workout} />
  {:else if view.kind === 'picker'}
    {@const returnTo = view.returnTo}
    <ExercisePicker active={view.active} onselected={() => goto(returnTo)} />
  {:else if view.kind === 'select'}
    <ExerciseSelection task={view.task} />
  {:else if view.kind === 'lifting'}
    <Lifting active={view.active} task={view.task} step={view.step} />
  {:else if view.kind === 'plank'}
    <Plank active={view.active} />
  {:else if view.kind === 'rest'}
    <Rest active={view.active} />
  {:else if view.kind === 'stretch'}
    <Stretch active={view.active} />
  {/if}
{/key}
