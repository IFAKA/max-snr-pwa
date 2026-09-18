import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup } from '../js/backup.js';
import { migrate } from '../js/storage.js';

test('accepts a minimal version 2 backup', () => {
  const backup = validateBackup({ version: 2, history: [], active: null });
  assert.equal(backup.version, 2);
  assert.deepEqual(backup.history, []);
  assert.equal(backup.health.sedentary.profileHoursPerDay, 10);
  assert.equal(backup.health.sedentary.exposureClass, 'high');
  assert.deepEqual(backup.health.sedentary.logs, []);
});

test('accepts the current +3 RIR notation', () => {
  const backup = validateBackup({
    version: 2,
    history: [
      {
        name: 'Workout',
        tasks: [
          {
            performedName: 'Press',
            completed: { reps: 8, rir: '+3' },
          },
        ],
      },
    ],
    active: null,
  });
  assert.equal(backup.history[0].tasks[0].completed.rir, '+3');
});

test('rejects executable strings in numeric performance fields', () => {
  assert.throws(
    () =>
      validateBackup({
        version: 2,
        active: null,
        history: [
          {
            id: 1,
            date: new Date().toISOString(),
            name: 'Workout',
            tasks: [
              {
                performedName: 'Press',
                completed: { weight: '<img src=x onerror=alert(1)>', reps: 8, rir: '1' },
              },
            ],
          },
        ],
      }),
    /backup/i,
  );
});

test('rejects an active workout without tasks', () => {
  assert.throws(
    () => validateBackup({ version: 2, history: [], active: { name: 'Broken', phase: 'lifting' } }),
    /backup/i,
  );
});

test('rejects an active workout with a negative task position', () => {
  assert.throws(
    () =>
      validateBackup({
        version: 2,
        history: [],
        active: { name: 'Workout', phase: 'lifting', pos: -1, tasks: [] },
      }),
    /backup/i,
  );
});

test('defaults missing and invalid weekly goals to four', () => {
  assert.equal(validateBackup({ version: 2, history: [], active: null }).settings.weeklyGoal, 4);
  assert.equal(
    validateBackup({ version: 2, settings: { weeklyGoal: 9 }, history: [], active: null }).settings
      .weeklyGoal,
    4,
  );
});

test('preserves valid weekly goals', () => {
  assert.equal(
    validateBackup({ version: 2, settings: { weeklyGoal: 6 }, history: [], active: null }).settings
      .weeklyGoal,
    6,
  );
});

test('removes legacy workout notes from imported backups', () => {
  const backup = validateBackup({
    version: 2,
    history: [{ name: 'Workout', note: '<p>legacy</p>', tasks: [] }],
    active: { name: 'Workout', phase: 'stretch', note: 'legacy', tasks: [], pos: 0 },
  });
  assert.equal('note' in backup.history[0], false);
  assert.equal('note' in backup.active, false);
});

test('migrates additive activity data and legacy plank sessions without losing sets', () => {
  const migrated = migrate({
    version: 2,
    history: [
      {
        name: 'Old workout',
        completedAt: '2026-09-08',
        tasks: [{ name: 'Press', completed: { reps: 8 } }],
      },
    ],
    active: {
      name: 'Old workout',
      phase: 'plank',
      timerEndsAt: 123,
      tasks: [{ name: 'Press', completed: null }],
      pos: 0,
    },
    health: { activities: [{ type: 'walk', completed: true, durationMinutes: 30 }] },
  });
  assert.equal(migrated.active.phase, 'lifting');
  assert.equal(migrated.active.timerEndsAt, null);
  assert.equal(migrated.history[0].tasks[0].completed.reps, 8);
  assert.equal(migrated.health.activities[0].type, 'walk');
});

test('migrate normalizes malformed history before render-facing consumers use it', () => {
  assert.deepEqual(migrate({ history: { broken: true } }).history, []);
});
