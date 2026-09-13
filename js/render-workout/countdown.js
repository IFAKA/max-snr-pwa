import { formatDuration, remaining } from '../workout/timers.js';

const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );

const variantClass = (variant) => (variant ? ` countdown--${esc(variant)}` : '');

export function countdownMarkup({
  id = 'timer',
  remainingMs = 0,
  label = 'Time remaining',
  variant,
}) {
  return `<div class="big-timer countdown${variantClass(variant)}" id="${esc(id)}" role="timer" aria-live="polite" aria-label="${esc(label)}">${formatDuration(remainingMs)}</div>`;
}

export function bindCountdown({ element, getEndAt, shouldRun = () => true, onEnd }) {
  if (!element || typeof getEndAt !== 'function') return () => {};
  let ended = false;
  const tick = () => {
    const endAt = getEndAt();
    const left = remaining(endAt);
    element.textContent = formatDuration(left);
    if (!left && !ended) {
      ended = true;
      void Promise.resolve(onEnd?.());
    }
  };
  tick();
  const timer = setInterval(() => {
    if (!shouldRun()) {
      clearInterval(timer);
      return;
    }
    tick();
  }, 250);
  return () => clearInterval(timer);
}
