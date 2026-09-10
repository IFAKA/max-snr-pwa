import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMagneticPicker,
  magneticEntryIndex,
  magneticJoystickSpeed,
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

test('magnetic joystick speed has a symmetric, smooth, capped dead zone', () => {
  assert.equal(magneticJoystickSpeed(24, 24, 24, 8), 0);
  assert.equal(magneticJoystickSpeed(-24, 24, 24, 8), 0);
  const near = magneticJoystickSpeed(30, 24, 24, 8);
  const farther = magneticJoystickSpeed(60, 24, 24, 8);
  assert.ok(farther > near && near > 0);
  assert.equal(magneticJoystickSpeed(10000, 24, 24, 8), 8);
  assert.equal(magneticJoystickSpeed(-60, 24, 24, 8), -farther);
});

function makePickerDom({ rows = 1, disabledIndices = [] } = {}) {
  const listeners = new Map();
  const classes = new Set();
  const documentElement = {
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
  };
  const styleProperties = new Map();
  const capturedPointerIds = [];
  const overlays = [];
  const makeElement = () => {
    const properties = new Map();
    const element = {
      properties,
      children: [],
      removed: false,
      className: '',
      classList: { add: () => {}, remove: () => {} },
      style: {
        setProperty: (name, value) => properties.set(name, value),
        removeProperty: (name) => properties.delete(name),
      },
      setAttribute: () => {},
      removeAttribute: () => {},
      remove: () => (element.removed = true),
      append: (...children) => element.children.push(...children),
      textContent: '',
    };
    return element;
  };
  const actions = Array.from({ length: rows }, (_, index) => ({
    disabled: disabledIndices.includes(index),
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
    body: { append: (element) => overlays.push(element) },
    documentElement,
    scrollingElement: list,
    createElement: () => makeElement(),
    addEventListener: (type, handler) => listeners.set(`document:${type}`, handler),
    removeEventListener: () => {},
  };
  return {
    document,
    list,
    listeners,
    classes,
    rowList,
    styleProperties,
    capturedPointerIds,
    overlays,
  };
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

test('stationary joystick input keeps scrolling and dead-zone input stops without resetting', async () => {
  const dom = makePickerDom({ rows: 5 });
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let frame;
  let cancelledFrame = null;
  globalThis.document = dom.document;
  globalThis.window = {
    requestAnimationFrame: (callback) => {
      frame = callback;
      return 1;
    },
    cancelAnimationFrame: (id) => {
      cancelledFrame = id;
    },
  };
  try {
    const picker = createMagneticPicker(dom.list, { cancel: false, holdMs: 0 });
    dom.listeners.get('list:pointerdown')({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    dom.listeners.get('document:pointermove')({
      pointerId: 1,
      clientY: 120,
      preventDefault: () => {},
    });
    frame(0);
    for (let time = 100; time <= 2000; time += 100) frame(time);
    const movedTarget = dom.rowList.findIndex((row) =>
      row.classList.contains?.('is-picker-target'),
    );
    assert.ok(movedTarget > 0);
    dom.listeners.get('document:pointermove')({
      pointerId: 1,
      clientY: 20,
      preventDefault: () => {},
    });
    frame(200);
    const heldTarget = dom.rowList.findIndex((row) => row.classList.contains('is-picker-target'));
    assert.equal(heldTarget, movedTarget);
    assert.equal(cancelledFrame, null);
    dom.listeners.get('document:pointerup')({ pointerId: 1 });
    picker.destroy();
    assert.equal(cancelledFrame, 1);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test('joystick overlay follows a fixed origin and clamps the thumb to its radius', async () => {
  const dom = makePickerDom({ rows: 4 });
  const originalDocument = globalThis.document;
  globalThis.document = dom.document;
  try {
    const picker = createMagneticPicker(dom.list, {
      cancel: false,
      holdMs: 0,
      joystickRadius: 40,
    });
    dom.listeners.get('list:pointerdown')({
      pointerId: 1,
      pointerType: 'touch',
      clientX: 80,
      clientY: 80,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(dom.overlays.length, 1);
    const well = dom.overlays[0].children[0];
    assert.equal(well.properties.get('--picker-joystick-x'), '80px');
    assert.equal(well.properties.get('--picker-joystick-y'), '80px');

    dom.listeners.get('document:pointermove')({
      pointerId: 1,
      clientX: 180,
      clientY: 180,
      preventDefault: () => {},
    });
    const thumbX = Number.parseFloat(well.properties.get('--picker-thumb-x'));
    const thumbY = Number.parseFloat(well.properties.get('--picker-thumb-y'));
    assert.ok(Math.abs(Math.hypot(thumbX, thumbY) - 40) < 0.001);

    dom.listeners.get('document:pointermove')({
      pointerId: 1,
      clientX: 80,
      clientY: 80,
      preventDefault: () => {},
    });
    assert.equal(well.properties.get('--picker-joystick-x'), '80px');
    assert.equal(well.properties.get('--picker-joystick-y'), '80px');
    assert.equal(well.properties.get('--picker-thumb-x'), '0px');
    assert.equal(well.properties.get('--picker-thumb-y'), '0px');
    picker.destroy();
    assert.equal(dom.overlays[0].removed, true);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('visibility reset removes the joystick overlay and cancels its frame', async () => {
  const dom = makePickerDom({ rows: 3 });
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let cancelledFrame = null;
  globalThis.document = dom.document;
  globalThis.window = {
    requestAnimationFrame: () => 9,
    cancelAnimationFrame: (id) => (cancelledFrame = id),
  };
  try {
    createMagneticPicker(dom.list, { cancel: false, holdMs: 0 });
    dom.listeners.get('list:pointerdown')({
      pointerId: 1,
      pointerType: 'touch',
      clientX: 20,
      clientY: 20,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    dom.listeners.get('document:visibilitychange')();
    assert.equal(dom.overlays[0].removed, true);
    assert.equal(cancelledFrame, 9);
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
    assert.equal(selection[0], 'exercise-2');
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
