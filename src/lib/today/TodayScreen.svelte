<script lang="ts">
  import { goto } from '$app/navigation';
  import { act, appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import { isWorkoutDay, workoutName } from '../routine/routine-data.ts';
  import {
    completedWorkoutsThisWeek,
    dayNow,
    isCurrentDayComplete,
    selectRecommendation,
    selectedFrequency,
    start,
  } from '../workout/index.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import { weeklyProgressLabel } from './weekly-progress.ts';

  const view = $derived.by(() => {
    void appVersion.value;
    const state = getState();
    const day = dayNow();
    const routine = isWorkoutDay(day);
    const recommendation = selectRecommendation(state, {
      day: routine ? day : '',
      now: new Date(),
    });
    const active = Boolean(state.active);
    return {
      day,
      routine,
      active,
      recommendation,
      title:
        active || recommendation.type === 'resistance' ? workoutName(day) : recommendation.title,
      complete: !active && isCurrentDayComplete(state.history, day),
      weekly: weeklyProgressLabel(
        completedWorkoutsThisWeek(state.history),
        state.prescription?.daysPerWeek || selectedFrequency().days,
      ),
    };
  });

  // Remember the shown recommendation so it stays stable between visits.
  $effect(() => {
    const { type, score } = view.recommendation;
    const settings = getState().settings;
    if (settings.recommendation?.type === type && settings.recommendation?.score === score) return;
    settings.recommendation = { type, score, selectedAt: Date.now() };
    void persist().catch(() => {});
  });

  let starting = $state(false);
  async function startToday() {
    starting = true;
    const started = await act(() => start(view.day));
    if (started) await goto('/workout/');
    else starting = false;
  }
</script>

<section class="today-screen" aria-labelledby="today-title">
  <Title text={view.title} id="today-title" />
  <p class="routine-summary">{view.recommendation.reason}</p>
  <p class="routine-summary">{view.weekly}</p>
  <AppList
    label="Home navigation"
    rows={`${view.complete}${view.active}${view.recommendation.type}`}
  >
    {#if view.complete}
      <ListRow
        label="Done"
        icon="check"
        iconLabel="Workout complete"
        rowClass="complete-row"
        status
      />
    {:else if view.active}
      <ListRow label="Continue" href="/workout/" icon="chevron" iconLabel="Continue" />
    {:else if view.recommendation.type === 'resistance' && view.routine}
      <ListRow
        label="Start"
        icon="chevron"
        iconLabel="Start workout"
        primary
        disabled={starting}
        onclick={startToday}
      />
    {:else if view.recommendation.type === 'rest'}
      <ListRow label={view.recommendation.metric} icon="check" iconLabel="On track" status />
    {:else}
      <ListRow
        label={`Start · ${view.recommendation.metric}`}
        href={`/workout/?activity=${encodeURIComponent(view.recommendation.type)}`}
        icon="chevron"
        iconLabel="Start activity"
      />
    {/if}
    <ListRow label="Routine" href="/routine/" icon="chevron" iconLabel="Open routine" />
    <ListRow label="History" href="/history/" icon="chevron" iconLabel="Open history" />
  </AppList>
</section>
