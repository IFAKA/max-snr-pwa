// Bridges the framework-free domain state to Svelte. Domain functions mutate the plain state
// object and persist it; screens re-derive their view models whenever `refresh()` runs.
let version = $state(0);
let error = $state('');

export const appVersion = {
  get value() {
    return version;
  },
};

export const appError = {
  get message() {
    return error;
  },
  clear() {
    error = '';
  },
};

export const refresh = () => {
  version++;
};

export function showError(cause: unknown) {
  error =
    (cause as Error)?.message ||
    'Something went wrong. Your latest change may not have been saved.';
}

/** Runs a domain action, reports failures, and refreshes every derived view. */
export async function act<T>(action: () => Promise<T> | T): Promise<T | undefined> {
  try {
    error = '';
    return await action();
  } catch (cause) {
    showError(cause);
    return undefined;
  } finally {
    refresh();
  }
}
