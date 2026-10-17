<script lang="ts">
  import { isWorkoutDay, workoutName } from '../routine/routine-data.ts';
  import StartWorkout from '../routine/StartWorkout.svelte';
  import AppList from '../components/AppList.svelte';
  import Title from '../components/Title.svelte';

  let { day }: { day: string } = $props();
  const available = $derived(isWorkoutDay(day));
</script>

<section aria-labelledby="start-title">
  <Title text={available ? workoutName(day) : 'Rest'} id="start-title" />
  {#if available}
    <AppList label="Workout actions" rows={day}><StartWorkout {day} /></AppList>
  {:else}
    <p class="notice">Rest</p>
  {/if}
</section>
