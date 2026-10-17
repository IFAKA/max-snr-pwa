<script lang="ts">
  import { act } from '../app-state.svelte.ts';
  import type { ActiveWorkout, Task } from '../types.ts';
  import {
    deferCurrent,
    exerciseSelectionLocked,
    selectExercise,
    substituteCurrent,
  } from '../workout/index.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import SupersetMeta from './SupersetMeta.svelte';
  import { holdScroll } from '../browser/text-overflow.ts';

  // Change the current exercise: pick another, skip this one for now, or switch to an alternative.
  let { active, onselected }: { active: ActiveWorkout; onselected: () => void } = $props();

  // One row per exercise, in workout order, keyed by its first set.
  const items = $derived(
    active.tasks
      .filter(
        (task, index, tasks) =>
          tasks.findIndex((candidate) => candidate.exerciseId === task.exerciseId) === index,
      )
      .map((task) => ({
        task,
        complete: active.tasks
          .filter((candidate) => candidate.exerciseId === task.exerciseId)
          .every((candidate) => candidate.completed || candidate.skipped),
      })),
  );
  const currentExerciseId = $derived(
    active.phase === 'lifting' ? active.tasks[active.pos]?.exerciseId : null,
  );
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
    ><span class="hold-scroll-text">{task.performedName}</span><SupersetMeta
      {active}
      {task}
    /></span
  >
{/snippet}

<section class="workout-picker" aria-labelledby="exercise-picker-title">
  <Title text="Exercise" id="exercise-picker-title" level="h2" />
  <AppList label="Available exercises" rows={`${active.pos}-${items.length}-${locked}`}>
    {#each items as { task, complete } (task.exerciseId)}
      {#if complete}
        <ListRow rowClass="complete-row" status icon="check" iconLabel="Done">
          {#snippet content()}{@render name(task)}{/snippet}
        </ListRow>
      {:else}
        <ListRow
          icon="chevron"
          iconLabel="Select exercise"
          disabled={locked || busy}
          onclick={() => run(() => selectExercise(task.exerciseId))}
        >
          {#snippet content()}{@render name(task)}{/snippet}
        </ListRow>
        {#if task.exerciseId === currentExerciseId}
          <ListRow
            label="Skip for Now"
            icon="dash"
            iconLabel="Move to the end of the workout"
            disabled={busy}
            onclick={() => run(deferCurrent)}
          />
          {#each task.alternatives || [] as alternative (alternative)}
            <ListRow
              label={`Switch to ${alternative}`}
              icon="chevron"
              iconLabel="Switch exercise"
              disabled={busy}
              onclick={() => run(() => substituteCurrent(alternative))}
            />
          {/each}
        {/if}
      {/if}
    {/each}
  </AppList>
</section>
