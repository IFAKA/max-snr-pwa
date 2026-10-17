<script lang="ts">
  import { STRETCH_MS } from '../constants.ts';
  import type { ActiveWorkout, Performance, Unit } from '../types.ts';
  import { formatDuration, type StepPreview } from '../workout/index.ts';
  import WorkoutStage from '../components/WorkoutStage.svelte';
  import SupersetMeta from './SupersetMeta.svelte';
  import { liftingModel, SET_FIELDS, type SetField } from './lifting-model.ts';

  // A still of the screen an action leads to, drawn under the swipe card while it is dragged, so
  // the swipe shows where it goes. It mirrors the real screen's layout with the values that screen
  // will open with; it is inert and hidden from assistive tech, and the real screen replaces it.
  let {
    active,
    preview,
    unit,
    logging,
  }: {
    active: ActiveWorkout;
    preview: StepPreview;
    unit: Unit;
    /** The set about to be logged, confirmed at the top of the rest that follows it. */
    logging?: Record<SetField, string>;
  } = $props();

  const labels = $derived<Record<SetField, string>>({ reps: 'Reps', weight: unit, rir: 'RIR' });

  // A reopened set comes back with what was logged; any other set with its usual starting values.
  const values = $derived.by(() => {
    if (preview.phase !== 'lifting') return null;
    const done = preview.task.completed as Performance | null;
    if (done)
      return { reps: String(done.reps), weight: String(done.weight ?? ''), rir: done.rir ?? '' };
    return liftingModel({ ...active, draft: {} }, preview.task, unit);
  });
</script>

{#snippet timer(ms: number, variant: 'rest' | 'stretch')}
  <div class={['countdown-face', `countdown--${variant}`]} style:--progress={1}>
    <div class="big-timer countdown">
      <span class="countdown-digits">{formatDuration(ms)}</span>
    </div>
    <div class="countdown-track"><span></span></div>
  </div>
{/snippet}

{#if preview.phase === 'lifting' && values}
  <WorkoutStage title={preview.task.performedName} className="lifting-stage" titleId="peek-title">
    {#snippet info()}
      <SupersetMeta {active} task={preview.task} />
      <p class="set-count">
        {preview.task.set}/{preview.task.sets} · {preview.task.targetRepRange || preview.task.reps}
        reps
      </p>
    {/snippet}
    {#snippet actions()}
      <div class="set-values">
        {#each SET_FIELDS as field (field)}
          <span class="set-value"
            ><output>{values[field] || '0'}</output><span>{labels[field]}</span></span
          >
        {/each}
      </div>
    {/snippet}
  </WorkoutStage>
{:else if preview.phase === 'rest'}
  <WorkoutStage
    title={preview.next.performedName}
    className="rest-stage"
    countdown
    titleId="peek-title"
  >
    {#snippet info()}
      {#if logging}
        <p class="set-logged">
          <span aria-hidden="true">✓</span>
          {logging.reps} × {logging.weight || 'bodyweight'}
          {logging.weight ? unit : ''} · {logging.rir || '—'} RIR
        </p>
      {/if}
      <SupersetMeta {active} task={preview.next} />
      <p class="set-count">{preview.next.set}/{preview.next.sets}</p>
    {/snippet}
    {#snippet actions()}{@render timer(preview.restMs, 'rest')}{/snippet}
  </WorkoutStage>
{:else}
  <WorkoutStage title="Stretch" className="stretch-stage" countdown titleId="peek-title">
    {#snippet actions()}{@render timer(STRETCH_MS, 'stretch')}{/snippet}
  </WorkoutStage>
{/if}
