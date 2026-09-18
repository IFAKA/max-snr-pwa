import { formatDuration, remaining } from '../workout/timers.js';

const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );

const variantClass = (variant) => (variant ? ` countdown--${esc(variant)}` : '');
const stageTitleMarkup = (title) =>
  `<h1 id="workout-title" class="app-title workout-title" data-title-marquee><span class="title-marquee-track"><span class="title-marquee-text">${esc(title)}</span></span></h1>`;

export function countdownMarkup({
  id = 'timer',
  remainingMs = 0,
  label = 'Time remaining',
  variant,
}) {
  return `<div class="big-timer countdown${variantClass(variant)}" id="${esc(id)}" role="timer" aria-live="polite" aria-label="${esc(label)}">${formatDuration(remainingMs)}</div>`;
}

export function countdownStage({
  className = '',
  title,
  metadata = '',
  countdown = {},
  actions = '',
}) {
  return `<section class="workout-stage countdown-stage${className ? ` ${className}` : ''}" aria-labelledby="workout-title"><div class="stage-info">${stageTitleMarkup(title)}${metadata}</div><div class="thumb-zone">${countdownMarkup(countdown)}<div class="countdown-actions">${actions}</div></div></section>`;
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
