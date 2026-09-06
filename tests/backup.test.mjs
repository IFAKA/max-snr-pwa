import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup } from '../js/backup.js';

test('accepts a minimal version 2 backup', () => {
  const backup = validateBackup({version: 2, history: [], active: null});
  assert.equal(backup.version, 2);
  assert.deepEqual(backup.history, []);
});

test('rejects executable strings in numeric performance fields', () => {
  assert.throws(() => validateBackup({
    version: 2,
    active: null,
    history: [{
      id: 1,
      date: new Date().toISOString(),
      name: 'Workout',
      tasks: [{
        performedName: 'Press',
        completed: {weight: '<img src=x onerror=alert(1)>', reps: 8, rir: '1'}
      }]
    }]
  }), /backup/i);
});

test('rejects an active workout without tasks', () => {
  assert.throws(() => validateBackup({version: 2, history: [], active: {name: 'Broken', phase: 'lifting'}}), /backup/i);
});
