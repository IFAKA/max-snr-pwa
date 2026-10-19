<script lang="ts">
  import { goto } from '$app/navigation';
  import { act, appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import { workoutName } from '../routine/routine-data.ts';
  import { nextRotationDay, selectRecommendation, start } from '../workout/index.ts';
  import AppList from '../components/AppList.svelte';
  import ListLabel from '../components/ListLabel.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import RestartRow from './RestartRow.svelte';

  // Rotation, not calendar: the next workout is the day after the last saved one (A → B → C → A),
  // whatever the weekday and however long the gap. One button starts it; everything else is a row.
  const view = $derived.by(() => {
    void appVersion.value;
    const state = getState();
    const day = nextRotationDay(state.history);
    const suggestion = selectRecommendation(state, { now: new Date() });
    return {
      day,
      active: Boolean(state.active),
      title: state.active?.name ?? workoutName(day),
      suggestion,
      suggested: !state.active && suggestion.type !== 'rest' && suggestion.type !== 'resistance',
    };
  });

  // Remember the shown suggestion so it stays stable between visits.
  $effect(() => {
    const { type, score } = view.suggestion;
    const settings = getState().settings;
    if (settings.recommendation?.type === type && settings.recommendation?.score === score) return;
    settings.recommendation = { type, score, selectedAt: Date.now() };
    void persist().catch(() => {});
  });

  let starting = $state(false);
  async function startNext() {
    starting = true;
    const started = await act(() => start(view.day));
    if (started) await goto('/workout/');
    else starting = false;
  }
</script>

<section class="today-screen" aria-labelledby="today-title">
  <Title text={view.title} id="today-title" />
  <AppList label="Home navigation" rows={`${view.active}${view.day}${view.suggested}`}>
    <ListLabel text="Short on time?" />
    <RestartRow kind="floor" label="At the gym · 30 min" />
    <RestartRow kind="home" label="At home · 15 min" />
    {#if view.suggested}
      <ListLabel text="Also suggested" />
      <ListRow
        label={`${view.suggestion.title} · ${view.suggestion.metric}`}
        href={`/workout/?activity=${encodeURIComponent(view.suggestion.type)}`}
        icon="chevron"
        iconLabel="Start activity"
      />
    {/if}
    <ListLabel text="More" />
    <ListRow label="Routine" href="/routine/" icon="chevron" iconLabel="Open routine" />
    <ListRow label="History" href="/history/" icon="chevron" iconLabel="Open history" />
    <ListRow label="Settings" href="/history/?view=data" icon="chevron" iconLabel="Open settings" />
  </AppList>
  {#if view.active}
    <a class="primary start-button" href="/workout/">Continue</a>
  {:else}
    <button class="primary start-button" type="button" disabled={starting} onclick={startNext}
      >Start</button
    >
  {/if}
</section>
