<script lang="ts">
  import { formatDuration, remaining } from '#lib/workout/index.ts';

  // The single semantic timer used by rest, plank, stretch, and timed activities. It reads the
  // persisted end time on every tick, so refreshing or resuming the app shows the true remainder.
  let {
    endAt,
    label,
    variant,
    id = 'timer',
    onend,
  }: {
    endAt: number | null | undefined;
    label: string;
    variant: 'rest' | 'plank' | 'stretch' | 'activity';
    id?: string;
    onend?: () => void;
  } = $props();

  let now = $state(Date.now());
  let ended = false;
  const left = $derived(remaining(endAt, now));

  $effect(() => {
    if (!endAt) return;
    ended = false;
    const timer = setInterval(() => {
      now = Date.now();
    }, 250);
    return () => clearInterval(timer);
  });

  $effect(() => {
    if (endAt && left === 0 && !ended) {
      ended = true;
      onend?.();
    }
  });
</script>

<div
  class={['big-timer', 'countdown', `countdown--${variant}`]}
  {id}
  role="timer"
  aria-live="polite"
  aria-label={label}
>
  {formatDuration(left)}
</div>
