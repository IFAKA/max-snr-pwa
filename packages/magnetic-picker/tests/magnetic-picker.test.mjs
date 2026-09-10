import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMagneticPicker,
  magneticEntryIndex,
  magneticPickerIndex,
  magneticPreferredIndex,
  magneticRawRowIndex,
} from '../src/magnetic-picker.js';

test('library exports calculations and picker without a DOM at module load', () => {
  assert.equal(magneticRawRowIndex(1, 48, 24), 3);
  assert.equal(magneticPickerIndex(8, 4), 3);
  assert.equal(magneticPreferredIndex(2, [0, 1], 4), 1);
  assert.equal(magneticEntryIndex(0, [0, 1], 2, [1]), 1);
});

function makePickerDom({ rows = 1 } = {}) {
  const listeners = new Map();
  const classes = new Set();
  const documentElement = {
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
  };
  const actions = Array.from({ length: rows }, (_, index) => ({
    disabled: false,
    getAttribute: (name) => (name === 'aria-label' ? `Exercise ${index}` : null),
  }));
  const rowList = Array.from({ length: rows }, (_, index) => ({
    action: actions[index],
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    getAttribute: (name) => (name === 'data-picker-value' ? `exercise-${index}` : null),
    hasAttribute: () => false,
    matches: () => false,
    querySelector: () => actions[index],
    getBoundingClientRect: () => ({ top: index * 50, bottom: index * 50 + 50, height: 50 }),
    removeAttribute: () => {},
    setAttribute: () => {},
    scrollIntoView: () => {},
    textContent: `Exercise ${index}`,
  }));
  const list = {
    parentElement: null,
    clientHeight: rows * 50,
    scrollHeight: rows * 50,
    style: { setProperty: () => {}, removeProperty: () => {} },
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    querySelector: () => null,
    querySelectorAll: (selector) => (selector.includes('data-picker-item') ? rowList : []),
    addEventListener: (type, handler) => listeners.set(`list:${type}`, handler),
    removeEventListener: () => {},
    append: () => {},
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  };
  const document = {
    body: {},
    documentElement,
    scrollingElement: list,
    createElement: () => ({
      className: '',
      classList: { add: () => {}, remove: () => {} },
      setAttribute: () => {},
      remove: () => {},
      textContent: '',
    }),
    addEventListener: (type, handler) => listeners.set(`document:${type}`, handler),
    removeEventListener: () => {},
  };
  return { document, list, listeners, classes, rowList };
}

test('semantic rows pass data-picker-value and context to onSelect', async () => {
  const dom = makePickerDom();
  const originalDocument = globalThis.document;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let selection;
  globalThis.document = dom.document;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  try {
    const picker = createMagneticPicker(dom.list, {
      cancel: false,
      holdMs: 0,
      onSelect: (...args) => (selection = args),
    });
    dom.listeners.get('list:pointerdown')({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    dom.listeners.get('document:pointerup')({ pointerId: 1 });
    assert.equal(selection[0], 'exercise-0');
    assert.deepEqual(selection[1], {
      row: dom.rowList[0],
      action: dom.rowList[0].action,
      index: 0,
    });
    picker.destroy();
  } finally {
    globalThis.document = originalDocument;
    Object.defineProperty(globalThis, 'navigator', originalNavigator);
  }
});

test('disabled option prevents setup and remains safe to destroy', () => {
  const dom = makePickerDom();
  const originalDocument = globalThis.document;
  globalThis.document = dom.document;
  try {
    const picker = createMagneticPicker(dom.list, { disabled: true });
    picker.destroy();
    assert.equal(dom.listeners.size, 0);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('Escape cancels an active picker through onCancel', async () => {
  const dom = makePickerDom();
  const originalDocument = globalThis.document;
  let cancellations = 0;
  globalThis.document = dom.document;
  try {
    createMagneticPicker(dom.list, {
      cancel: false,
      holdMs: 0,
      onCancel: () => cancellations++,
    });
    dom.listeners.get('list:pointerdown')({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    dom.listeners.get('document:keydown')({ key: 'Escape', preventDefault: () => {} });
    assert.equal(cancellations, 1);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('generated accessibility elements use package default classes', () => {
  const dom = makePickerDom();
  let status;
  let cancelRow;
  const originalDocument = globalThis.document;
  globalThis.document = {
    ...dom.document,
    createElement: (tag) => {
      const element = {
        className: '',
        classList: { add: () => {}, remove: () => {} },
        setAttribute: () => {},
        remove: () => {},
        textContent: '',
      };
      if (tag === 'output') status = element;
      if (tag === 'li') cancelRow = element;
      return element;
    },
  };
  try {
    createMagneticPicker(dom.list);
    assert.equal(status.className, 'picker-status sr-only');
    assert.equal(cancelRow.className, 'picker-cancel-row');
  } finally {
    globalThis.document = originalDocument;
  }
});
