<script lang="ts">
  import { goto } from '$app/navigation';
  import { act } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { start } from '../workout/index.ts';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import ListRow from '../components/ListRow.svelte';

  // The Start row plus its native confirmation. Replacing a workout in progress needs an explicit
  // choice; keeping the current one is the default.
  let { day }: { day: string } = $props();

  let open = $state(false);
  let busy = $state(false);
  let replacing = $state(false);

  function request() {
    replacing = Boolean(getState().active);
    open = true;
  }

  async function handleClose(value: string) {
    if (value !== 'start') return;
    busy = true;
    const started = await act(() => start(day));
    if (started) await goto('/workout/');
    else busy = false;
  }
</script>

<ListRow
  label="Start"
  icon="chevron"
  iconLabel="Start workout"
  primary
  disabled={busy}
  onclick={request}
>
  {#snippet after()}
    <ConfirmDialog
      bind:open
      title={replacing ? 'Replace current workout?' : 'Start?'}
      body={replacing ? 'The workout in progress will be discarded.' : ''}
      actions={replacing
        ? [
            { value: 'cancel', label: 'Keep Current Workout', primary: true },
            { value: 'start', label: 'Start New Workout', destructive: true },
          ]
        : [
            { value: 'start', label: 'Start', primary: true },
            { value: 'cancel', label: 'Cancel' },
          ]}
      onclose={handleClose}
    />
  {/snippet}
</ListRow>
