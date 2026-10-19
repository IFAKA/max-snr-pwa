<script lang="ts">
  import { page } from '$app/state';
  import { configuredDays } from '#lib/routine/routine-data.ts';
  import RoutineDay from '#lib/routine/RoutineDay.svelte';
  import RoutineDays from '#lib/routine/RoutineDays.svelte';

  const day = $derived(page.url.searchParams.get('day'));
  const known = $derived(Boolean(day && configuredDays().includes(day)));
</script>

{#if day && known}
  <RoutineDay {day} />
{:else}
  <RoutineDays />
{/if}
