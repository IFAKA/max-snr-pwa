<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Task } from '../types.ts';
  import SwipeCard from '../components/SwipeCard.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';

  let { task }: { task: Task } = $props();
</script>

<SwipeCard confirmLabel="Continue" onconfirm={() => goto('/workout/?view=exercise')}>
  <WorkoutStage
    title={task.performedName}
    className="exercise-selection-stage"
    titleHref="/workout/?view=exercises&return=select"
  >
    {#snippet info()}<p class="muted">Choose your first exercise.</p>{/snippet}
    {#snippet actions()}
      <p class="swipe-hint" aria-hidden="true">Swipe ← continue · tap name to change</p>
    {/snippet}
    {#snippet more()}
      <button
        class="primary"
        id="continue-selection"
        type="button"
        onclick={() => goto('/workout/?view=exercise')}>Continue</button
      >
      <button
        class="secondary"
        id="change-exercise"
        type="button"
        onclick={() => goto('/workout/?view=exercises&return=select')}>Change Exercise</button
      >
    {/snippet}
  </WorkoutStage>
</SwipeCard>
