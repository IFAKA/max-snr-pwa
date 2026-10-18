<script lang="ts">
  import { act, refresh } from '../app-state.svelte.ts';
  import { getState, setState } from '../state.ts';
  import { migrate } from '../storage/migrate.ts';
  import { persist } from '../storage/persistence.ts';
  import { validateBackup } from '../storage/backup.ts';
  import type { AppState } from '../types.ts';
  import { appUpdate, checkForUpdate, UPDATE_ICONS } from '../browser/app-update.svelte.ts';
  import { cue } from '../browser/feedback.ts';
  import { nativeApp, saveFile } from '../browser/native-app.ts';
  import { setSoundEnabled, soundEnabled } from '../browser/sound.ts';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import Icon from '../components/Icon.svelte';
  import type { IconName } from '../components/icons.ts';
  import ListRow from '../components/ListRow.svelte';
  import SwitchRow from '../components/SwitchRow.svelte';

  // Sound, export, import, and app update rows. Shared by the History index and the Data view.
  let { onerror }: { onerror: (message: string) => void } = $props();

  let input: HTMLInputElement | undefined = $state();
  let pending: AppState | null = null;
  let confirmOpen = $state(false);
  let sound = $state(soundEnabled());

  function toggleSound(on: boolean) {
    sound = on;
    setSoundEnabled(on);
    if (on) cue('pick');
  }

  function exportBackup() {
    saveFile('maxsnr-backup.json', JSON.stringify(getState(), null, 2)).catch(() =>
      onerror('Could not save the backup.'),
    );
  }

  async function chooseFile(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      pending = validateBackup(JSON.parse(await file.text()));
      onerror('');
      confirmOpen = true;
    } catch (error) {
      onerror((error as Error).message || 'Invalid backup file.');
    } finally {
      if (input) input.value = '';
    }
  }

  async function handleConfirm(value: string) {
    const imported = pending;
    pending = null;
    if (value !== 'replace' || !imported) return;
    await act(async () => {
      setState(migrate(imported));
      await persist();
    });
    refresh();
  }
</script>

<SwitchRow label="Sound" id="sound-toggle" checked={sound} onchange={toggleSound} />
<ListRow
  label="Export"
  id="export"
  onclick={exportBackup}
  icon="download"
  iconLabel="Download backup"
/>
<li>
  <label class="list-link" for="import"
    ><span>Import</span><Icon name="upload" label="Import backup" /><input
      bind:this={input}
      id="import"
      type="file"
      accept="application/json,.json"
      onchange={chooseFile}
    /></label
  >
  <ConfirmDialog
    bind:open={confirmOpen}
    title="Replace app data?"
    body="Everything on this device will be replaced with the backup."
    actions={[
      { value: 'cancel', label: 'Keep Current Data', primary: true },
      { value: 'replace', label: 'Replace with Backup', destructive: true },
    ]}
    onclose={handleConfirm}
  />
</li>
<!-- The Android app updates by installing a new APK; only the web app updates itself. -->
{#if !nativeApp}
  <li>
    <button
      class="list-link app-update-button"
      id="update-app"
      type="button"
      data-update-state={appUpdate.status}
      aria-label={appUpdate.label}
      aria-busy={appUpdate.busy ? 'true' : undefined}
      disabled={appUpdate.busy || appUpdate.status === 'success'}
      onclick={() => void checkForUpdate()}
      ><span class="app-update-label">{appUpdate.label}</span><Icon
        name={UPDATE_ICONS[appUpdate.status] as IconName}
        label="Check for app updates"
      /></button
    >
  </li>
{/if}
