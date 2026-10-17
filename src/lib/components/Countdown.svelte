<script lang="ts">
  import { formatDuration, remaining } from '#lib/workout/index.ts';
  import { cue } from '../browser/feedback.ts';

  // The single semantic timer used by rest, plank, stretch, and timed activities. It reads the
  // persisted end time on every tick, so refreshing or resuming the app shows the true remainder.
  // A bar under the digits drains with the time left (when `total` is known), and the last three
  // seconds pip and beat so the end can be heard and felt without looking.
  let {
    endAt,
    label,
    variant,
    total,
    id = 'timer',
    onend,
  }: {
    endAt: number | null | undefined;
    label: string;
    variant: 'rest' | 'plank' | 'stretch' | 'activity';
    total?: number;
    id?: string;
    onend?: () => void;
  } = $props();

  let now = $state(Date.now());
  let ended = false;
  let lastPip = 0;
  const left = $derived(remaining(endAt, now));
  const seconds = $derived(Math.ceil(left / 1000));
  const final = $derived(Boolean(endAt) && seconds > 0 && seconds <= 3);
  const progress = $derived(total ? Math.min(1, left / total) : 0);

  $effect(() => {
    if (!endAt) return;
    ended = false;
    const timer = setInterval(() => {
      now = Date.now();
    }, 250);
    return () => clearInterval(timer);
  });

  $effect(() => {
    if (final && seconds !== lastPip) {
      lastPip = seconds;
      cue('countdown');
    }
  });

  $effect(() => {
    if (endAt && left === 0 && !ended) {
      ended = true;
      onend?.();
    }
  });
</script>

<div class={['countdown-face', `countdown--${variant}`]} style:--progress={progress}>
  <div class={['big-timer', 'countdown']} {id} role="timer" aria-live="polite" aria-label={label}>
    {#key seconds}<span class={['countdown-digits', final && 'is-final']}
        >{formatDuration(left)}</span
      >{/key}
  </div>
  {#if total}<div class="countdown-track" aria-hidden="true"><span></span></div>{/if}
</div>
