<script lang="ts">
  import type { ExerciseDefinition, RoutineItem } from '../types.ts';
  import { dayItems, isExerciseDefinition } from './routine-data.ts';
  import { holdScroll } from '../browser/text-overflow.ts';
  import ListLabel from '../components/ListLabel.svelte';
  import ListRow from '../components/ListRow.svelte';
  import { supersetRowClass } from '../components/superset-group.ts';

  let { day }: { day: string } = $props();

  // Rows only: the day screen supplies the list. Equipment blocks keep a heading; a superset is drawn like the in-workout exercise list, as one
  // accent bar down its members (`supersetRowClass`), so both lists read the same.
  type Row =
    | { kind: 'group'; key: string; label: string; group: null }
    | { kind: 'exercise'; key: string; exercise: ExerciseDefinition; group: string | null };

  function rowsFor(items: RoutineItem[]): Row[] {
    return items.flatMap((item, itemIndex): Row[] => {
      if (isExerciseDefinition(item))
        return [{ kind: 'exercise', key: `${itemIndex}-${item.id}`, exercise: item, group: null }];
      const members = (item.type === 'superset' ? item.members : item.items).filter(
        isExerciseDefinition,
      );
      if (!members.length) return [];
      const superset = item.type === 'superset';
      const exercises = members.map((exercise, index): Row => ({
        kind: 'exercise',
        key: `${itemIndex}-${index}-${exercise.id}`,
        exercise,
        group: superset ? item.id : null,
      }));
      if (superset) return exercises;
      return [
        { kind: 'group', key: `group-${itemIndex}`, label: item.label, group: null },
        ...exercises,
      ];
    });
  }

  const rows = $derived(rowsFor(dayItems(day)));
  const groups = $derived(rows.map((row) => row.group));
</script>

{#each rows as row, index (row.key)}
  {#if row.kind === 'group'}
    <ListLabel text={row.label} />
  {:else}
    <ListRow rowClass={supersetRowClass(groups, index)}>
      {#snippet content()}
        <span data-hold-scroll use:holdScroll
          ><span class="hold-scroll-text">{row.exercise.name}</span>{#if row.group}<span
              class="sr-only">, superset</span
            >{/if}</span
        >
      {/snippet}
      {#snippet trailing()}<span>{row.exercise.sets} × {row.exercise.reps}</span>{/snippet}
    </ListRow>
  {/if}
{/each}
