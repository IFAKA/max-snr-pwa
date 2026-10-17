<script lang="ts">
  import { appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { analyticsModel, type NoteRow, type ValueRow } from './analytics-model.ts';
  import AppList from '../components/AppList.svelte';
  import Title from '../components/Title.svelte';
  import HealthLogForm from './HealthLogForm.svelte';

  const model = $derived.by(() => {
    void appVersion.value;
    return analyticsModel(getState());
  });
  const EMPTY_WORKOUT = 'Complete a workout to populate this.';
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

{#snippet notes(rows: NoteRow[])}
  {#each rows as row, index (index)}
    <li class="list-block">
      <div class="list-link"><span>{row.label}</span><small>{row.note}</small></div>
    </li>
  {/each}
{/snippet}

{#snippet heading(text: string)}
  <li data-picker-skip class="list-block"><h2 class="list-link list-title">{text}</h2></li>
{/snippet}

{#snippet note(text: string)}
  <li data-picker-skip class="list-block">
    <div class="list-link empty-state"><span>{text}</span></div>
  </li>
{/snippet}

<section aria-labelledby="analytics-title">
  <Title text="Workout analytics" id="analytics-title" />
  <AppList label="Workout analytics" rows={appVersion.value}>
    {@render values(model.summary)}
    {@render heading('Sedentary Behavior')}
    {@render note(model.sedentaryNote)}
    {@render heading('Measurement Trend')}
    {#if model.measurementTrend}
      {@render values(model.measurementTrend)}
    {:else}
      {@render note('Log two measurements to see rolling trends.')}
    {/if}
    {@render heading('Direct Sets by Muscle')}
    {@render values(model.directSets, EMPTY_WORKOUT)}
    {@render heading('Fractional Indirect Sets by Muscle')}
    {@render values(model.fractionalSets, EMPTY_WORKOUT)}
    {@render heading('Effective Sets by Muscle')}
    {@render values(model.effectiveSets, EMPTY_WORKOUT)}
    {@render heading('Optimizer Recommendations')}
    {@render notes(model.recommendations)}
    <li data-picker-skip class="list-block">
      <details class="analytics-details">
        <summary>Marginal Utility per Individual Set</summary>
        <p class="routine-summary">
          Raw model units per modeled minute. Values are ordinal heuristics, not biological
          measurements.
        </p>
        <ul class="analytics-rows">{@render notes(model.marginal)}</ul>
        <h3>Allocation Decisions</h3>
        <ul class="analytics-rows">{@render notes(model.decisions)}</ul>
        <h3>Next-Set Candidates</h3>
        <ul class="analytics-rows">{@render notes(model.candidates)}</ul>
      </details>
    </li>
    <li data-picker-skip class="list-block">
      <details class="analytics-details">
        <summary>Frequency Sensitivity</summary>
        <p class="routine-summary">{model.frequencyNote}</p>
        <ul class="analytics-rows">{@render values(model.frequencies)}</ul>
      </details>
    </li>
    <li data-picker-skip class="list-block"><HealthLogForm /></li>
  </AppList>
</section>
