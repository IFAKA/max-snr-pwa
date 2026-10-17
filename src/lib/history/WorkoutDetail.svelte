<script lang="ts">
  import type { Workout } from '../types.ts';
  import { exerciseGroups } from './history-format.ts';
  import AppList from '../components/AppList.svelte';
  import ListHeading from '../components/ListHeading.svelte';
  import Title from '../components/Title.svelte';

  let { workout }: { workout: Workout } = $props();
  const groups = $derived(exerciseGroups(workout));
</script>

<section aria-labelledby="workout-title">
  <Title text={workout.name || 'Workout'} id="workout-title" />
  <div class="history-detail">
    <AppList label="Workout sets" rows={workout.id}>
      {#each groups as group, index (group.name)}
        <ListHeading text={group.name} id={`history-exercise-title-${index}`} />
        {#each group.lines as line, lineIndex (lineIndex)}
          <li><div class="list-link"><span class="history-set-label">{line}</span></div></li>
        {/each}
      {/each}
    </AppList>
  </div>
</section>
