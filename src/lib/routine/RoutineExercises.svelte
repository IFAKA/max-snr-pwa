<script lang="ts">
  import type { ExerciseDefinition, RoutineItem } from '../types.ts';
  import { dayItems, isExerciseDefinition } from './routine-data.ts';
  import { memberLabel } from './routine-summary.ts';
  import { holdScroll } from '../browser/text-overflow.ts';
  import AppList from '../components/AppList.svelte';
  import ListHeading from '../components/ListHeading.svelte';
  import Title from '../components/Title.svelte';

  let { day }: { day: string } = $props();

  type Row =
    | {
        kind: 'group';
        key: string;
        label: string;
        superset: boolean;
        groupId: string;
        count: number;
      }
    | {
        kind: 'exercise';
        key: string;
        exercise: ExerciseDefinition;
        prefix: string;
        groupId?: string;
        memberIndex?: number;
      };

  function rowsFor(items: RoutineItem[]): Row[] {
    return items.flatMap((item, itemIndex): Row[] => {
      if (isExerciseDefinition(item))
        return [{ kind: 'exercise', key: `${itemIndex}-${item.id}`, exercise: item, prefix: '' }];
      const members = (item.type === 'superset' ? item.members : item.items).filter(
        isExerciseDefinition,
      );
      if (!members.length) return [];
      const superset = item.type === 'superset';
      return [
        {
          kind: 'group',
          key: `group-${itemIndex}`,
          label: item.label,
          superset,
          groupId: item.id,
          count: members.length,
        },
        ...members.map((exercise, index): Row => ({
          kind: 'exercise',
          key: `${itemIndex}-${index}-${exercise.id}`,
          exercise,
          prefix: superset ? `${memberLabel(index)} · ` : '',
          groupId: superset ? item.id : undefined,
          memberIndex: superset ? index : undefined,
        })),
      ];
    });
  }

  const rows = $derived(rowsFor(dayItems(day)));
</script>

<section aria-labelledby="exercise-title">
  <Title text="Exercises" id="exercise-title" />
  <AppList label="Exercises" rows={day}>
    {#each rows as row, index (row.key)}
      {#if row.kind === 'group'}
        <ListHeading
          text={row.label}
          id={`routine-group-title-${index}`}
          rowClass={row.superset
            ? 'routine-group-header routine-superset-header'
            : 'routine-group-header'}
          attributes={row.superset
            ? { 'data-group-type': 'superset', 'data-group-id': row.groupId }
            : {}}
        >
          {#snippet detail()}
            {#if row.superset}<small
                >Superset · {row.count} {row.count === 1 ? 'exercise' : 'exercises'}</small
              >{/if}
          {/snippet}
        </ListHeading>
      {:else}
        <li
          class={row.groupId ? 'routine-superset-member' : undefined}
          data-group-type={row.groupId ? 'superset' : undefined}
          data-group-id={row.groupId}
          data-member-index={row.memberIndex}
        >
          <div class="list-link">
            <span data-hold-scroll use:holdScroll
              ><span class="hold-scroll-text">{row.prefix}{row.exercise.name}</span></span
            >
            <span>{row.exercise.sets} × {row.exercise.reps}</span>
          </div>
        </li>
      {/if}
    {/each}
  </AppList>
</section>
