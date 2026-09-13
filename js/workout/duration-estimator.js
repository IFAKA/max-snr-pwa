const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};

export function robustDurationEstimate(priorMinutes, observations = []) {
  const valid = observations.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!valid.length) return priorMinutes;
  const observed = median(valid.slice(-6));
  const weight = Math.min(0.75, 0.25 + valid.length * 0.1);
  return clamp(
    priorMinutes * (1 - weight) + observed * weight,
    priorMinutes * 0.5,
    priorMinutes * 1.75,
  );
}

const durationFromRecord = (record) => {
  if (Number.isFinite(record?.durationMs) && record.durationMs > 0)
    return record.durationMs / 60000;
  const start = Number.isFinite(record?.startedAt)
    ? record.startedAt
    : Date.parse(record?.startedAt || record?.date || '');
  const end = Date.parse(record?.completedAt || '');
  return Number.isFinite(start) && Number.isFinite(end) && end >= start
    ? (end - start) / 60000
    : null;
};

export function activityDurationEstimate(state, type, priorMinutes) {
  const observations = (state?.health?.activities || [])
    .filter((activity) => activity.type === type && activity.completed !== false)
    .map(durationFromRecord)
    .filter((value) => value !== null);
  return robustDurationEstimate(priorMinutes, observations);
}

export function routineDurationEstimate(state, priorMinutes = 51) {
  const observations = (state?.history || [])
    .filter((workout) => workout.completed !== false)
    .map(durationFromRecord)
    .filter((value) => value !== null);
  return robustDurationEstimate(priorMinutes, observations);
}
