<script lang="ts">
  import { untrack } from 'svelte';
  import { showError } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { persist } from '../storage/persistence.ts';
  import type { ActiveWorkout, Task } from '../types.ts';
  import { cue } from '../browser/feedback.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import { formatLoad, liftingModel, pickerValues, type SetField } from './lifting-model.ts';

  // A full-screen list of one set value, opened from the lifting step. It starts centred on the
  // current value, so a flick (or the Crown) and one tap picks a new one and returns.
  let {
    active,
    task,
    field,
    onpicked,
  }: { active: ActiveWorkout; task: Task; field: SetField; onpicked: () => void } = $props();

  const unit = getState().settings?.unit || 'kg';
  const TITLES: Record<SetField, string> = { reps: 'Reps', weight: `Load · ${unit}`, rir: 'RIR' };
  // The dispatcher re-mounts this screen per field. A new exercise has no load yet: it shows as 0.
  const current = untrack(() => {
    const start = liftingModel(active, task, unit)[field];
    return field === 'weight' ? formatLoad(Number(start || 0)) : start;
  });
  const values = untrack(() => pickerValues(field, current));
  const target = untrack(() => (field === 'reps' ? String(task.targetRepRange || task.reps) : ''));
  let busy = $state(false);

  const inTarget = (value: string) => {
    if (!target) return false;
    const [low, high] = target.split(/[–-]/).map(Number);
    return Number(value) >= low && Number(value) <= (high || low);
  };

  async function choose(value: string) {
    if (busy) return;
    busy = true;
    cue('pick');
    // The lifting step re-mounts on return and reads the draft, so no re-render is needed here.
    active.draft = { ...active.draft, [field]: value };
    await persist().catch(showError);
    onpicked();
  }

  function centre(section: HTMLElement) {
    const row = section.querySelector<HTMLElement>('.is-current .list-link');
    row?.scrollIntoView({ block: 'center' });
    row?.focus({ preventScroll: true });
  }
</script>

<section class="workout-picker value-picker" aria-labelledby="value-picker-title" use:centre>
  <Title text={TITLES[field]} id="value-picker-title" />
  <AppList label={TITLES[field]} rows={`${field}-${values.length}`}>
    {#each values as value (value)}
      <ListRow
        rowClass={value === current ? 'is-current' : ''}
        label={field === 'weight' ? `${value} ${unit}` : value}
        icon={value === current ? 'check' : undefined}
        iconLabel="Current"
        disabled={busy}
        onclick={() => choose(value)}
      >
        {#snippet trailing()}{#if inTarget(value)}<small>Target</small>{/if}{/snippet}
      </ListRow>
    {/each}
  </AppList>
</section>
