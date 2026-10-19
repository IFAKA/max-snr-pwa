export type RouteName = 'today' | 'routine' | 'history' | 'workout';

export function routeName(pathname: string): RouteName {
  const segment = pathname.split('/').filter(Boolean)[0];
  return segment === 'routine' || segment === 'history' || segment === 'workout'
    ? segment
    : 'today';
}

/** The screen that browser/Android back should return to from a deep link. */
export function parentRouteUrl(
  route: RouteName,
  params: Pick<URLSearchParams, 'get' | 'has'>,
  hasActiveWorkout: boolean,
) {
  if (route === 'routine' && params.has('day')) return '/routine/';
  if (route === 'history' && params.get('view') === 'workout') return '/history/';
  if (route === 'history' && params.get('view') === 'data') return '/';
  if (route === 'history' && params.get('view') === 'checkin') return '/history/?view=measurements';
  if (route === 'history' && params.get('view')) return '/history/';
  if (route === 'workout' && params.has('day') && !hasActiveWorkout)
    return `/routine/?day=${encodeURIComponent(params.get('day') as string)}`;
  if (route === 'workout' && params.get('view') === 'exercises') return '/workout/';
  return '/';
}

export const completionUrl = (id: number) => `/workout/?view=summary&id=${id}`;
