<script lang="ts">
  import { act, appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import { measurementFields, measurementUnit, recordMeasurement } from '../health/health-data.ts';
  import { readableKey } from './history-format.ts';

  // A check-in starts from the last values, so only what changed needs typing.
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
  let saved = $state('');

  async function submit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(measurementFields.map((key) => [key, form.get(key)]));
    let recorded = false;
    await act(() => {
      recorded = recordMeasurement(getState(), values);
      return persist();
    });
    saved = recorded ? 'Saved. Your changes are above.' : 'Enter at least one measurement.';
  }
</script>

<form id="measurement-form" class="analytics-form" onsubmit={submit}>
  <h2 class="form-heading">New check-in</h2>
  {#each measurementFields as key (key)}
    <label class="analytics-field"
      ><span>{readableKey(key)} ({measurementUnit(key)})</span><input
        id={key}
        name={key}
        type="number"
        min="0"
        step="0.1"
        inputmode="decimal"
        value={last[key] ?? ''}
      /></label
    >
  {/each}
  <button class="primary" type="submit">Save check-in</button>
  <output class="notice" aria-live="polite" hidden={!saved}>{saved}</output>
</form>
