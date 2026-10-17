<script lang="ts">
  import { goto } from '$app/navigation';
  import { act } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import { activityDefinition } from '../health/activity-data.ts';
  import { recordActivity } from '../health/health-data.ts';
  import { cue } from '../browser/feedback.ts';
  import Countdown from '../components/Countdown.svelte';
  import SwipeCard from '../components/SwipeCard.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';

  let { type }: { type: string } = $props();

  const definition = $derived(activityDefinition(type));
  const storageKey = $derived(`maxsnr-activity-started:${type}`);

  // A timed activity keeps its start time for the tab session, so a refresh resumes it.
  function startedAt() {
    if (!definition.durationMs) return Date.now();
    const stored = Number(globalThis.sessionStorage?.getItem(storageKey));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const now = Date.now();
    globalThis.sessionStorage?.setItem(storageKey, String(now));
    return now;
  }
  const startedAtMs = startedAt();
  let finished = false;
  let waist = $state('');

  async function finish() {
    if (finished) return;
    finished = true;
    await act(async () => {
      recordActivity(getState(), type, startedAtMs, { waist: Number(waist) });
      globalThis.sessionStorage?.removeItem(storageKey);
      await persist();
    });
    await goto('/', { replace: true });
  }
</script>

<SwipeCard
  rightLabel={type === 'rest' ? 'Continue' : 'Finish'}
  onright={finish}
  disabled={type === 'measurement'}
>
  <WorkoutStage
    title={definition.title}
    className="activity-stage"
    countdown={definition.durationMs > 0}
  >
    {#snippet actions()}
      {#if definition.durationMs > 0}
        <Countdown
          endAt={startedAtMs + definition.durationMs}
          label={`${definition.title} remaining`}
          variant="activity"
          total={definition.durationMs}
          onend={() => {
            cue('timerDone');
            void finish();
          }}
        />
        <div class="countdown-actions">
          <button class="primary" id="finish-activity" type="button" onclick={finish}>Finish</button
          >
        </div>
      {:else if type === 'measurement'}
        <form
          id="activity-form"
          class="activity-form"
          onsubmit={(event) => {
            event.preventDefault();
            void finish();
          }}
        >
          <label class="analytics-field"
            ><span>Waist (cm)</span><input
              name="waist"
              type="number"
              min="1"
              step="0.1"
              inputmode="decimal"
              required
              bind:value={waist}
            /></label
          >
          <button class="primary" type="submit">Save</button>
        </form>
      {:else}
        <p class="workout-metric" aria-label="Activity metric">{definition.metric}</p>
        <button class="primary" id="finish-activity" type="button" onclick={finish}
          >{type === 'rest' ? 'Continue' : 'Finish'}</button
        >
      {/if}
    {/snippet}
  </WorkoutStage>
</SwipeCard>
