<script lang="ts">
  import { act } from '../app-state.svelte.ts';
  import type { ActiveWorkout, Task } from '../types.ts';
  import { exerciseSelectionLocked, selectExercise, substituteCurrent } from '../workout/index.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import { holdScroll } from '../browser/text-overflow.ts';

  // Change the current exercise: pick another or switch to an alternative.
  let { active, onselected }: { active: ActiveWorkout; onselected: () => void } = $props();

  type Row =
    | { kind: 'exercise'; key: string; task: Task; complete: boolean; group: string | null }
    | { kind: 'switch'; key: string; alternative: string; group: string | null };

  const supersetOf = (task: Task) => (task.groupType === 'superset' && task.groupId) || null;
  const currentExerciseId = $derived(
    active.phase === 'lifting' ? active.tasks[active.pos]?.exerciseId : null,
  );

  // One row per exercise, in workout order, keyed by its first set; the current exercise is followed
  // by its Switch rows, which belong to its superset.
  const rows = $derived(
    active.tasks
      .filter(
        (task, index, tasks) =>
          tasks.findIndex((candidate) => candidate.exerciseId === task.exerciseId) === index,
      )
      .flatMap((task): Row[] => {
        const group = supersetOf(task);
        const complete = active.tasks
          .filter((candidate) => candidate.exerciseId === task.exerciseId)
          .every((candidate) => candidate.completed || candidate.skipped);
        const row: Row = { kind: 'exercise', key: task.exerciseId, task, complete, group };
        if (complete || task.exerciseId !== currentExerciseId) return [row];
        return [
          row,
          ...(task.alternatives || []).map((alternative): Row => ({
            kind: 'switch',
            key: `switch-${alternative}`,
            alternative,
            group,
          })),
        ];
      }),
  );

  // Superset members share one accent bar down the left edge instead of a label on every row;
  // `superset-start` and `superset-end` cap the bar where the group begins and ends.
  function groupClass(index: number) {
    const group = rows[index].group;
    if (!group) return '';
    return [
      'superset-member',
      rows[index - 1]?.group !== group && 'superset-start',
      rows[index + 1]?.group !== group && 'superset-end',
    ]
      .filter(Boolean)
      .join(' ');
  }

  const locked = $derived(exerciseSelectionLocked(active));
  let busy = $state(false);

  async function run(action: () => Promise<unknown>) {
    busy = true;
    const result = await act(action);
    busy = false;
    if (result !== false) onselected();
  }
</script>

{#snippet name(task: Task)}
  <span data-hold-scroll use:holdScroll
    ><span class="hold-scroll-text">{task.performedName}</span>{#if supersetOf(task)}<span
        class="sr-only">, superset</span
      >{/if}</span
  >
{/snippet}

<section class="workout-picker" aria-labelledby="exercise-picker-title">
  <Title text="Exercise" id="exercise-picker-title" level="h2" />
  <AppList label="Available exercises" rows={`${active.pos}-${rows.length}-${locked}`}>
    {#each rows as row, index (row.key)}
      {@const grouped = groupClass(index)}
      {#if row.kind === 'switch'}
        <ListRow
          rowClass={grouped}
          label={`Switch to ${row.alternative}`}
          icon="chevron"
          iconLabel="Switch exercise"
          disabled={busy}
          onclick={() => run(() => substituteCurrent(row.alternative))}
        />
      {:else if row.complete}
        <ListRow rowClass={`complete-row ${grouped}`.trim()} status icon="check" iconLabel="Done">
          {#snippet content()}{@render name(row.task)}{/snippet}
        </ListRow>
      {:else if row.task.exerciseId === currentExerciseId}
        <!-- The exercise in progress: shown in place, but there is nothing to select. -->
        <ListRow rowClass={grouped} disabled>
          {#snippet content()}{@render name(row.task)}<span class="sr-only">, current exercise</span
            >{/snippet}
        </ListRow>
      {:else}
        <ListRow
          rowClass={grouped}
          icon="chevron"
          iconLabel="Select exercise"
          disabled={locked || busy}
          onclick={() => run(() => selectExercise(row.task.exerciseId))}
        >
          {#snippet content()}{@render name(row.task)}{/snippet}
        </ListRow>
      {/if}
    {/each}
  </AppList>
</section>
