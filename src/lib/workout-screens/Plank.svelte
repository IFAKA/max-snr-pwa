<script lang="ts">
  import { goto } from '$app/navigation';
  import { act } from '../app-state.svelte.ts';
  import type { ActiveWorkout } from '../types.ts';
  import { beginLifting, skipPlank } from '../workout/index.ts';
  import { buzz, HAPTICS } from '../browser/device.ts';
  import Countdown from '../components/Countdown.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';

  let { active }: { active: ActiveWorkout } = $props();
  let busy = $state(false);

  async function toLifting(action: () => Promise<unknown>) {
    if (busy) return;
    busy = true;
    await act(action);
    await goto('/workout/?view=select', { replace: true });
  }

  $effect(() => {
    if (!(active.timerEndsAt && active.timerEndsAt > Date.now())) void toLifting(beginLifting);
  });
</script>

<WorkoutStage title="Plank" countdown>
  {#snippet actions()}
    <Countdown
      endAt={active.timerEndsAt}
      label="Plank remaining"
      variant="plank"
      onend={() => {
        buzz(HAPTICS.timerDone);
        void toLifting(beginLifting);
      }}
    />
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
