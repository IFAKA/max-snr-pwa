<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { act, showError } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import type { ActiveWorkout, Task } from '../types.ts';
  import { completeSet, finishAtBudget } from '../workout/index.ts';
  import { buzz, HAPTICS } from '../browser/device.ts';
  import Stepper from '../components/Stepper.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';
  import SupersetMeta from './SupersetMeta.svelte';
  import { LOAD_STEP, liftingModel, stepValue } from './lifting-model.ts';

  // Logging a set is two short steps: reps, then load and effort (RIR).
  let { active, task, step }: { active: ActiveWorkout; task: Task; step: 'reps' | 'load' } =
    $props();

  const unit = getState().settings?.unit || 'kg';
  // The dispatcher re-mounts this screen per task, so starting values are read once.
  const model = untrack(() => liftingModel(active, task, unit));
  let reps = $state(model.reps);
  let weight = $state(model.weight);
  let rir = $state(model.rir);
  let busy = $state(false);

  function saveDraft() {
    active.draft = { ...active.draft, weight, reps, rir };
    persist().catch(showError);
  }

  function change(field: 'reps' | 'weight' | 'rir', delta: number) {
    if (field === 'reps') reps = stepValue('reps', reps, delta);
    else if (field === 'weight') weight = stepValue('weight', weight, delta);
    else rir = stepValue('rir', rir, delta);
    saveDraft();
  }

  function next() {
    saveDraft();
    void goto('/workout/?step=load');
  }

  async function logSet(event: SubmitEvent) {
    event.preventDefault();
    saveDraft();
    busy = true;
    const result = await act(completeSet);
    if (!result || 'error' in result) {
      if (result) showError(new Error(result.error));
      busy = false;
      return;
    }
    buzz(HAPTICS.setLogged);
    await goto('/workout/', { replace: true });
  }

  async function cutOptional() {
    busy = true;
    await act(finishAtBudget);
    busy = false;
  }
</script>

<WorkoutStage title={task.performedName} className="lifting-stage">
  {#snippet info()}
    <SupersetMeta {active} {task} />
    <p class="set-count">Set {task.set} of {task.sets}</p>
    <p class="target-prescription">
      Target: {task.targetRepRange || task.reps} reps · {task.targetRir || task.rir} RIR
    </p>
    <p class="previous-performance">
      Previous: {#if model.previous}{model.previous.weight ?? 'bodyweight'}
        {model.previous.unit || unit} × {model.previous.reps} @ {model.previous.rir ?? '—'} RIR{:else}No
        logged set{/if}
    </p>
    {#if model.progressionLoad !== null}
      <p class="progression-note">Progression: try {model.progressionLoad} {unit} this exposure.</p>
    {/if}
  {/snippet}
  {#snippet actions()}
    <form id="set-form" onsubmit={logSet}>
      {#if step === 'load'}
        <Stepper
          name="weight"
          label={`Load · ${unit}`}
          value={weight}
          step={LOAD_STEP}
          onstep={(delta) => change('weight', delta)}
        />
        <Stepper
          name="rir"
          label="RIR"
          value={rir}
          step={1}
          onstep={(delta) => change('rir', delta)}
        />
        <button class="primary" id="next-step" type="submit" disabled={busy}>Log set</button>
      {:else}
        <Stepper
          name="reps"
          label="Reps"
          value={reps}
          step={1}
          onstep={(delta) => change('reps', delta)}
        />
        <button class="primary" id="next-step" type="button" onclick={next}>Next</button>
      {/if}
      {#if model.canCutOptional}
        <button
          class="primary"
          id="cut-optional"
          type="button"
          disabled={busy}
          onclick={cutOptional}>Cut Optional Accessories</button
        >
      {/if}
      {#if task.set === 1}
        <button
          class="secondary"
          id="change-exercise"
          type="button"
          disabled={!model.canChangeExercise}
          onclick={() => goto('/workout/?view=exercises')}>Change Exercise</button
        >
      {/if}
    </form>
  {/snippet}
</WorkoutStage>
