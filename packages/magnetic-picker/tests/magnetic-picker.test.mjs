import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMagneticPicker,
  magneticEntryIndex,
  magneticPickerIndex,
  magneticPreferredIndex,
  magneticRawRowIndex,
  magneticScrollVelocity,
} from '../src/magnetic-picker.js';

test('library exports calculations and picker without a DOM at module load', () => {
  assert.equal(magneticRawRowIndex(1, 48, 24), 3);
  assert.equal(magneticPickerIndex(8, 4), 3);
  assert.equal(magneticPreferredIndex(2, [0, 1], 4), 1);
  assert.equal(magneticEntryIndex(0, [0, 1], 2, [1]), 1);
});

test('magnetic detents accelerate symmetrically away from the touch point', () => {
  const nearForward = magneticRawRowIndex(0, 24 * 4, 24);
  const farForward = magneticRawRowIndex(0, 24 * 8, 24);
  const nearBackward = magneticRawRowIndex(0, -24 * 4, 24);
  const farBackward = magneticRawRowIndex(0, -24 * 8, 24);

  assert.ok(farForward > 8);
  assert.equal(farBackward, -farForward);
  assert.equal(nearBackward, -nearForward);
  assert.ok(farForward - nearForward > nearForward);
});

test('picker scroll velocity uses a centered dead zone and distance ramp', () => {
  assert.equal(magneticScrollVelocity(100, 0, 200), 0);
  assert.equal(magneticScrollVelocity(120, 0, 200), 0);
  assert.ok(magneticScrollVelocity(70, 0, 200) < 0);
  assert.ok(magneticScrollVelocity(130, 0, 200) > 0);
  assert.ok(magneticScrollVelocity(70, 0, 200) < magneticScrollVelocity(90, 0, 200));
  assert.equal(magneticScrollVelocity(1000, 0, 200), 8);
  assert.equal(magneticScrollVelocity(-1000, 0, 200), -8);
});

