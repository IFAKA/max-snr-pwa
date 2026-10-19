<script lang="ts">
  import { appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { rotationDays, workoutName } from './routine-data.ts';
  import { nextRotationDay } from '../workout/index.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';

  // The workouts in rotation order, named as Today names them. "Next" marks the one Today starts;
  // any of them can be opened and started, in any order.
  const view = $derived.by(() => {
    void appVersion.value;
    const next = nextRotationDay(getState().history);
    return {
      days: rotationDays().map((day) => ({ day, name: workoutName(day), next: day === next })),
    };
  });
</script>

<section aria-labelledby="routine-title">
  <Title text="Routine" id="routine-title" />
  <AppList label="Workouts" rows={view.days.map((item) => `${item.day}${item.next}`).join()}>
    {#each view.days as item (item.day)}
      <ListRow
        href={`/routine/?day=${encodeURIComponent(item.day)}`}
        icon="chevron"
        iconLabel={`Open ${item.name}`}
      >
        {#snippet content()}
          <span>{item.name}</span>
        {/snippet}
        {#snippet trailing()}{#if item.next}<small>Next</small>{/if}{/snippet}
      </ListRow>
    {/each}
  </AppList>
</section>
