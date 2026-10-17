import type { MinutesEntry } from '../types.ts';

export function moderateEquivalentMinutes(minutes: unknown, intensity = 'moderate') {
  const value = Number(minutes || 0);
  return value * (intensity === 'vigorous' ? 2 : 1);
}

export function legacyCardioEquivalentMinutes(
  entries: MinutesEntry[] = [],
  inRange: (date: string) => boolean = () => true,
) {
  return entries
    .filter((entry) => inRange(entry.date))
    .reduce((sum, entry) => sum + moderateEquivalentMinutes(entry.minutes, entry.intensity), 0);
}
