<script lang="ts">
  import { isWorkoutDay, workoutName } from './routine-data.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import StartWorkout from './StartWorkout.svelte';

  let { day }: { day: string } = $props();
  const available = $derived(isWorkoutDay(day));
</script>

<section aria-labelledby="day-title">
  <Title text={available ? workoutName(day) : 'Rest'} id="day-title" />
  <AppList label="Workout actions" rows={available}>
    {#if available}
      <ListRow
        label="Exercises"
        href={`/routine/?day=${encodeURIComponent(day)}&view=exercises`}
        icon="chevron"
        iconLabel="Open exercises"
      />
      <StartWorkout {day} />
    {:else}
      <ListRow label="Start" disabled linkClass="is-disabled" icon="dash" iconLabel="Unavailable" />
    {/if}
  </AppList>
</section>
