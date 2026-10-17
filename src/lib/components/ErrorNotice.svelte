<script lang="ts">
  import { appError } from '../app-state.svelte.ts';
</script>

{#if appError.message}
  <p id="app-error" class="notice error" role="alert">{appError.message}</p>
{/if}
