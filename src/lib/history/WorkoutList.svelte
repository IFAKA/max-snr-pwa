<script lang="ts">
  import { appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { workoutDate } from './history-format.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';

  const workouts = $derived.by(() => {
    void appVersion.value;
    return getState().history.map((workout, index) => ({
      index,
      date: workoutDate(workout),
      name: workout.name || 'Workout',
    }));
  });
</script>

<section aria-labelledby="workouts-title">
  <Title text="Workouts" id="workouts-title" />
  <AppList label="Logged workouts" rows={workouts.length}>
    {#each workouts as workout (workout.index)}
      <ListRow
        href={`/history/?view=workout&id=${workout.index}`}
        icon="chevron"
        iconLabel="Open workout"
      >
        {#snippet content()}
          <span class="history-workout-label"
            ><time>{workout.date}</time><span aria-hidden="true">·</span><strong
              >{workout.name}</strong
            ></span
          >
        {/snippet}
      </ListRow>
    {:else}
      <ListRow label="No workouts yet" linkClass="empty-state" skip />
    {/each}
  </AppList>
</section>
