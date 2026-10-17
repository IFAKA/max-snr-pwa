import {
  createMagneticPicker,
  type MagneticPicker,
  type MagneticPickerOptions,
} from '#picker/magnetic-picker.js';

const WORKOUT_PICKER_DETENT_DISTANCE = 11;

export const APP_PICKER_OPTIONS: MagneticPickerOptions = {
  rowSelector: ':scope > li:not([hidden])',
  actionSelector: 'a, button, label, [role="button"]',
  activeListClass: 'is-picker-active',
  activeDocumentClass: 'is-picker-active',
  targetRowClass: 'is-picker-target',
  holdingClass: 'is-picker-holding',
  cancelRowClass: 'picker-cancel-row',
  cancelRowAttribute: 'data-picker-cancel-row',
  cancelActionAttribute: 'data-picker-cancel',
  statusClass: 'picker-status',
  statusVisibleClass: 'is-picker-status-visible',
  visuallyHiddenClass: 'sr-only',
  isSelectable: (action, row) =>
    (!action && !row?.hasAttribute?.('data-picker-skip')) ||
    (Boolean(action) &&
      !(action as HTMLButtonElement).disabled &&
      action?.getAttribute('aria-disabled') !== 'true' &&
      !action?.classList.contains('is-disabled')),
  onSelect: (_value, { action }) => action?.click(),
};

/** Attaches the long-press magnetic picker to one `.app-list`. */
export function bindMagneticList(list: HTMLElement): MagneticPicker {
  return createMagneticPicker(list, {
    ...APP_PICKER_OPTIONS,
    detentDistance: list.closest?.('.workout-picker') ? WORKOUT_PICKER_DETENT_DISTANCE : undefined,
    disabled: (target) =>
      !target.querySelector?.(':scope > li:not([hidden]):not([data-picker-skip])'),
  });
}

/** Binds every unbound `.app-list` under the root (used by non-component callers and tests). */
export function bindMagneticLists(root: Pick<ParentNode, 'querySelectorAll'> = document) {
  root.querySelectorAll?.<HTMLElement>('.app-list').forEach((list) => {
    if (list.dataset.magneticBound) return;
    list.dataset.magneticBound = 'true';
    bindMagneticList(list);
  });
}

/**
 * Svelte action. The picker decides at creation whether a list has selectable rows, so it is
 * rebuilt when `key` changes (the rows a list renders).
 */
export function magneticList(list: HTMLElement, key?: unknown) {
  let picker = bindMagneticList(list);
  let currentKey = key;
  const rebuild = () => {
    picker.destroy();
    list.querySelector(':scope > [data-picker-cancel-row]')?.remove();
    picker = bindMagneticList(list);
  };
  return {
    update(nextKey?: unknown) {
      if (nextKey === currentKey) return;
      currentKey = nextKey;
      queueMicrotask(rebuild);
    },
    destroy() {
      picker.destroy();
    },
  };
}
