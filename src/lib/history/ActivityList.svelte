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
      <li>
        <div class="list-link">
          <span
            ><time>{activity.date}</time><span aria-hidden="true"> · </span><strong
              >{activity.label}</strong
            ></span
          ><small>{activity.metric}</small>
        </div>
      </li>
    {:else}
      <ListRow label="No activities yet" linkClass="empty-state" skip />
    {/each}
  </AppList>
</section>
