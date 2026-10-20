<script lang="ts">
  import { replaceUrl } from '../browser/navigation.ts';
  import { act } from '../app-state.svelte.ts';
  import { PLANK_MS } from '../constants.ts';
  import type { ActiveWorkout } from '../types.ts';
  import { beginLifting, skipPlank } from '../workout/index.ts';
  import { cue } from '../browser/feedback.ts';
  import Countdown from '../components/Countdown.svelte';
  import SwipeCard from '../components/SwipeCard.svelte';
  import SwipeHint from '../components/SwipeHint.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';

  let { active }: { active: ActiveWorkout } = $props();
  let busy = $state(false);

  async function toLifting(action: () => Promise<unknown>) {
    if (busy) return;
    busy = true;
    await act(action);
    await replaceUrl('/workout/');
  }

  $effect(() => {
    if (!(active.timerEndsAt && active.timerEndsAt > Date.now())) void toLifting(beginLifting);
  });
</script>

<SwipeCard onconfirm={() => toLifting(skipPlank)} confirmLabel="Finish" disabled={busy}>
  <WorkoutStage title="Plank" countdown>
    {#snippet actions()}
      <Countdown
        endAt={active.timerEndsAt}
        label="Plank remaining"
        variant="plank"
        total={PLANK_MS}
        onend={() => {
          cue('timerDone');
          void toLifting(beginLifting);
        }}
      />
      <SwipeHint text="Swipe ← finish" />
    {/snippet}
    {#snippet more()}
      <div class="countdown-actions">
        <button
          class="primary"
          id="skip-plank"
          type="button"
          disabled={busy}
          onclick={() => toLifting(skipPlank)}>Finish</button
        >
      </div>
    {/snippet}
  </WorkoutStage>
</SwipeCard>
