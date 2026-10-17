import { browser } from '$app/env';
import { loadState } from '#lib/storage/persistence.ts';

// All data lives on the device, so pages render in the browser from IndexedDB/localStorage.
// Prerendering emits one static shell per route; trailing slashes keep /workout/ and /history/.
export const ssr = false;
export const prerender = true;
export const trailingSlash = 'always';

let loaded: Promise<string> | undefined;

// State loads once per document; later navigations reuse the in-memory state.
export async function load() {
  if (!browser) return { bootError: '' };
  loaded ||= loadState().then(
    () => '',
    (error: Error) => error?.message || 'Reload the app and try again.',
  );
  return { bootError: await loaded };
}
