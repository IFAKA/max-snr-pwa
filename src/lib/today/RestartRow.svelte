<script lang="ts">
  import { goto } from '$app/navigation';
  import { cue } from '../browser/feedback.ts';
  import { act } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { RESTART_PLANS, start, type RestartKind } from '../workout/index.ts';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import ListRow from '../components/ListRow.svelte';

  // A restart needs no input or setup: it starts at once. Only replacing a workout in progress
  // asks first, and keeping the current one is the default.
  let { kind, label }: { kind: RestartKind; label: string } = $props();

  let open = $state(false);
  let busy = $state(false);

  async function begin() {
    busy = true;
    const started = await act(() => start(RESTART_PLANS[kind].day));
    if (started) {
      cue('started');
      await goto('/workout/');
    } else busy = false;
  }

  function request() {
    if (getState().active) open = true;
    else void begin();
  }

  function handleClose(value: string) {
    if (value === 'start') void begin();
  }
</script>

<ListRow {label} icon="chevron" iconLabel={`Start ${label}`} disabled={busy} onclick={request}>
  {#snippet after()}
    <ConfirmDialog
      bind:open
      title="Replace current workout?"
      body="The workout in progress will be discarded."
      actions={[
        { value: 'cancel', label: 'Keep Current Workout', primary: true },
        { value: 'start', label: 'Start Short Workout', destructive: true },
      ]}
      onclose={handleClose}
    />
  {/snippet}
</ListRow>
