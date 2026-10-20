<script lang="ts">
  import { leaveToToday } from '../browser/navigation.ts';
  import { act } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import { activityDefinition } from '../health/activity-data.ts';
  import { recordActivity } from '../health/health-data.ts';
  import { cue } from '../browser/feedback.ts';
  import Countdown from '../components/Countdown.svelte';
  import { setActivityStatus } from '../browser/native-app.ts';
  import SwipeCard from '../components/SwipeCard.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';
  import WorkoutGuard from './WorkoutGuard.svelte';

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
  // The countdown also runs in the status bar and on the lock screen in the Android app.
  $effect(() => {
    if (!definition.durationMs) return;
    const title = definition.title;
    setActivityStatus({
      endsAt: startedAtMs + definition.durationMs,
      total: definition.durationMs,
      title,
      text: 'It finishes by itself when the time is up',
      progress: '',
      chip: '',
      actions: [],
      doneTitle: `${title} done`,
      doneText: 'Saved',
    });
    return () => setActivityStatus(null);
  });
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
    await leaveToToday();
  }

  // Leaving a timed activity asks, like a workout does: otherwise it keeps running and opening
  // it again resumes it, with no way to end it short of finishing it.
  async function discard() {
    if (finished) return;
    finished = true;
    globalThis.sessionStorage?.removeItem(storageKey);
    await leaveToToday();
  }
</script>

{#if definition.durationMs > 0}
  <WorkoutGuard main activity={{ title: definition.title, save: finish, discard }} />
{/if}

<SwipeCard onconfirm={finish} confirmLabel="Finish" disabled={type === 'measurement'}>
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
