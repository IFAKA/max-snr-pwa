<script lang="ts">
  import type { ActiveWorkout, Task } from '../types.ts';
  import { supersetProgress } from '../workout/index.ts';

  let { active, task }: { active: ActiveWorkout; task: Task | undefined } = $props();
  const progress = $derived(supersetProgress(active, task));
</script>

{#if progress}
  <small
    class="superset-progress"
    aria-label="Superset exercise {progress.currentMember} of {progress.totalMembers}"
    >Superset · Exercise {progress.currentMember} of {progress.totalMembers}<span
      >{progress.remaining}
      {progress.remaining === 1 ? 'exercise' : 'exercises'} before rest</span
    ></small
  >
{/if}
