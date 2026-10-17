export const dayNow = (now = new Date()) =>
  new Intl.DateTimeFormat('en', { weekday: 'long' }).format(now);

export function localDateKey(value: Date | string | number | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? '');
  if (Number.isNaN(date.getTime())) return '';
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
}

export function isCurrentDayComplete(
  history: Array<{ day: string; completedAt?: string }>,
  day: string,
  now = new Date(),
) {
  const today = localDateKey(now);
  return history.some(
    (workout) => workout.day === day && localDateKey(workout.completedAt) === today,
  );
}
