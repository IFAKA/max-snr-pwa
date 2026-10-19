<script lang="ts">
  import { appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { analyticsModel, type MeasurementRow, type ValueRow } from './analytics-model.ts';
  import AppList from '../components/AppList.svelte';
  import Title from '../components/Title.svelte';

  // Each view answers one question: what I did this week, how much each muscle got, how I changed.
  let { view = 'week' }: { view?: 'week' | 'muscles' | 'measurements' } = $props();
  const TITLES = { week: 'This Week', muscles: 'Muscles', measurements: 'Measurements' };

  const model = $derived.by(() => {
    void appVersion.value;
    return analyticsModel(getState());
  });
  const EMPTY_WORKOUT = 'Finish a workout to see this.';
</script>

{#snippet values(rows: ValueRow[], fallback = '')}
  {#each rows as row (row.label)}
    <li class="list-block">
      <div class="list-link"><span>{row.label}</span><strong>{row.value}</strong></div>
    </li>
  {:else}
    {#if fallback}{@render note(fallback)}{/if}
  {/each}
{/snippet}

{#snippet measured(rows: MeasurementRow[])}
  {#each rows as row (row.label)}
    <li class="list-block">
      <div class="list-link analytics-note">
        <span>{row.label}</span><strong>{row.value}</strong><small>{row.note}</small>
      </div>
    </li>
  {/each}
{/snippet}

{#snippet note(text: string)}
  <li data-picker-skip class="list-block">
    <div class="list-link empty-state"><span>{text}</span></div>
  </li>
{/snippet}

<section aria-labelledby="analytics-title">
  <Title text={TITLES[view]} id="analytics-title" />
  <AppList label={TITLES[view]} rows={`${appVersion.value}${view}`}>
    {#if view === 'week'}
      {@render values(model.summary)}
      {#if model.sittingTip}
        {@render note('Break up sitting: walk during calls, errands or work breaks.')}
      {/if}
    {:else if view === 'muscles'}
      {@render note('Sets you did per muscle. Muscles worked by other lifts count part of a set.')}
      {@render values(model.effectiveSets, EMPTY_WORKOUT)}
    {:else}
      {#if model.measurementTrend}
        {@render measured(model.measurementTrend)}
      {:else}
        {@render note('No check-ins yet. Start with a baseline.')}
      {/if}
    {/if}
  </AppList>
  {#if view === 'measurements'}
    <a class="primary start-button" href="/history/?view=checkin">New check-in</a>
  {/if}
</section>