function makePickerDom({ rows = 1 } = {}) {
  const listeners = new Map();
  const classes = new Set();
  const documentElement = {
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
  };
  const styleProperties = new Map();
  const capturedPointerIds = [];
  const actions = Array.from({ length: rows }, (_, index) => ({
    disabled: false,
    getAttribute: (name) => (name === 'aria-label' ? `Exercise ${index}` : null),
  }));
  const rowList = Array.from({ length: rows }, (_, index) => {
    const rowClasses = new Set();
    return {
      action: actions[index],
      classList: {
        add: (name) => rowClasses.add(name),
        remove: (name) => rowClasses.delete(name),
        toggle: (name, enabled) => (enabled ? rowClasses.add(name) : rowClasses.delete(name)),
        contains: (name) => rowClasses.has(name),
      },
      getAttribute: (name) => (name === 'data-picker-value' ? `exercise-${index}` : null),
      hasAttribute: () => false,
      matches: () => false,
      querySelector: () => actions[index],
      getBoundingClientRect: () => ({ top: index * 50, bottom: index * 50 + 50, height: 50 }),
      removeAttribute: () => {},
      setAttribute: () => {},
      scrollIntoView: () => {},
      textContent: `Exercise ${index}`,
    };
  });
  const list = {
    parentElement: null,
    clientHeight: rows * 50,
    scrollHeight: rows * 50,
    style: {
      setProperty: (name, value) => styleProperties.set(name, value),
      removeProperty: (name) => styleProperties.delete(name),
    },
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle: (name, enabled) => (enabled ? classes.add(name) : classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    querySelector: () => null,
    querySelectorAll: (selector) => (selector.includes('data-picker-item') ? rowList : []),
    addEventListener: (type, handler) => listeners.set(`list:${type}`, handler),
    removeEventListener: () => {},
    append: () => {},
    setPointerCapture: (pointerId) => capturedPointerIds.push(pointerId),
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
  return { document, list, listeners, classes, rowList, styleProperties, capturedPointerIds };
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

test('hold progress state is removed after activation', async () => {
  const dom = makePickerDom();
  const originalDocument = globalThis.document;
  globalThis.document = dom.document;
  try {
    const picker = createMagneticPicker(dom.list, { cancel: false, holdMs: 20 });
    dom.listeners.get('list:pointerdown')({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    assert.equal(dom.classes.has('is-picker-holding'), true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(dom.classes.has('is-picker-holding'), false);
    picker.destroy();
  } finally {
    globalThis.document = originalDocument;
  }
});

test('early movement and pointer cancellation are silent before activation', async () => {
  const dom = makePickerDom();
  const originalDocument = globalThis.document;
  let cancellations = 0;
  globalThis.document = dom.document;
  try {
    const picker = createMagneticPicker(dom.list, {
      cancel: false,
      holdMs: 40,
      onCancel: () => cancellations++,
    });
    dom.listeners.get('list:pointerdown')({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    dom.listeners.get('document:pointermove')({
      pointerId: 1,
      clientY: 60,
      movementY: 40,
      preventDefault: () => {},
    });
    assert.equal(cancellations, 0);
    dom.listeners.get('document:pointercancel')({ pointerId: 1 });
    assert.equal(cancellations, 0);
    picker.destroy();
  } finally {
    globalThis.document = originalDocument;
  }
});

test('active picker cancellation calls onCancel exactly once', async () => {
  const dom = makePickerDom();
  const originalDocument = globalThis.document;
  let cancellations = 0;
  globalThis.document = dom.document;
  try {
    const picker = createMagneticPicker(dom.list, {
      cancel: false,
      holdMs: 0,
      onCancel: () => cancellations++,
    });
    dom.listeners.get('list:pointerdown')({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    dom.listeners.get('document:pointercancel')({ pointerId: 1 });
    assert.equal(cancellations, 1);
    picker.destroy();
    assert.equal(cancellations, 1);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('movement after activation keeps the picker active', async () => {
  const dom = makePickerDom({ rows: 3 });
  const originalDocument = globalThis.document;
  globalThis.document = dom.document;
  try {
    const picker = createMagneticPicker(dom.list, { cancel: false, holdMs: 0 });
    dom.listeners.get('list:pointerdown')({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    dom.listeners.get('document:pointermove')({
      pointerId: 1,
      clientY: 70,
      preventDefault: () => {},
    });
    assert.equal(dom.classes.has('is-picker-active'), true);
    picker.destroy();
  } finally {
    globalThis.document = originalDocument;
  }
});

test('stationary edge pointer continuously advances and cancels its animation', async () => {
  const dom = makePickerDom({ rows: 4 });
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const frames = new Map();
  const cancelledFrames = [];
  let nextFrameId = 1;
  globalThis.document = dom.document;
  globalThis.window = {
    requestAnimationFrame: (callback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => {
      cancelledFrames.push(id);
      frames.delete(id);
    },
  };
  try {
    const picker = createMagneticPicker(dom.list, {
      cancel: false,
      holdMs: 0,
      detentDistance: 1000,
    });
    dom.listeners.get('list:pointerdown')({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    dom.listeners.get('document:pointermove')({
      pointerId: 1,
      clientY: 1000,
      preventDefault: () => {},
    });
    const firstFrame = frames.keys().next().value;
    const firstCallback = frames.get(firstFrame);
    frames.delete(firstFrame);
    firstCallback(0);
    const secondFrame = frames.keys().next().value;
    const secondCallback = frames.get(secondFrame);
    frames.delete(secondFrame);
    secondCallback(1000);
    const thirdFrame = frames.keys().next().value;
    const thirdCallback = frames.get(thirdFrame);
    frames.delete(thirdFrame);
    thirdCallback(2000);
    assert.equal(dom.rowList[3].classList.contains('is-picker-target'), true);
    dom.listeners.get('document:keydown')({ key: 'Escape', preventDefault: () => {} });
    assert.ok(cancelledFrames.length > 0);
    picker.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test('captures the pointer immediately for stable picker dragging', async () => {
  const dom = makePickerDom({ rows: 3 });
  const originalDocument = globalThis.document;
  let selection;
  globalThis.document = dom.document;
  try {
    const picker = createMagneticPicker(dom.list, {
      cancel: false,
      holdMs: 0,
      detentDistance: 11,
      onSelect: (...args) => (selection = args),
    });
    dom.listeners.get('list:pointerdown')({ pointerId: 7, pointerType: 'touch', clientY: 120 });
    assert.deepEqual(dom.capturedPointerIds, [7]);
    assert.equal(dom.styleProperties.has('touch-action'), false);
    await new Promise((resolve) => setTimeout(resolve, 5));
    dom.listeners.get('document:pointermove')({
      pointerId: 7,
      clientY: 109,
      preventDefault: () => {},
    });
    dom.listeners.get('document:pointerup')({ pointerId: 7 });
    assert.equal(selection[0], 'exercise-1');
    picker.destroy();
  } finally {
    globalThis.document = originalDocument;
  }
});

test('pointer leave after activation keeps the picker active', async () => {
  const dom = makePickerDom();
  const originalDocument = globalThis.document;
  globalThis.document = dom.document;
  try {
    const picker = createMagneticPicker(dom.list, { cancel: false, holdMs: 0 });
    dom.listeners.get('list:pointerdown')({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    dom.listeners.get('list:pointerleave')({ pointerId: 1 });
    assert.equal(dom.classes.has('is-picker-active'), true);
    picker.destroy();
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
