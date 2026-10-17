<script lang="ts">
  import Icon from './Icon.svelte';

  // A labelled −/+ control. Holding a button repeats with acceleration (×2, ×5, ×10).
  let {
    name,
    label,
    value,
    step,
    onstep,
  }: {
    name: string;
    label: string;
    value: string;
    step: number;
    onstep: (delta: number) => void;
  } = $props();

  function holdable(button: HTMLButtonElement, direction: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    let startedAt = 0;
    let skipClick = false;
    const multiplier = () => {
      const elapsed = performance.now() - startedAt;
      if (elapsed >= 2500) return 10;
      if (elapsed >= 1500) return 5;
      if (elapsed >= 800) return 2;
      return 1;
    };
    const stop = () => {
      clearTimeout(timer);
      clearInterval(interval);
      interval = undefined;
    };
    const down = () => {
      skipClick = true;
      startedAt = performance.now();
      onstep(direction * step);
      timer = setTimeout(() => {
        interval = setInterval(() => onstep(direction * step * multiplier()), 110);
      }, 450);
    };
    // Keyboard and assistive-technology activation arrive as clicks without a pointerdown.
    const click = () => {
      if (skipClick) skipClick = false;
      else onstep(direction * step);
    };
    const events: Array<[string, EventListener]> = [
      ['pointerdown', down],
      ['pointerup', stop],
      ['pointercancel', stop],
      ['pointerleave', stop],
      ['click', click],
    ];
    events.forEach(([type, listener]) => button.addEventListener(type, listener));
    return {
      destroy() {
        stop();
        events.forEach(([type, listener]) => button.removeEventListener(type, listener));
      },
    };
  }
</script>

<div class="stepper-label" role="group" aria-labelledby="{name}-label">
  <span id="{name}-label">{label}</span>
  <div class="stepper">
    <button type="button" aria-label="Decrease {label.toLowerCase()}" use:holdable={-1}
      ><Icon name="minus" /></button
    >
    <output id="{name}-value" aria-live="polite">{value}</output>
    <button type="button" aria-label="Increase {label.toLowerCase()}" use:holdable={1}
      ><Icon name="plus" /></button
    >
  </div>
</div>
