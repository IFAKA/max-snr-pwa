<script lang="ts">
  import type { Workout } from '../types.ts';
  import { act } from '../app-state.svelte.ts';
  import { goUp } from '../browser/navigation.ts';
  import { correctExercise, correctionChoices } from '../workout/index.ts';
  import AppList from '../components/AppList.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';

  // Pick the exercise that was really done for the sets saved under another one. The sets keep
  // their reps, loads and efforts; only the exercise changes, so analytics stay honest.
  let { workout, index, from }: { workout: Workout; index: number; from: string } = $props();

  const current = $derived(
    (workout.tasks || []).find((task) => task.exerciseId === from)?.performedName || 'Exercise',
  );
  const choices = $derived(correctionChoices().filter((choice) => choice.id !== from));
  let chosen = $state<{ id: string; name: string } | null>(null);
  let confirmOpen = $state(false);

  async function handleConfirm(value: string) {
    const choice = chosen;
    chosen = null;
    if (value !== 'change' || !choice) return;
    const changed = await act(() => correctExercise(workout.id, from, choice.id));
    if (changed) await goUp(`/history/?view=workout&id=${index}`);
  }
</script>

<section aria-labelledby="fix-title">
  <Title text="Done instead" id="fix-title" />
  <AppList label={`Exercises to replace ${current}`} rows={`${workout.id}-${from}`}>
    {#each choices as choice (choice.id)}
      <ListRow
        label={choice.name}
        scroll
        onclick={() => {
          chosen = choice;
          confirmOpen = true;
        }}
      />
    {/each}
  </AppList>
  <ConfirmDialog
    bind:open={confirmOpen}
    title={`Change to ${chosen?.name ?? ''}?`}
    body={`The sets saved as ${current} become ${chosen?.name ?? ''}, with the same reps and loads. Your analytics update.`}
    actions={[
      { value: 'cancel', label: 'Keep As Saved', primary: true },
      { value: 'change', label: 'Change Exercise', destructive: true },
    ]}
    onclose={handleConfirm}
  />
</section>
