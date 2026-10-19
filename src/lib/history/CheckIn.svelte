<script lang="ts">
  import { goto } from '$app/navigation';
  import { act, appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import { measurementFields, measurementUnit, recordMeasurement } from '../health/health-data.ts';
  import Title from '../components/Title.svelte';
  import { readableKey } from './history-format.ts';

  // Three fields by default; the rest are one tap away. Each starts at the last value, so only
  // what changed needs typing, and saving returns to the changes.
  const MAIN = measurementFields.filter((key) => ['waist', 'arms', 'weight'].includes(key));
  const MORE = measurementFields.filter((key) => !MAIN.includes(key));
  const last = $derived.by(() => {
    void appVersion.value;
    const entries = getState().health.measurements;
    return Object.fromEntries(
      measurementFields.map((key) => [
        key,
        entries.findLast((entry) => entry[key] !== undefined)?.[key],
      ]),
    );
  });
  let error = $state('');

  async function submit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(measurementFields.map((key) => [key, form.get(key)]));
    let recorded = false;
    await act(() => {
      recorded = recordMeasurement(getState(), values);
      return persist();
    });
    if (recorded) await goto('/history/?view=measurements', { replace: true });
    else error = 'Enter at least one measurement.';
  }
</script>

{#snippet row(key: string)}
  <label class="field-row"
    ><span>{readableKey(key)}</span><span class="field-input"
      ><input
        name={key}
        type="number"
        min="0"
        step="0.1"
        inputmode="decimal"
        value={last[key] ?? ''}
      /><small>{measurementUnit(key)}</small></span
    ></label
  >
{/snippet}

<section aria-labelledby="checkin-title">
  <Title text="New check-in" id="checkin-title" />
  <form class="checkin-form" onsubmit={submit}>
    {#each MAIN as key (key)}{@render row(key)}{/each}
    <details class="analytics-details">
      <summary>More measurements</summary>
      {#each MORE as key (key)}{@render row(key)}{/each}
    </details>
    <details class="analytics-details">
      <summary>How to measure</summary>
      <p class="routine-summary">
        Relaxed, at the same time of day and on the same spot each time. Skip anything you don't
        want to track.
      </p>
    </details>
    <output class="notice error" aria-live="polite" hidden={!error}>{error}</output>
    <button class="primary start-button" type="submit">Save</button>
  </form>
</section>
