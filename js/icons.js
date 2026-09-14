const LUCIDE_ICONS = {
  download: '<path d="M12 15V3"/><path d="m19 10-7 7-7-7"/><path d="M5 21h14"/>',
  upload: '<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M5 21h14"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 9-9c2.35 0 4.48.9 6.08 2.38L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9c-2.35 0-4.48-.9-6.08-2.38L3 16"/><path d="M3 21v-5h5"/>',
  loader:
    '<path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  dash: '<path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
};

export const iconPaths = (name) => LUCIDE_ICONS[name] || '';

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );

export const icon = (name, label = '') =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconPaths(name)}</svg><span class="sr-only">${escapeHtml(label)}</span>`;
