<script lang="ts">
  import { goUp } from '../browser/navigation.ts';
  import { act, showError } from '../app-state.svelte.ts';
  import SwipeCard from '../components/SwipeCard.svelte';
  import SwipeHint from '../components/SwipeHint.svelte';
  import WorkoutStage from '../components/WorkoutStage.svelte';
  import ValueWheel from '../workout-screens/ValueWheel.svelte';

  export interface Step {
    id: string;
    label: string;
    unit: string;
    /** Where the wheel opens when there is no earlier value. */
    start: number;
    min: number;
    max: number;
    step: number;
    last?: number;
  }

  // One value per screen, like logging a set: the number is a big button that opens the wheel,
  // a swipe left (or the button) goes on, a swipe right skips. Values left alone are not saved.
  let {
    steps,
    onsave,
    doneHref,
    empty,
  }: {
    steps: Step[];
    onsave: (values: Record<string, number>) => Promise<boolean> | boolean;
    doneHref: string;
    empty: string;
  } = $props();

  let index = $state(0);
  let picked = $state<Record<string, number>>({});
  let wheel = $state(false);
  let busy = $state(false);

  const step = $derived(steps[index]);
  const isLast = $derived(index === steps.length - 1);
  const text = (value: number) => String(Number(value.toFixed(1)));
  // A value counts once it was picked, or when an earlier one carries over.
  const current = (item: Step) => picked[item.id] ?? item.last;
  const shown = $derived(current(step));

  function wheelValues(item: Step) {
    const values: number[] = [];
    for (let value = item.min; value <= item.max; value += item.step) values.push(value);
    const now = current(item) ?? item.start;
    if (!values.includes(now)) values.push(now);
    return values.sort((a, b) => a - b).map(text);
  }

  function chosen(value: string) {
    wheel = false;
    if (Number(value) !== shown) picked[step.id] = Number(value);
  }

  async function save() {
    if (busy) return;
    busy = true;
    const values = Object.fromEntries(
      steps.flatMap((item) => {
        const value = current(item);
        return value === undefined ? [] : [[item.id, value]];
      }),
    );
    if (!Object.keys(values).length) {
      showError(new Error(empty));
      busy = false;
      return;
    }
    const saved = await act(() => onsave(values));
    if (saved) await goUp(doneHref);
    else busy = false;
  }

  const next = () => (isLast ? save() : void (index += 1));
  const skip = () => {
    delete picked[step.id];
    if (isLast) void save();
    else index += 1;
  };
</script>

{#key index}
  <SwipeCard
    onconfirm={next}
    onundo={skip}
    quickConfirm
    confirmLabel={isLast ? 'Save' : 'Next'}
    undoLabel="Skip"
    disabled={busy}
  >
    <WorkoutStage title={step.label} className="lifting-stage">
      {#snippet info()}
        <p class="set-count">
          <span aria-hidden="true">{index + 1}/{steps.length}</span><span class="sr-only"
            >Step {index + 1} of {steps.length}</span
          >
        </p>
      {/snippet}
      {#snippet actions()}
        <div class="set-values single" role="group" aria-label={step.label}>
          <button
            type="button"
            class="set-value"
            id="value-pick"
            aria-label="{step.label} {shown === undefined
              ? 'not set'
              : text(shown)} {step.unit}, change"
            aria-haspopup="dialog"
            onclick={() => (wheel = true)}
            ><output id="value-output">{shown === undefined ? '—' : text(shown)}</output><span
              >{step.unit}</span
            ></button
          >
        </div>
        <SwipeHint directions={['left', 'right']} />
      {/snippet}
      {#snippet more()}
        <button class="primary log-set" id="step-next" type="button" disabled={busy} onclick={next}
          >{isLast ? 'Save' : 'Next'}</button
        >
        <button class="secondary" id="step-skip" type="button" disabled={busy} onclick={skip}
          >Skip</button
        >
        {#if !isLast}
          <button class="secondary" id="step-save" type="button" disabled={busy} onclick={save}
            >Save now</button
          >
        {/if}
      {/snippet}
    </WorkoutStage>
  </SwipeCard>
{/key}
{#if wheel}
  <ValueWheel
    values={wheelValues(step)}
    current={text(shown ?? step.start)}
    label={step.label}
    format={(value) => `${value} ${step.unit}`}
    onclose={chosen}
  />
{/if}
