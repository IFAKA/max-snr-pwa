<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { act, showError } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import type { ActiveWorkout, Task } from '../types.ts';
  import { completeSet, finishAtBudget } from '../workout/index.ts';
  import { cue } from '../browser/feedback.ts';
  import WorkoutStage from '../components/WorkoutStage.svelte';
  import SupersetMeta from './SupersetMeta.svelte';
  import { scrubValue } from '../browser/value-scrub.ts';
  import { markSwipeLearned, swipeLearned, swipeToConfirm } from '../browser/swipe-log.ts';
  import ScrubWheel from './ScrubWheel.svelte';
  import {
    formatLoad,
    isBetterSet,
    liftingModel,
    pickerValues,
    SET_FIELDS,
    type SetField,
  } from './lifting-model.ts';

  // Logging a set is one tap or one swipe right: the values start from the draft, last time, or
  // the progression rule, and "Log set" accepts them. Tapping a value opens its picker to change
  // it; holding it and dragging up or down turns it like a wheel. Details sit on a second page.
  let { active, task }: { active: ActiveWorkout; task: Task } = $props();

  const unit = getState().settings?.unit || 'kg';
  // The dispatcher re-mounts this screen per task, so starting values are read once.
  const model = untrack(() => liftingModel(active, task, unit));
  let values = $state({ reps: model.reps, weight: model.weight, rir: model.rir });
  let scrub = $state<{
    field: SetField;
    values: string[];
    index: number;
    rect: DOMRect;
  } | null>(null);
  const LABELS: Record<SetField, string> = { reps: 'Reps', weight: unit, rir: 'RIR' };
  const NAMES: Record<SetField, string> = { reps: 'Reps', weight: `Load in ${unit}`, rir: 'RIR' };
  let busy = $state(false);
  let swipe = $state({ progress: 0, armed: false, dragging: false });
  let leaving = $state(false);
  const learned = swipeLearned();

  function pick(field: SetField) {
    active.draft = { ...active.draft, ...values };
    const url = new URL(page.url.href);
    url.searchParams.set('pick', field);
    void goto(`${url.pathname}${url.search}`);
  }

  function scrubOptions(field: SetField) {
    const current = () =>
      field === 'weight' ? formatLoad(Number(values.weight || 0)) : values[field];
    return {
      values: () => pickerValues(field, current()),
      current,
      onScrub: (state: Omit<NonNullable<typeof scrub>, 'field'> | null) =>
        (scrub = state && { field, ...state }),
      onTick: () => cue('pick'),
      onCommit: (value: string) => (values[field] = value),
    };
  }

  const swipeOptions = {
    disabled: () => busy,
    onProgress: (progress: number, armed: boolean, dragging: boolean) =>
      (swipe = { progress, armed, dragging }),
    onArm: () => cue('pick'),
    onCommit: () => {
      leaving = true;
      markSwipeLearned();
      document.querySelector<HTMLFormElement>('#set-form')?.requestSubmit();
    },
  };

  async function logSet(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    busy = true;
    active.draft = { ...active.draft, ...values };
    const better = isBetterSet(values, model.previousSet);
    const result = await act(completeSet);
    if (!result || 'error' in result) {
      if (result) showError(new Error(result.error));
      busy = false;
      return;
    }
    cue(better ? 'betterSet' : 'setLogged');
    await goto('/workout/', { replace: true });
  }

  async function cutOptional() {
    busy = true;
    await act(finishAtBudget);
    busy = false;
  }
</script>

<div
  class="swipe-card"
  data-armed={swipe.armed}
  data-dragging={swipe.dragging}
  data-leaving={leaving}
  style:--swipe={swipe.progress}
  use:swipeToConfirm={swipeOptions}
>
  <WorkoutStage title={task.performedName} className="lifting-stage">
    {#snippet info()}
      <SupersetMeta {active} {task} />
      <p class="set-count">Set {task.set} of {task.sets}</p>
      <p class="target-prescription">
        Target: {task.targetRepRange || task.reps} reps · {task.targetRir || task.rir} RIR
      </p>
    {/snippet}
    {#snippet actions()}
      <form id="set-form" onsubmit={logSet}>
        <div class="set-values" role="group" aria-label="Set values">
          {#each SET_FIELDS as field (field)}
            <button
              type="button"
              class="set-value"
              data-no-swipe
              id="{field}-pick"
              aria-label="{NAMES[field]} {values[field] || '0'}, change"
              use:scrubValue={scrubOptions(field)}
              onclick={() => pick(field)}
              ><output id="{field}-value">{values[field] || '0'}</output><span>{LABELS[field]}</span
              ></button
            >
          {/each}
        </div>
        <button class="primary log-set" id="log-set" type="submit" disabled={busy}
          >Log set{#if !learned}<span class="log-arrow" aria-hidden="true">→</span>{/if}</button
        >
        {#if model.canCutOptional}
          <button
            class="primary"
            id="cut-optional"
            type="button"
            disabled={busy}
            onclick={cutOptional}>Cut Optional Accessories</button
          >
        {/if}
      </form>
    {/snippet}
    {#snippet more()}
      <p class="previous-performance">
        Previous: {#if model.previous}{model.previous.weight ?? 'bodyweight'}
          {model.previous.unit || unit} × {model.previous.reps} @ {model.previous.rir ?? '—'} RIR{:else}No
          logged set{/if}
      </p>
      {#if model.progressionLoad !== null}
        <p class="progression-note">
          Progression: try {model.progressionLoad}
          {unit} this exposure.
        </p>
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
    {/snippet}
  </WorkoutStage>
  <div class="swipe-badge" aria-hidden="true">{swipe.armed ? '✓ Release to log' : 'Log set →'}</div>
</div>
{#if scrub}
  <ScrubWheel values={scrub.values} index={scrub.index} rect={scrub.rect} />
{/if}
