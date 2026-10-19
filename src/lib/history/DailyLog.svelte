<script lang="ts">
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import ValueStepper, { type Step } from './ValueStepper.svelte';

  // Three questions about today; each one is skippable. Movement and sitting feed the suggestions.
  const steps: Step[] = [
    { id: 'movement', label: 'Movement today', unit: 'min', start: 30, min: 0, max: 300, step: 5 },
    { id: 'cardio', label: 'Cardio today', unit: 'min', start: 20, min: 0, max: 300, step: 5 },
    { id: 'sitting', label: 'Sitting today', unit: 'hours', start: 6, min: 0, max: 18, step: 0.5 },
  ];

  async function save(values: Record<string, number>) {
    const { health } = getState();
    const date = new Date().toISOString();
    if (values.movement !== undefined)
      health.movementMinutes.push({ date, minutes: values.movement });
    if (values.cardio !== undefined)
      health.cardioMinutes.push({ date, minutes: values.cardio, intensity: 'moderate' });
    if (values.sitting !== undefined)
      health.sedentary.logs.push({
        date,
        hours: values.sitting,
        longestUninterruptedMinutes: 0,
        interruptions: 0,
      });
    await persist();
    return true;
  }
</script>

<ValueStepper {steps} onsave={save} doneHref="/history/" empty="Pick at least one value." />
