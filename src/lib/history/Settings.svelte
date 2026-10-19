<script lang="ts">
  import { appUpdate } from '../browser/app-update.svelte.ts';
  import AppList from '../components/AppList.svelte';
  import Title from '../components/Title.svelte';
  import DataActions from './DataActions.svelte';

  // Sound, backup and updates. Reached from Today; the URL stays under /history/ for old links.
  let importError = $state('');
</script>

<section aria-labelledby="data-title">
  <Title text="Settings" id="data-title" />
  <AppList label="Settings" rows>
    <DataActions onerror={(message) => (importError = message)} />
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
  <p class="build-label">Version {__BUILD_ID__}</p>
</section>
