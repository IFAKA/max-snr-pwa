<script lang="ts">
  import type { ActiveWorkout, Task } from '../types.ts';
  import { supersetProgress } from '../workout/index.ts';

  let { active, task }: { active: ActiveWorkout; task: Task | undefined } = $props();
  const progress = $derived(supersetProgress(active, task));
</script>

{#if progress}
  <small class="superset-progress"
    ><span aria-hidden="true">Superset {progress.currentMember}/{progress.totalMembers}</span><span
      class="sr-only">Superset exercise {progress.currentMember} of {progress.totalMembers}</span
    ></small
  >
{/if}
