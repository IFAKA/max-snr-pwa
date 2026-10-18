<script lang="ts">
  import { appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { activityLine } from './history-format.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';

  const activities = $derived.by(() => {
    void appVersion.value;
    return getState().health.activities.slice().reverse().map(activityLine);
  });
</script>

<section aria-labelledby="activities-title">
  <Title text="Activities" id="activities-title" />
  <AppList label="Completed activities" rows={activities.length}>
    {#each activities as activity, index (index)}
      <!-- Same one-line date · name row as Workouts, with the duration at the end. -->
      <ListRow>
        {#snippet content()}
          <span class="history-workout-label"
            ><time>{activity.date}</time><span aria-hidden="true">·</span><strong
              >{activity.label}</strong
            ></span
          >
        {/snippet}
        {#snippet trailing()}{#if activity.metric}<small>{activity.metric}</small>{/if}{/snippet}
      </ListRow>
    {:else}
      <ListRow label="No activities yet" linkClass="empty-state" skip />
    {/each}
  </AppList>
</section>
