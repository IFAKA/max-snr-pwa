import { beforeEach, describe, expect, test } from 'vitest';
import { analyticsModel } from '../src/lib/history/analytics-model.ts';
import { emptyState } from '../src/lib/state.ts';

describe('measurement changes', () => {
  let state: ReturnType<typeof emptyState>;
  beforeEach(() => {
    state = emptyState();
  });

  test('no check-ins show no rows', () => {
    expect(analyticsModel(state).measurementTrend).toBeNull();
  });

  test('the latest value comes with units and the change since the previous and first check-in', () => {
    state.health.measurements.push(
      { date: '2026-09-01T10:00:00Z', waist: 85 },
      { date: '2026-10-01T10:00:00Z', waist: 84, weight: 80 },
      { date: '2026-10-12T10:00:00Z', waist: 82.5 },
    );
    const rows = analyticsModel(state).measurementTrend ?? [];
    const waist = rows.find((row) => row.label === 'Waist');
    expect(waist?.value).toBe('82.5 cm');
    expect(waist?.note).toContain('−1.5 since');
    expect(waist?.note).toContain('−2.5 since');
    expect(rows.find((row) => row.label === 'Weight')?.note).toContain('First check-in');
  });
});
