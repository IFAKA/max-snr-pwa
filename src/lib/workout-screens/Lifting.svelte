<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { act, showError } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import type { ActiveWorkout, Task } from '../types.ts';
  import { completeSet, finishAtBudget, previewLog } from '../workout/index.ts';
  import { cue } from '../browser/feedback.ts';
  import SwipeCard from '../components/SwipeCard.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';
  import StepPeek from './StepPeek.svelte';
  import SupersetMeta from './SupersetMeta.svelte';
  import { scrubValue } from '../browser/value-scrub.ts';
  import { swipeLearned } from '../browser/swipe-log.ts';
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
  // The wheel's last values stay after release so it can animate out showing them.
  let scrub = $state<{
    field: SetField;
    values: string[];
    index: number;
  } | null>(null);
  let scrubbing = $state(false);
  const LABELS: Record<SetField, string> = { reps: 'Reps', weight: unit, rir: 'RIR' };
  const NAMES: Record<SetField, string> = { reps: 'Reps', weight: `Load in ${unit}`, rir: 'RIR' };
  let busy = $state(false);
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
      onScrub: (state: Omit<NonNullable<typeof scrub>, 'field'> | null) => {
        scrubbing = !!state;
        if (state) scrub = { field, ...state };
      },
      onHold: () => cue('hold'),
      onTick: () => cue('pick'),
      onCommit: (value: string) => (values[field] = value),
    };
  }

  const submit = () => document.querySelector<HTMLFormElement>('#set-form')?.requestSubmit();

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

{#snippet next()}
  <StepPeek {active} preview={previewLog(active)} {unit} logging={values} />
{/snippet}

<SwipeCard
  onconfirm={submit}
  quickConfirm
  confirmLabel="Log"
  behindConfirm={next}
  onup={task.set === 1 && model.canChangeExercise
    ? () => goto('/workout/?view=exercises')
    : undefined}
  disabled={busy}
>
  <WorkoutStage
    title={task.performedName}
    className="lifting-stage"
    titleHref={task.set === 1 && model.canChangeExercise ? '/workout/?view=exercises' : undefined}
  >
    {#snippet info()}
      <SupersetMeta {active} {task} />
      <p class="set-count">
        <span aria-hidden="true"
          >{task.set}/{task.sets} · {task.targetRepRange || task.reps} reps</span
        ><span class="sr-only"
          >Set {task.set} of {task.sets}, {task.targetRepRange || task.reps} reps</span
        >
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
        <p class="swipe-hint" aria-hidden="true">
          ← swipe to log{task.set === 1 && model.canChangeExercise ? ' · ↑ exercise' : ''}
        </p>
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
      <button class="primary log-set" id="log-set" type="submit" form="set-form" disabled={busy}
        >Log set{#if !learned}<span class="log-arrow" aria-hidden="true">→</span>{/if}</button
      >
      <p class="target-prescription">
        Target: {task.targetRepRange || task.reps} reps · {task.targetRir || task.rir} RIR
      </p>
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
    {/snippet}
  </WorkoutStage>
</SwipeCard>
{#if scrubbing && scrub}
  <ScrubWheel values={scrub.values} index={scrub.index} />
{/if}
