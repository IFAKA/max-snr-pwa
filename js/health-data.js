export const measurementFields = [
  'weight',
  'waist',
  'shoulders',
  'chest',
  'arms',
  'forearms',
  'thighs',
  'calves',
];

export function recordMeasurement(state, values) {
  const filled = Object.fromEntries(
    measurementFields
      .map((key) => [key, values[key]])
      .filter(
        ([, value]) =>
          value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)),
      ),
  );
  if (!Object.keys(filled).length) return false;
  state.health.measurements.push({
    date: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(filled).map(([key, value]) => [key, Number(value)])),
  });
  return true;
}
