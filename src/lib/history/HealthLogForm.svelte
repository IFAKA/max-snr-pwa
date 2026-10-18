<script lang="ts">
  import { act } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import { measurementFields, recordMeasurement } from '../health/health-data.ts';
  import { readableKey } from './history-format.ts';

  const now = () => new Date().toISOString();

  const NUMBER_FIELDS: Array<{ id: string; label: string; step?: string }> = [
    { id: 'movement', label: 'Light/general movement minutes' },
    { id: 'cardio', label: 'Cardio minutes' },
  ];
  const SITTING_FIELDS: Array<{ id: string; label: string; step?: string }> = [
    { id: 'sedentaryHours', label: 'Approximate sitting hours/day' },
    { id: 'longestSit', label: 'Longest uninterrupted sitting period (optional)', step: '1' },
    { id: 'interruptions', label: 'Movement interruptions today', step: '1' },
  ];

  function save(form: FormData) {
    const state = getState();
    const movement = form.get('movement');
    if (movement) state.health.movementMinutes.push({ date: now(), minutes: Number(movement) });
    const cardio = form.get('cardio');
    if (cardio)
      state.health.cardioMinutes.push({
        date: now(),
        minutes: Number(cardio),
        intensity: String(form.get('intensity') || 'moderate'),
      });
    recordMeasurement(
      state,
      Object.fromEntries(measurementFields.map((key) => [key, form.get(key)])),
    );
    state.health.sedentary.logs.push({
      date: now(),
      hours: Number(form.get('sedentaryHours') || state.health.sedentary.profileHoursPerDay),
      longestUninterruptedMinutes: Number(form.get('longestSit') || 0),
      interruptions: Number(form.get('interruptions') || 0),
    });
    state.health.sedentary.reminders = {
      enabled: form.get('reminders') === 'on',
      intervalMinutes: Number(form.get('reminderInterval') || 45),
    };
    return persist();
  }

  async function submit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const form = event.currentTarget;
    await act(() => save(new FormData(form)));
    form.reset();
  }
</script>

{#snippet field(id: string, label: string, step = '0.1')}
  <label class="analytics-field"
    ><span>{label}</span><input
      {id}
      name={id}
      type="number"
      min="0"
      {step}
      inputmode="decimal"
    /></label
  >
{/snippet}

<details class="analytics-details">
  <summary>Log Health Data</summary>
  <form id="activity-form" class="analytics-form" onsubmit={submit}>
    {#each NUMBER_FIELDS as item (item.id)}{@render field(item.id, item.label, item.step)}{/each}
    <label class="analytics-field"
      ><span>Cardio intensity</span><select id="intensity" name="intensity"
        ><option value="moderate">Moderate</option><option value="vigorous">Vigorous</option
        ></select
      ></label
    >
    {#each SITTING_FIELDS as item (item.id)}{@render field(item.id, item.label, item.step)}{/each}
    {#each measurementFields as key (key)}{@render field(key, readableKey(key))}{/each}
    <label class="analytics-field"
      ><span><input name="reminders" type="checkbox" /> Enable movement reminder</span></label
    >
    {@render field(
      'reminderInterval',
      'Reminder interval (behavioral choice, not a proven threshold)',
      '1',
    )}
    <button class="primary" type="submit">Save log</button>
  </form>
</details>
