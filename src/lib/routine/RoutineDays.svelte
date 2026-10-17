<script lang="ts">
  import { appVersion } from '../app-state.svelte.ts';
  import { getState } from '../state.ts';
  import { configuredDays, isWorkoutDay } from './routine-data.ts';
  import { dayNow, isCurrentDayComplete } from '../workout/index.ts';
  import { weeklySummary } from './routine-summary.ts';
  import { holdScroll } from '../browser/text-overflow.ts';
  import AppList from '../components/AppList.svelte';
  import ListRow from '../components/ListRow.svelte';
  import Title from '../components/Title.svelte';

  const view = $derived.by(() => {
    void appVersion.value;
    const state = getState();
    const today = dayNow();
    return {
      summary: weeklySummary(state),
      days: configuredDays().map((day) => ({
        day,
        today: day === today,
        workout: isWorkoutDay(day),
        complete: isCurrentDayComplete(state.history, day),
      })),
    };
  });
</script>

<section aria-labelledby="routine-title">
  <Title text="Routine" id="routine-title" />
  <p class="routine-summary">{view.summary}</p>
  <AppList
    label="Routine days"
    rows={view.days.map((item) => `${item.day}${item.complete}`).join()}
  >
    {#each view.days as item (item.day)}
      {#if item.workout && !item.complete}
        <ListRow
          href={`/routine/?day=${encodeURIComponent(item.day)}`}
          rowClass={item.today ? 'today' : ''}
          icon="chevron"
          iconLabel="Open day"
        >
          {#snippet content()}
            <span class="day-label" data-hold-scroll use:holdScroll
              ><span class="hold-scroll-text">{item.day}</span>{#if item.today}<small
                  class="day-indicator"
                  aria-label="Current day"
                ></small>{/if}</span
            >
          {/snippet}
        </ListRow>
      {:else if item.workout}
        <ListRow rowClass="complete-row" disabled icon="check" iconLabel="Workout complete">
          {#snippet content()}<span class="day-label"><span>{item.day}</span></span>{/snippet}
        </ListRow>
      {:else}
        <ListRow
          label={`${item.day} · Rest`}
          rowClass="rest-day"
          linkClass="is-disabled"
          disabled
          scroll
          icon="dash"
          iconLabel="Rest day"
        />
      {/if}
    {/each}
  </AppList>
</section>
