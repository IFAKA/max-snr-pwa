<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Task } from '../types.ts';
  import WorkoutStage from '../components/WorkoutStage.svelte';

  let { task }: { task: Task } = $props();
</script>

<WorkoutStage title={task.performedName} className="exercise-selection-stage">
  {#snippet info()}<p class="muted">Choose your first exercise.</p>{/snippet}
  {#snippet actions()}
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
