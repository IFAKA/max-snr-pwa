<script lang="ts">
  import { appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { nextRotationDay } from '../workout/index.ts';
  import { isWorkoutDay, workoutName } from './routine-data.ts';
  import AppList from '../components/AppList.svelte';
  import ListLabel from '../components/ListLabel.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import ExerciseRows from './ExerciseRows.svelte';
  import StartWorkout from './StartWorkout.svelte';

  // One screen per workout: Start first, the exercises right below it (no extra screen to open).
  let { day }: { day: string } = $props();
  const available = $derived(isWorkoutDay(day));
  const next = $derived.by(() => {
    void appVersion.value;
    return nextRotationDay(getState().history) === day;
  });
</script>

<section aria-labelledby="day-title">
  <Title text={available ? workoutName(day) : 'Rest'} id="day-title" />
  <AppList label="Workout" rows={`${available}${next}${day}`}>
    {#if available}
      <StartWorkout {day} />
      <ListLabel text={next ? 'Exercises · up next' : 'Exercises'} />
      <ExerciseRows {day} />
    {:else}
      <ListRow label="Start" disabled linkClass="is-disabled" icon="dash" iconLabel="Unavailable" />
    {/if}
  </AppList>
</section>
