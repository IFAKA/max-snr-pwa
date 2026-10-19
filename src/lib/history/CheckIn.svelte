<script lang="ts">
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import { measurementFields, measurementUnit, recordMeasurement } from '../health/health-data.ts';
  import { readableKey } from './history-format.ts';
  import ValueStepper, { type Step } from './ValueStepper.svelte';

  // Where each wheel opens the first time; later check-ins start from the last value.
  const START: Record<string, number> = {
    waist: 80,
    arms: 35,
    shoulders: 110,
    chest: 100,
    weight: 75,
    forearms: 28,
    thighs: 55,
    calves: 38,
  };
  const entries = getState().health.measurements;
  const steps: Step[] = measurementFields.map((key) => {
    const last = entries.findLast((entry) => entry[key] !== undefined)?.[key];
    return {
      id: key,
      label: readableKey(key),
      unit: measurementUnit(key),
      start: START[key] ?? 50,
      min: key === 'weight' ? 30 : 10,
      max: key === 'weight' ? 250 : 200,
      step: 0.5,
      last: last === undefined ? undefined : Number(last),
    };
  });

  async function save(values: Record<string, number>) {
    if (!recordMeasurement(getState(), values)) return false;
    await persist();
    return true;
  }
</script>

<ValueStepper
  {steps}
  onsave={save}
  doneHref="/history/?view=measurements"
  empty="Pick at least one measurement."
/>
