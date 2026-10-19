<script lang="ts">
  import { page } from '$app/state';
  import { appVersion } from '#lib/app-state.svelte.ts';
  import { getState } from '#lib/state.ts';
  import ActivityList from '#lib/history/ActivityList.svelte';
  import Analytics from '#lib/history/Analytics.svelte';
  import HistoryIndex from '#lib/history/HistoryIndex.svelte';
  import WorkoutDetail from '#lib/history/WorkoutDetail.svelte';
  import WorkoutList from '#lib/history/WorkoutList.svelte';

  const view = $derived(page.url.searchParams.get('view'));
  const workout = $derived.by(() => {
    void appVersion.value;
    return view === 'workout'
      ? getState().history[Number(page.url.searchParams.get('id'))]
      : undefined;
  });
</script>

{#if view === 'workouts' || (view === 'workout' && !workout)}
  <WorkoutList />
{:else if view === 'workout' && workout}
  <WorkoutDetail {workout} />
{:else if view === 'activities'}
  <ActivityList />
{:else if view === 'analytics'}
  <Analytics />
{:else if view === 'insights'}
  <Analytics insights />
{:else if view === 'data'}
  <HistoryIndex data />
{:else}
  <HistoryIndex />
{/if}
