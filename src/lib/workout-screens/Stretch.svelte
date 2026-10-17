<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { act } from '../app-state.svelte.ts';
  import { STRETCH_MS } from '../constants.ts';
  import type { ActiveWorkout } from '../types.ts';
  import { completeWorkout, setTimer } from '../workout/index.ts';
  import { completionUrl } from '../browser/routes.ts';
  import { cue } from '../browser/feedback.ts';
  import Countdown from '../components/Countdown.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';

  let { active }: { active: ActiveWorkout } = $props();

  // Entering the cooldown starts its timer; a persisted timer resumes after a refresh.
  const wasRunning = untrack(() => Boolean(active.timerEndsAt && active.timerEndsAt > Date.now()));
  $effect(() => {
    if (!active.timerEndsAt) void act(() => setTimer(STRETCH_MS));
  });

  let busy = $state(false);

  async function finish() {
    busy = true;
    const saved = await act(completeWorkout);
    if (saved) await goto(completionUrl(saved.id), { replace: true });
    else busy = false;
  }
</script>

<WorkoutStage title="Stretch" className="stretch-stage" countdown>
  {#snippet actions()}
    <Countdown
      endAt={active.timerEndsAt}
      label="Stretch remaining"
      variant="stretch"
      total={STRETCH_MS}
      onend={() => {
        if (wasRunning) cue('timerDone');
      }}
    />
    <div class="countdown-actions">
      <div class="controls">
        <button
          class="secondary"
          id="cancel-stretch"
          type="button"
          disabled={busy}
          onclick={() => act(() => setTimer(STRETCH_MS))}>Restart</button
        >
        <button class="primary" id="finish-stretch" type="button" disabled={busy} onclick={finish}
          >Finish</button
        >
      </div>
    </div>
  {/snippet}
</WorkoutStage>
