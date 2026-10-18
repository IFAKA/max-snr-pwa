<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { act, showError } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import type { ActiveWorkout, Task } from '../types.ts';
  import { completeSet, finishAtBudget, previewLog } from '../workout/index.ts';
  import { cue } from '../browser/feedback.ts';
  import SwipeCard from '../components/SwipeCard.svelte';
  import SwipeHint from '../components/SwipeHint.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';
  import StepPeek from './StepPeek.svelte';
  import SupersetMeta from './SupersetMeta.svelte';
  import { swipeLearned } from '../browser/swipe-log.ts';
  import ValueWheel from './ValueWheel.svelte';
  import {
    formatLoad,
    isBetterSet,
    liftingModel,
    pickerValues,
    SET_FIELDS,
    type SetField,
  } from './lifting-model.ts';

  // Logging a set is one tap or one swipe: the values start from the draft, last time, or the
  // progression rule, and "Log set" accepts them. Tapping a value opens its wheel to change it.
  // Details sit on a second page.
  let { active, task }: { active: ActiveWorkout; task: Task } = $props();

  const unit = getState().settings?.unit || 'kg';
  // The dispatcher re-mounts this screen per task, so starting values are read once.
  const model = untrack(() => liftingModel(active, task, unit));
  let values = $state({ reps: model.reps, weight: model.weight, rir: model.rir });
  let wheel = $state<SetField | null>(null);
  const LABELS: Record<SetField, string> = { reps: 'Reps', weight: unit, rir: 'RIR' };
  const NAMES: Record<SetField, string> = { reps: 'Reps', weight: `Load in ${unit}`, rir: 'RIR' };
  let busy = $state(false);
  const learned = swipeLearned();

  const shown = (field: SetField) =>
    field === 'weight' ? formatLoad(Number(values.weight || 0)) : values[field];

  // The wheel closed: keep its value, and the draft too, so the set survives a re-render.
  function picked(field: SetField, value: string) {
    wheel = null;
    if (value === shown(field)) return;
    values[field] = value;
    active.draft = { ...active.draft, ...values };
    persist().catch(showError);
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
              id="{field}-pick"
              aria-label="{NAMES[field]} {values[field] || '0'}, change"
              aria-haspopup="dialog"
              onclick={() => (wheel = field)}
              ><output id="{field}-value">{values[field] || '0'}</output><span>{LABELS[field]}</span
              ></button
            >
          {/each}
        </div>
        <SwipeHint
          text={`← swipe to log${task.set === 1 && model.canChangeExercise ? ' · ↑ exercise' : ''}`}
        />
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
{#if wheel}
  {@const field = wheel}
  <ValueWheel
    values={pickerValues(field, shown(field))}
    current={shown(field)}
    label={NAMES[field]}
    format={field === 'weight' ? (value) => `${value} ${unit}` : undefined}
    onclose={(value) => picked(field, value)}
  />
{/if}
