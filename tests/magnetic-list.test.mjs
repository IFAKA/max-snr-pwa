import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = {
  querySelector: () => null,
  addEventListener: () => {},
  body: { dataset: {} },
  visibilityState: 'visible',
};

const {
  magneticEdgePosition,
  magneticEntryIndex,
  magneticPickerIndex,
  magneticPreferredIndex,
  magneticRowIndex,
} = await import('../js/magnetic-picker.js');

test('magnetic row calculation follows cumulative drag distance', () => {
  assert.equal(magneticRowIndex(2, -24, 6), 1);
  assert.equal(magneticRowIndex(2, 24, 6), 3);
});

test('magnetic row calculation clamps at both list edges', () => {
  assert.equal(magneticRowIndex(0, -400, 4), 0);
  assert.equal(magneticRowIndex(3, 400, 4), 3);
});

test('edge friction eases overshoot instead of extending the active row', () => {
  assert.ok(magneticEdgePosition(-1, 4) > -1);
  assert.ok(magneticEdgePosition(-1, 4) < 0);
  assert.ok(magneticEdgePosition(4, 4) > 3);
  assert.ok(magneticEdgePosition(4, 4) < 4);
});

test('picker clamps to its first and last detents', () => {
  assert.equal(magneticPickerIndex(-1, 4), 0);
  assert.equal(magneticPickerIndex(4, 4), 3);
  assert.equal(magneticPickerIndex(2, 4), 2);
});

test('picker cancel detent remains the final row', () => {
  assert.equal(magneticPickerIndex(3, 4), 3);
  assert.equal(magneticPickerIndex(4, 4), 3);
});

test('picker prefers the nearest selectable row', () => {
  assert.equal(magneticPreferredIndex(0, [1, 2], 3), 1);
  assert.equal(magneticPreferredIndex(2, [0, 1], 3), 1);
});

test('picker entry prefers an explicitly primary selectable row', () => {
  assert.equal(magneticEntryIndex(0, [0, 1, 2], 3, [2]), 2);
});

test('picker entry ignores disabled primary rows', () => {
  assert.equal(magneticEntryIndex(0, [0, 1], 3, [2]), 0);
});

test('picker entry uses the nearest enabled row without a primary', () => {
  assert.equal(magneticEntryIndex(2, [0, 1], 3), 1);
});

test('picker movement can reach enabled links after primary entry', () => {
  const entryIndex = magneticEntryIndex(0, [0, 1, 2], 3, [0]);
  assert.equal(magneticPreferredIndex(2, [0, 1, 2], 3), 2);
  assert.equal(entryIndex, 0);
});

test('picker falls back to disabled rows when none are selectable', () => {
  assert.equal(magneticPreferredIndex(1, [], 3), 1);
});

test('picker can use text-only rows as cursor detents', () => {
  assert.equal(magneticPreferredIndex(2, [1, 2, 3], 4), 2);
});

test('picker vibrates before highlighting the held row', async () => {
  const events = [];
  const listeners = {};
  const classList = {
    add: (name) => events.push(`add:${name}`),
    remove: () => {},
    toggle: (name, enabled) => events.push(`toggle:${name}:${enabled}`),
  };
  const action = {
    disabled: false,
    getAttribute: () => null,
    classList: { contains: () => false },
  };
  const row = {
    matches: (selector) => selector.startsWith('li'),
    getBoundingClientRect: () => ({ top: 0, bottom: 52, height: 52 }),
    querySelector: () => action,
    classList,
    setAttribute: () => {},
    removeAttribute: () => {},
    scrollIntoView: () => {},
    textContent: 'Shoulders',
  };
  const list = {
    dataset: {},
    children: [row],
    parentElement: null,
    append: () => {},
    clientHeight: 52,
    scrollHeight: 52,
    querySelector: () => null,
    querySelectorAll: (selector) => (selector.startsWith(':scope') ? [row] : []),
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    classList: { add: () => {}, remove: () => {} },
    style: { setProperty: () => {}, removeProperty: () => {} },
    getBoundingClientRect: () => ({ top: 0, right: 100, bottom: 52, left: 0 }),
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  };
  const originalDocument = globalThis.document;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  globalThis.document = {
    ...originalDocument,
    documentElement: { classList: { add: () => {}, remove: () => {} } },
    createElement: () => ({
      className: '',
      setAttribute: () => {},
      removeAttribute: () => {},
      classList: { add: () => {}, remove: () => {} },
      textContent: '',
    }),
    addEventListener: () => {},
    body: { dataset: {} },
    scrollingElement: list,
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { vibrate: () => events.push('vibrate') },
  });
  try {
    const { bindMagneticLists } = await import('../js/dom.js?picker-order');
    bindMagneticLists({ querySelectorAll: () => [list] });
    listeners.pointerdown({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    let contextMenuPrevented = false;
    listeners.contextmenu({ preventDefault: () => (contextMenuPrevented = true) });
    assert.equal(contextMenuPrevented, true);
    await new Promise((resolve) => setTimeout(resolve, 430));
    const highlightIndex = events.indexOf('toggle:is-picker-target:true');
    const vibrationIndex = events.indexOf('vibrate');
    assert.ok(highlightIndex >= 0);
    assert.ok(vibrationIndex >= 0);
    assert.ok(vibrationIndex < highlightIndex);
  } finally {
    globalThis.document = originalDocument;
    Object.defineProperty(globalThis, 'navigator', originalNavigator);
  }
});

test('excluded empty-state rows do not enter picker mode', async () => {
  const listeners = {};
  const classes = new Set();
  const row = {
    getBoundingClientRect: () => ({ top: 0, bottom: 52, height: 52 }),
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    hasAttribute: () => false,
    setAttribute: () => {},
    removeAttribute: () => {},
    querySelector: () => null,
    textContent: 'No workouts yet',
  };
  const list = {
    dataset: {},
    parentElement: null,
    append: () => {},
    clientHeight: 52,
    scrollHeight: 52,
    querySelector: () => null,
    querySelectorAll: (selector) =>
      selector === '.app-list' ? [list] : selector.includes('[data-picker-exclude]') ? [] : [row],
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
    style: { setProperty: () => {}, removeProperty: () => {} },
  };
  const originalDocument = globalThis.document;
  globalThis.document = {
    ...originalDocument,
    documentElement: { classList: { add: () => {}, remove: () => {} } },
    createElement: () => ({
      className: '',
      setAttribute: () => {},
      removeAttribute: () => {},
      classList: { add: () => {}, remove: () => {} },
      textContent: '',
    }),
    addEventListener: () => {},
    body: { dataset: {} },
    scrollingElement: list,
  };
  try {
    const { bindMagneticLists } = await import('../js/dom.js?empty-state');
    bindMagneticLists({ querySelectorAll: () => [list] });
    listeners.pointerdown({ pointerId: 1, pointerType: 'touch', clientY: 20 });
    await new Promise((resolve) => setTimeout(resolve, 430));
    assert.equal(classes.has('is-picker-active'), false);
  } finally {
    globalThis.document = originalDocument;
  }
});
