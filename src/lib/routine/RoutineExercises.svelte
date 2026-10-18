<script lang="ts">
  import type { ExerciseDefinition, RoutineItem } from '../types.ts';
  import { dayItems, isExerciseDefinition } from './routine-data.ts';
  import { holdScroll } from '../browser/text-overflow.ts';
  import AppList from '../components/AppList.svelte';
  import ListHeading from '../components/ListHeading.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import { supersetRowClass } from '../components/superset-group.ts';

  let { day }: { day: string } = $props();

  // Equipment blocks keep a heading; a superset is drawn like the in-workout exercise list, as one
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

<section aria-labelledby="exercise-title">
  <Title text="Exercises" id="exercise-title" />
  <AppList label="Exercises" rows={day}>
    {#each rows as row, index (row.key)}
      {#if row.kind === 'group'}
        <ListHeading text={row.label} id={`routine-group-title-${index}`} />
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
  </AppList>
</section>
