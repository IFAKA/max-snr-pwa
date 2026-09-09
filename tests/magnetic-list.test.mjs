import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = {
  querySelector: () => null,
  addEventListener: () => {},
  body: {dataset: {}},
  visibilityState: 'visible',
};

const {magneticEdgePosition, magneticPickerIndex, magneticRowIndex} = await import('../js/dom.js');

test('magnetic row calculation follows cumulative drag distance', () => {
  assert.equal(magneticRowIndex(2, -72, 6, 64), 3);
  assert.equal(magneticRowIndex(2, 72, 6, 64), 1);
});

test('magnetic row calculation clamps at both list edges', () => {
  assert.equal(magneticRowIndex(0, -400, 4, 64), 3);
  assert.equal(magneticRowIndex(3, 400, 4, 64), 0);
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
