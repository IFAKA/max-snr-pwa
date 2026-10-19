<script lang="ts">
  import { goto } from '$app/navigation';
  import confetti from 'canvas-confetti';
  import { act } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import type { Workout } from '../types.ts';
  import { workoutName } from '../routine/routine-data.ts';
  import {
    improvementCallouts,
    nextRotationDay,
    reopenWorkout,
    workoutSummary,
  } from '../workout/index.ts';
  import { cue } from '../browser/feedback.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';

  // The workout is already saved when this shows. The celebration sits next to the gains it
  // celebrates, and "Reopen" is the undo for finishing by mistake.
  let { workout }: { workout: Workout } = $props();

  const unit = getState().settings?.unit || 'kg';
  const callouts = $derived(improvementCallouts(workout, unit));
  const canReopen = $derived(!getState().active && getState().history[0]?.id === workout.id);
  let busy = $state(false);

  $effect(() => {
    const key = `maxsnr-celebrated:${workout.id}`;
    if (globalThis.sessionStorage?.getItem(key)) return;
    globalThis.sessionStorage?.setItem(key, '1');
    cue('finished');
    void confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      disableForReducedMotion: true,
    });
  });

  async function reopen() {
    busy = true;
    const reopened = await act(() => reopenWorkout(workout.id));
    if (reopened) await goto('/workout/', { replace: true });
    else busy = false;
  }
</script>

<WorkoutStage title={workout.name} className="completion-stage">
  {#snippet info()}
    <p class="set-count">{workoutSummary(workout)}</p>
    <p class="muted" role="status">Saved to History</p>
    {#if canReopen}
      <p class="muted">Next: {workoutName(nextRotationDay(getState().history))}</p>
    {/if}
    {#if callouts.length}
      <AppList label="Improvements Since Last Session" rows={workout.id}>
        {#each callouts as line (line)}
          <ListRow label={line} rowClass="list-block" />
        {/each}
      </AppList>
    {/if}
  {/snippet}
  {#snippet actions()}
    <button class="primary" id="finish" type="button" onclick={() => goto('/', { replace: true })}
      >Done</button
    >
    {#if canReopen}
      <button class="secondary" id="reopen-workout" type="button" disabled={busy} onclick={reopen}
        >Reopen Workout</button
      >
    {/if}
  {/snippet}
</WorkoutStage>
