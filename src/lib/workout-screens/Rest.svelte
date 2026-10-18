<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { act } from '../app-state.svelte.ts';
  import { REST_MS } from '../constants.ts';
  import { getState } from '../state.ts';
  import type { ActiveWorkout } from '../types.ts';
  import {
    continueRest,
    exerciseChangeAvailable,
    exerciseSelectionLocked,
    findNext,
    formatDuration,
    previewSkipRest,
    previewUndo,
    sessionBudgetState,
    undoLastSet,
  } from '../workout/index.ts';
  import { cue } from '../browser/feedback.ts';
  import Countdown from '../components/Countdown.svelte';
  import SwipeCard from '../components/SwipeCard.svelte';
  import SwipeHint from '../components/SwipeHint.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';
  import StepPeek from './StepPeek.svelte';
  import SupersetMeta from './SupersetMeta.svelte';
  import { lastLoggedSet } from './lifting-model.ts';

  let { active }: { active: ActiveWorkout } = $props();

  const next = $derived.by(() => {
    const position = Number.isInteger(active.nextPos)
      ? (active.nextPos as number)
      : findNext(-1, true);
    return (
      active.tasks[position] ||
      active.tasks.find((task, index) => index > active.pos && !task.skipped) ||
      active.tasks[active.pos + 1]
    );
  });
  const canChange = $derived(!exerciseSelectionLocked(active) && exerciseChangeAvailable(active));
  const hasCompletedSet = $derived(active.tasks.some((task) => task.completed));
  const unit = getState().settings?.unit || 'kg';
  // The set just logged, confirmed on arrival; it is also what "Undo Last Set" would remove.
  const logged = $derived(lastLoggedSet(active));
  const fresh = untrack(() => Date.now() - Date.parse(logged?.completedAt || '') < 5000);

  let now = $state(Date.now());
  $effect(() => {
    const clock = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(clock);
  });
  const budget = $derived(sessionBudgetState(active, now));
  let busy = $state(false);

  function undo() {
    cue('undo');
    void run(undoLastSet);
  }

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    busy = true;
    await act(action);
    busy = false;
  }
</script>

{#snippet afterRest()}
  <StepPeek {active} preview={previewSkipRest(active)} {unit} />
{/snippet}
{#snippet afterUndo()}
  {@const reopened = previewUndo(active)}
  {#if reopened}<StepPeek {active} preview={reopened} {unit} />{/if}
{/snippet}

<SwipeCard
  onconfirm={() => run(continueRest)}
  confirmLabel="Skip Rest"
  behindConfirm={afterRest}
  behindUndo={afterUndo}
  onup={canChange ? () => goto('/workout/?view=exercises') : undefined}
  onundo={hasCompletedSet ? undo : undefined}
  disabled={busy}
>
  <WorkoutStage
    title={next ? next.performedName : 'Rest'}
    className="rest-stage"
    countdown
    titleHref={canChange ? '/workout/?view=exercises' : undefined}
  >
    {#snippet info()}
      {#if logged}
        <p class={['set-logged', fresh && 'is-fresh']} role="status">
          <span aria-hidden="true">✓</span>
          {logged.reps} × {logged.weight ?? 'bodyweight'}
          {logged.weight != null ? logged.unit || unit : ''} · {logged.rir ?? '—'} RIR
        </p>
      {/if}
      {#if next}
        <SupersetMeta {active} task={next} />
        <p class="set-count">
          <span aria-hidden="true">{next.set}/{next.sets}</span><span class="sr-only"
            >Set {next.set} of {next.sets}</span
          >
        </p>
      {/if}
      {#if budget.capReached}
        <p class="session-budget is-at-cap" aria-hidden="true">60:00 reached</p>
      {/if}
    {/snippet}
    {#snippet actions()}
      <Countdown
        endAt={active.restEndsAt}
        label="Rest remaining"
        variant="rest"
        total={active.tasks[active.pos]?.restMs || REST_MS}
        onend={() => {
          // Rest over: go straight to the next set; "Continue" only skips the rest early.
          cue('restDone');
          void run(continueRest);
        }}
      />
      <SwipeHint text={`Swipe ← skip · → undo${canChange ? ' · ↑ exercise' : ''}`} />
    {/snippet}
    {#snippet more()}
      <div class="countdown-actions">
        <button
          class="primary"
          id="continue"
          type="button"
          disabled={busy}
          onclick={() => run(continueRest)}>Skip Rest</button
        >
        <button
          class="secondary"
          id="undo-set"
          type="button"
          disabled={!hasCompletedSet || busy}
          onclick={undo}>Undo Last Set</button
        >
      </div>
      {#if next}
        <p class="target-prescription">
          Target: {next.targetRepRange || next.reps} reps · {next.targetRir || next.rir} RIR
        </p>
      {/if}
      <p class="session-budget">
        Session <time id="rest-session-elapsed">{formatDuration(budget.elapsedMs)}</time>
      </p>
    {/snippet}
  </WorkoutStage>
</SwipeCard>
