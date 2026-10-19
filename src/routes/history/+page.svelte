<script lang="ts">
  import { page } from '$app/state';
  import { appVersion } from '#lib/app-state.svelte.ts';
  import { getState } from '#lib/state.ts';
  import Analytics from '#lib/history/Analytics.svelte';
  import HistoryIndex from '#lib/history/HistoryIndex.svelte';
  import WorkoutDetail from '#lib/history/WorkoutDetail.svelte';
  import Settings from '#lib/history/Settings.svelte';

  const view = $derived(page.url.searchParams.get('view'));
  const workout = $derived.by(() => {
    void appVersion.value;
    return view === 'workout'
      ? getState().history[Number(page.url.searchParams.get('id'))]
      : undefined;
  });
</script>

{#if view === 'workout' && workout}
  <WorkoutDetail {workout} />
{:else if view === 'analytics'}
  <Analytics />
{:else if view === 'muscles' || view === 'insights'}
  <Analytics view="muscles" />
{:else if view === 'measurements'}
  <Analytics view="measurements" />
{:else if view === 'data'}
  <Settings />
{:else}
  <HistoryIndex />
{/if}
