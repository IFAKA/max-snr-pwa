import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = {
  querySelector: () => null,
  addEventListener: () => {},
  body: {dataset: {}},
  visibilityState: 'visible',
};

const {magneticEdgePosition, magneticPickerIndex, magneticPreferredIndex, magneticRowIndex} = await import('../js/dom.js');

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

test('picker exposes a cancel detent beyond either list edge', () => {
  assert.equal(magneticPickerIndex(-1, 4), -1);
  assert.equal(magneticPickerIndex(4, 4), -1);
  assert.equal(magneticPickerIndex(2, 4), 2);
});

test('picker prefers the nearest selectable row', () => {
  assert.equal(magneticPreferredIndex(0, [1, 2], 3), 1);
  assert.equal(magneticPreferredIndex(2, [0, 1], 3), 1);
});

test('picker falls back to disabled rows when none are selectable', () => {
  assert.equal(magneticPreferredIndex(1, [], 3), 1);
});

test('picker highlights the held row before the hold vibration', async () => {
  const events = [];
  const listeners = {};
  const classList = {
    add: name => events.push(`add:${name}`),
    remove: () => {},
    toggle: (name, enabled) => events.push(`toggle:${name}:${enabled}`),
  };
  const action = {disabled: false, getAttribute: () => null, classList: {contains: () => false}};
  const row = {
    matches: selector => selector === 'li',
    getBoundingClientRect: () => ({top: 0, bottom: 52, height: 52}),
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
    querySelectorAll: () => [],
    addEventListener: (type, handler) => { listeners[type] = handler; },
    classList: {add: () => {}, remove: () => {}},
    style: {setProperty: () => {}, removeProperty: () => {}},
    getBoundingClientRect: () => ({top: 0, right: 100, bottom: 52, left: 0}),
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  };
  const originalDocument = globalThis.document;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  globalThis.document = {
    ...originalDocument,
    documentElement: {classList: {add: () => {}, remove: () => {}}},
    createElement: () => ({className: '', setAttribute: () => {}, classList: {add: () => {}, remove: () => {}}, textContent: '',}),
    addEventListener: () => {},
    body: {dataset: {}},
    scrollingElement: list,
  };
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {vibrate: () => events.push('vibrate')}});
  try {
    const {bindMagneticLists} = await import('../js/dom.js?picker-order');
    bindMagneticLists({querySelectorAll: () => [list]});
    listeners.pointerdown({pointerId: 1, pointerType: 'touch', clientY: 20});
    await new Promise(resolve => setTimeout(resolve, 430));
    const highlightIndex = events.indexOf('toggle:is-magnetic-target:true');
    const vibrationIndex = events.indexOf('vibrate');
    assert.ok(highlightIndex >= 0);
    assert.ok(vibrationIndex >= 0);
    assert.ok(highlightIndex < vibrationIndex);
  } finally {
    globalThis.document = originalDocument;
    Object.defineProperty(globalThis, 'navigator', originalNavigator);
  }
});
