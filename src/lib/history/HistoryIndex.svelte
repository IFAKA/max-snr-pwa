<script lang="ts">
  import { appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { activityLine, workoutDate } from './history-format.ts';
  import AppList from '../components/AppList.svelte';
  import ListLabel from '../components/ListLabel.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';

  // One list of everything done, newest first: lifting workouts open their sets, activities
  // (walks and the like) just show their duration.
  const entries = $derived.by(() => {
    void appVersion.value;
    const { history, health } = getState();
    const workouts = history.map((workout, index) => ({
      time: workout.startedAt || 0,
      date: workoutDate(workout),
      label: workout.name || 'Workout',
      metric: '',
      href: `/history/?view=workout&id=${index}`,
    }));
    const activities = health.activities.map((activity) => {
      const line = activityLine(activity);
      const when = activity.completedAt || activity.startedAt || activity.date;
      return {
        time: when ? new Date(when).getTime() || 0 : 0,
        ...line,
        href: '',
      };
    });
    return [...workouts, ...activities].sort((a, b) => b.time - a.time);
  });
</script>

<section aria-labelledby="history-title">
  <Title text="History" id="history-title" />
  <AppList label="History" rows={entries.length}>
    <ListRow
      label="This week"
      href="/history/?view=analytics"
      icon="chevron"
      iconLabel="Open this week"
    />
    <ListRow
      label="Muscles"
      href="/history/?view=muscles"
      icon="chevron"
      iconLabel="Open muscles"
    />
    <ListRow
      label="Measurements"
      href="/history/?view=measurements"
      icon="chevron"
      iconLabel="Open measurements"
    />
    <ListRow
      label="Daily log"
      href="/history/?view=daily"
      icon="chevron"
      iconLabel="Open daily log"
    />
    <ListLabel text="Done" />
    {#each entries as entry, index (index)}
      <ListRow
        href={entry.href || undefined}
        icon={entry.href ? 'chevron' : undefined}
        iconLabel="Open workout"
        skip={!entry.href}
      >
        {#snippet content()}
          <span class="history-workout-label"
            ><time>{entry.date}</time><span aria-hidden="true">·</span><strong>{entry.label}</strong
            ></span
          >
        {/snippet}
        {#snippet trailing()}{#if entry.metric}<small>{entry.metric}</small>{/if}{/snippet}
      </ListRow>
    {:else}
      <ListRow
        label="Nothing yet. Finish a workout and it shows here."
        linkClass="empty-state"
        skip
      />
    {/each}
  </AppList>
</section>
