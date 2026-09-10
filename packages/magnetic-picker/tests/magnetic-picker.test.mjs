import test from 'node:test';
import assert from 'node:assert/strict';

import {
  magneticEntryIndex,
  magneticPickerIndex,
  magneticPreferredIndex,
  magneticRawRowIndex,
} from '../src/magnetic-picker.js';

test('library exports generic detent calculations without a DOM', () => {
  assert.equal(magneticRawRowIndex(1, 48, 24), 3);
  assert.equal(magneticPickerIndex(8, 4), 3);
  assert.equal(magneticPreferredIndex(2, [0, 1], 4), 1);
  assert.equal(magneticEntryIndex(0, [0, 1], 2, [1]), 1);
});
