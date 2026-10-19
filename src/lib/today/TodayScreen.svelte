<script lang="ts">
  import { goto } from '$app/navigation';
  import { act, appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { workoutName } from '../routine/routine-data.ts';
  import { nextRotationDay, start } from '../workout/index.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import RestartRow from './RestartRow.svelte';

  // Rotation, not calendar: the next workout is the day after the last saved one (A → B → C → A),
  // whatever the weekday and however long the gap.
  const view = $derived.by(() => {
    void appVersion.value;
    const state = getState();
    const day = nextRotationDay(state.history);
    return { day, active: Boolean(state.active), title: state.active?.name ?? workoutName(day) };
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
  <AppList label="Home navigation" rows={`${view.active}${view.day}`}>
    {#if view.active}
      <ListRow label="Continue" href="/workout/" icon="chevron" iconLabel="Continue" primary />
    {:else}
      <ListRow
        label="Start"
        icon="chevron"
        iconLabel="Start workout"
        primary
        disabled={starting}
        onclick={startNext}
      />
    {/if}
    <ListRow label="Routine" href="/routine/" icon="chevron" iconLabel="Open routine" />
    <ListRow label="History" href="/history/" icon="chevron" iconLabel="Open history" />
    <RestartRow kind="floor" label="Restart · 30 min" />
    <RestartRow kind="home" label="At home · 15 min" />
  </AppList>
</section>
