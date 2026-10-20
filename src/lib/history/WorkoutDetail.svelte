<script lang="ts">
  import type { Workout } from '../types.ts';
  import { act } from '../app-state.svelte.ts';
  import { goUp } from '../browser/navigation.ts';
  import { deleteWorkout } from '../workout/index.ts';
  import { exerciseGroups } from './history-format.ts';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import ListRow from '../components/ListRow.svelte';
  import AppList from '../components/AppList.svelte';
  import ListHeading from '../components/ListHeading.svelte';
  import Title from '../components/Title.svelte';

  let { workout, index }: { workout: Workout; index: number } = $props();
  const groups = $derived(exerciseGroups(workout));
  let confirmOpen = $state(false);

  async function handleConfirm(value: string) {
    if (value !== 'delete') return;
    const deleted = await act(() => deleteWorkout(workout.id));
    if (deleted) await goUp('/history/');
  }
</script>

<section aria-labelledby="workout-title">
  <Title text={workout.name || 'Workout'} id="workout-title" />
  <div class="history-detail">
    <AppList label="Workout sets" rows={workout.id}>
      {#each groups as group, groupIndex (group.name)}
        <ListHeading text={group.name} id={`history-exercise-title-${groupIndex}`} />
        {#each group.lines as line, lineIndex (lineIndex)}
          <li><div class="list-link"><span class="history-set-label">{line}</span></div></li>
        {/each}
        <ListRow
          label="Did a different exercise?"
          href={`/history/?view=workout&id=${index}&fix=${encodeURIComponent(group.exerciseId)}`}
          icon="chevron"
        />
      {/each}
    </AppList>
    <AppList label="Workout actions">
      <ListRow label="Delete Workout" icon="chevron" onclick={() => (confirmOpen = true)}>
        {#snippet after()}
          <ConfirmDialog
            bind:open={confirmOpen}
            title="Delete this workout?"
            body="It is removed from History and from your progress. This cannot be undone."
            actions={[
              { value: 'cancel', label: 'Keep Workout', primary: true },
              { value: 'delete', label: 'Delete Workout', destructive: true },
            ]}
            onclose={handleConfirm}
          />
        {/snippet}
      </ListRow>
    </AppList>
  </div>
</section>
