<script lang="ts">
  import { page } from '$app/state';
  import { appVersion } from '#lib/app-state.svelte.ts';
  import { getState } from '#lib/state.ts';
  import CheckIn from '#lib/history/CheckIn.svelte';
  import DailyLog from '#lib/history/DailyLog.svelte';
  import Analytics from '#lib/history/Analytics.svelte';
  import HistoryIndex from '#lib/history/HistoryIndex.svelte';
  import ActivityDetail from '#lib/history/ActivityDetail.svelte';
  import WorkoutFix from '#lib/history/WorkoutFix.svelte';
  import WorkoutDetail from '#lib/history/WorkoutDetail.svelte';
  import Settings from '#lib/history/Settings.svelte';

  const view = $derived(page.url.searchParams.get('view'));
  const fix = $derived(page.url.searchParams.get('fix'));
  const workoutIndex = $derived(Number(page.url.searchParams.get('id')));
  const activity = $derived.by(() => {
    void appVersion.value;
    return view === 'activity'
      ? getState().health.activities.find((item) => item.id === page.url.searchParams.get('id'))
      : undefined;
  });
  const workout = $derived.by(() => {
    void appVersion.value;
    return view === 'workout'
      ? getState().history[Number(page.url.searchParams.get('id'))]
      : undefined;
  });
</script>

{#if view === 'workout' && workout && fix}
  <WorkoutFix {workout} index={workoutIndex} from={fix} />
{:else if view === 'workout' && workout}
  <WorkoutDetail {workout} index={workoutIndex} />
{:else if view === 'activity' && activity}
  <ActivityDetail {activity} />
{:else if view === 'analytics'}
  <Analytics />
{:else if view === 'muscles' || view === 'insights'}
  <Analytics view="muscles" />
{:else if view === 'measurements'}
  <Analytics view="measurements" />
{:else if view === 'checkin'}
  <CheckIn />
{:else if view === 'daily'}
  <DailyLog />
{:else if view === 'data'}
  <Settings />
{:else}
  <HistoryIndex />
{/if}
