/** Svelte action: long rows pan horizontally after a pause or while pressed. */
export function holdScroll(element: HTMLElement) {
  const text = element.querySelector<HTMLElement>('.hold-scroll-text') || element;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    clearTimeout(timer);
    element.classList.remove('is-hold-scrolling');
    text.style.removeProperty('--scroll-distance');
  };
  const start = () => {
    if (text.scrollWidth <= element.clientWidth + 1) return;
    text.style.setProperty(
      '--scroll-distance',
      `${Math.min(0, element.clientWidth - text.scrollWidth)}px`,
    );
    element.classList.add('is-hold-scrolling');
  };
  const press = () => {
    clearTimeout(timer);
    timer = setTimeout(start, 450);
  };
  timer = setTimeout(start, 1400);
  const events: Array<[string, EventListener]> = [
    ['pointerdown', press],
    ['pointerup', stop],
    ['pointercancel', stop],
    ['pointerleave', stop],
    ['blur', stop],
  ];
  events.forEach(([type, listener]) => element.addEventListener(type, listener));
  return {
    destroy() {
      clearTimeout(timer);
      events.forEach(([type, listener]) => element.removeEventListener(type, listener));
    },
  };
}

/** Svelte action: a title too wide for the watch canvas scrolls once so it can be read. */
export function titleMarquee(element: HTMLElement) {
  const text = element.querySelector<HTMLElement>('.title-marquee-text') || element;
  const track = element.querySelector<HTMLElement>('.title-marquee-track') || element;
  const start = () => {
    const textWidth = text.getBoundingClientRect().width;
    if (textWidth <= element.clientWidth + 1) return;
    track.style.setProperty(
      '--marquee-distance',
      `${Math.min(0, element.clientWidth - textWidth)}px`,
    );
    element.classList.add('is-title-marquee');
  };
  const end = (event: AnimationEvent) => {
    if (event.animationName !== 'title-marquee') return;
    element.classList.remove('is-title-marquee');
    track.style.removeProperty('--marquee-distance');
  };
  track.addEventListener('animationend', end);
  const timer = setTimeout(start, 1400);
  return {
    destroy() {
      clearTimeout(timer);
      track.removeEventListener('animationend', end);
    },
  };
}
