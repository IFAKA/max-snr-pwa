<script lang="ts">
  import { appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { analyticsModel, type NoteRow, type ValueRow } from './analytics-model.ts';
  import AppList from '../components/AppList.svelte';
  import ListLabel from '../components/ListLabel.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import HealthLogForm from './HealthLogForm.svelte';

  // This Week answers one question; `insights` is the Details view with the numbers behind the plan.
  let { insights = false }: { insights?: boolean } = $props();

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

{#snippet notes(rows: NoteRow[])}
  {#each rows as row, index (index)}
    <li class="list-block">
      <div class="list-link analytics-note"><span>{row.label}</span><small>{row.note}</small></div>
    </li>
  {/each}
{/snippet}

{#snippet heading(text: string)}
  <ListLabel {text} />
{/snippet}

{#snippet note(text: string)}
  <li data-picker-skip class="list-block">
    <div class="list-link empty-state"><span>{text}</span></div>
  </li>
{/snippet}

<!-- One question, "what did I do this week?". The plan, measurements, model internals and the
     health log live one tap away in Details so they never crowd the answer. -->
<section aria-labelledby="analytics-title">
  <Title text={insights ? 'Details' : 'This Week'} id="analytics-title" />
  <AppList label={insights ? 'Details' : 'This week'} rows={`${appVersion.value}${insights}`}>
    {#if !insights}
      {@render values(model.summary)}
      {#if model.sittingTip}
        {@render note('Break up sitting: walk during calls, errands or work breaks.')}
      {/if}
      <ListRow
        label="Details"
        href="/history/?view=insights"
        icon="chevron"
        iconLabel="Open details"
      />
    {:else}
      {@render heading('Sets per Muscle')}
      {@render values(model.effectiveSets, EMPTY_WORKOUT)}
      {@render heading('Plan')}
      {@render values([{ label: 'Schedule', value: model.plan.schedule }])}
      {#if model.plan.note}{@render note(model.plan.note)}{/if}
      {@render notes(model.planChanges)}
      {@render heading('Measurements')}
      {#if model.measurementTrend}
        {@render values(model.measurementTrend)}
      {:else}
        {@render note('Log two check-ins to see how they change.')}
      {/if}
      <li data-picker-skip class="list-block">
        <details class="analytics-details">
          <summary>Direct and Indirect Sets</summary>
          <p class="routine-summary">
            Sets per muscle count each direct set as one and add part of a set for muscles a lift
            also works.
          </p>
          <h3>Direct</h3>
          <ul class="analytics-rows">{@render values(model.directSets, EMPTY_WORKOUT)}</ul>
          <h3>Indirect</h3>
          <ul class="analytics-rows">{@render values(model.fractionalSets, EMPTY_WORKOUT)}</ul>
        </details>
      </li>
      <li data-picker-skip class="list-block">
        <details class="analytics-details">
          <summary>How the Plan Is Chosen</summary>
          <p class="routine-summary">
            Raw model units per modeled minute. Values are ordinal heuristics, not biological
            measurements.
          </p>
          <ul class="analytics-rows">
            {@render values([{ label: 'Session length', value: model.timing }])}
          </ul>
          <h3>Value per Set</h3>
          <ul class="analytics-rows">{@render notes(model.marginal)}</ul>
          <h3>Allocation Decisions</h3>
          <ul class="analytics-rows">{@render notes(model.decisions)}</ul>
          <h3>Next-Set Candidates</h3>
          <ul class="analytics-rows">{@render notes(model.candidates)}</ul>
          <h3>Days per Week</h3>
          <p class="routine-summary">{model.frequencyNote}</p>
          <ul class="analytics-rows">{@render values(model.frequencies)}</ul>
        </details>
      </li>
      <li data-picker-skip class="list-block"><HealthLogForm /></li>
    {/if}
  </AppList>
</section>
