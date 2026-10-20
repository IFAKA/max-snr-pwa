<script lang="ts">
  import type { Activity } from '../types.ts';
  import { act } from '../app-state.svelte.ts';
  import { goUp } from '../browser/navigation.ts';
  import { deleteActivity } from '../workout/index.ts';
  import { activityLine } from './history-format.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import DeleteRow from './DeleteRow.svelte';

  let { activity }: { activity: Activity } = $props();
  const line = $derived(activityLine(activity));

  async function remove() {
    if (await act(() => deleteActivity(activity.id))) await goUp('/history/');
  }
</script>

<section aria-labelledby="activity-title">
  <Title text={line.label} id="activity-title" />
  <AppList label="Activity actions" rows={activity.id}>
    <DeleteRow
      label="Delete Activity"
      title="Delete this activity?"
      body="It is removed from History. This cannot be undone."
      keepLabel="Keep Activity"
      ondelete={remove}
    />
    <ListRow label={line.date} status />
    {#if line.metric}<ListRow label={line.metric} status />{/if}
  </AppList>
</section>
