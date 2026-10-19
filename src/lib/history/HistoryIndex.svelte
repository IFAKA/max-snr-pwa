<script lang="ts">
  import { appUpdate } from '../browser/app-update.svelte.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';
  import DataActions from './DataActions.svelte';

  // The index is only about the past; `data` is the Settings view (sound, backup, updates).
  let { data = false }: { data?: boolean } = $props();
  let importError = $state('');
</script>

<section aria-labelledby={data ? 'data-title' : 'history-title'}>
  <Title text={data ? 'Settings' : 'History'} id={data ? 'data-title' : 'history-title'} />
  <AppList label={data ? 'Settings' : 'History'} rows={data}>
    {#if !data}
      <ListRow
        label="Workouts"
        href="/history/?view=workouts"
        icon="chevron"
        iconLabel="Open workouts"
      />
      <ListRow
        label="Activities"
        href="/history/?view=activities"
        icon="chevron"
        iconLabel="Open activities"
      />
      <ListRow
        label="This Week"
        href="/history/?view=analytics"
        icon="chevron"
        iconLabel="Open this week"
      />
      <ListRow
        label="Settings"
        href="/history/?view=data"
        icon="chevron"
        iconLabel="Open settings"
      />
    {:else}
      <DataActions onerror={(message) => (importError = message)} />
    {/if}
  </AppList>
  <output id="data-status" class="notice error" aria-live="polite" hidden={!importError}
    >{importError}</output
  >
  <p
    id="app-update-status"
    class="app-update-status sr-only"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    {appUpdate.message}
  </p>
  {#if data}
    <p class="build-label">Version {__BUILD_ID__}</p>
  {/if}
</section>
