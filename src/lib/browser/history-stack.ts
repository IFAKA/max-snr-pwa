/** The app's own record of the browser history entries it created, so it can go back to one. */
export interface HistoryStack {
  urls: string[];
  index: number;
}

export type HistoryMove =
  { kind: 'push' | 'replace'; url: string } | { kind: 'pop'; delta: number; url: string };

export function applyMove(stack: HistoryStack, move: HistoryMove): HistoryStack {
  if (move.kind === 'replace') {
    const urls = stack.urls.slice();
    urls[stack.index] = move.url;
    return { urls, index: stack.index };
  }
  if (move.kind !== 'pop') {
    const urls = stack.urls.slice(0, stack.index + 1).concat(move.url);
    return { urls, index: urls.length - 1 };
  }
  const index = stack.index + move.delta;
  // Back past the first entry the app knows of: start over from here.
  if (index < 0) return { urls: [move.url], index: 0 };
  const urls = stack.urls.slice();
  urls[index] = move.url;
  return { urls, index };
}

/** How many entries back the previous screen is if it is `url`, else 0. */
export function stepsBackTo(stack: HistoryStack, url: string) {
  return stack.index > 0 && stack.urls[stack.index - 1] === url ? 1 : 0;
}

/** How many entries back the first Today entry is (unwinding everything above it), else 0. */
export function stepsBackToToday(stack: HistoryStack) {
  const first = stack.urls.indexOf('/');
  return first >= 0 && first < stack.index ? stack.index - first : 0;
}
