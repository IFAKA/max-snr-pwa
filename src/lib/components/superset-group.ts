/**
 * Superset members share one accent bar down the left edge of an exercise list instead of a
 * heading or a label on every row; `superset-start` and `superset-end` cap the bar where the
 * group begins and ends. `groups` holds each row's superset id, or nothing outside a superset.
 */
export function supersetRowClass(groups: ReadonlyArray<string | null | undefined>, index: number) {
  const group = groups[index];
  if (!group) return '';
  return [
    'superset-member',
    groups[index - 1] !== group && 'superset-start',
    groups[index + 1] !== group && 'superset-end',
  ]
    .filter(Boolean)
    .join(' ');
}
