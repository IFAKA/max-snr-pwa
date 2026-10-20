<script lang="ts">
  import '../styles/app.css';
  import { onMount, tick, type Snippet } from 'svelte';
  import { afterNavigate, goto, onNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { getState } from '#lib/state.ts';
  import { routeName } from '#lib/browser/routes.ts';
  import { deepLinkAncestors } from '#lib/browser/route-history.ts';
  import { keepAwake, releaseWakeLock } from '#lib/browser/device.ts';
  import { routeTransition } from '#lib/browser/route-transition.ts';
  import { registerServiceWorker } from '#lib/browser/app-update.svelte.ts';
  import { nativeApp, onNativeAction, syncNativeStatus } from '#lib/browser/native-app.ts';
  import { liveStatus, runNativeAction } from '#lib/workout-screens/live-status.ts';
  import { appError, appVersion } from '#lib/app-state.svelte.ts';
  import ErrorNotice from '#lib/components/ErrorNotice.svelte';

  let { children, data }: { children: Snippet; data: { bootError: string } } = $props();

  const TITLES = {
    today: 'Workout',
    routine: 'Routine · Workout',
    history: 'History · Workout',
    workout: 'Workout',
  };
  const route = $derived(routeName(page.url.pathname));

  $effect(() => {
    document.body.dataset.route = route;
    document.body.classList.toggle('workout', route === 'workout');
    if (route === 'workout') void keepAwake();
    else void releaseWakeLock();
  });

  // In the Android app, keep the lock-screen status, countdown and end alarm in step with the
  // workout, and run its buttons; a set logged there leaves any detail view for the main step.
  $effect(() => {
    void appVersion.value;
    syncNativeStatus(liveStatus(getState()));
  });
  onNativeAction(async (action) => {
    const done = await runNativeAction(action);
    if (done && page.url.pathname === '/workout/' && page.url.search)
      await goto('/workout/', { replace: true });
  });

  // Screens render only after the history fix-up for deep links, so their own redirects
  // (e.g. saving a legacy workout) cannot race it.
  let ready = $state(false);

  onMount(() => {
    // The Android app ships its files in the APK; only the web app updates through /sw.js.
    if (!nativeApp) registerServiceWorker();
    const current = `${page.url.pathname}${page.url.search}`;
    const ancestors = deepLinkAncestors(
      new URL(page.url.href),
      Boolean(getState().active),
      document.referrer,
    );
    if (!ancestors.length) {
      ready = true;
      return;
    }
    const [root, ...rest] = ancestors;
    void rest
      .concat(current)
      .reduce((chain, url) => chain.then(() => goto(url)), goto(root, { replace: true }))
      .finally(() => (ready = true));
  });

  onNavigate((navigation) => {
    appError.clear();
    return ready ? routeTransition(navigation) : undefined;
  });

  // Move focus to the new screen's heading so screen readers and keyboards land on the content.
  afterNavigate(async ({ type }) => {
    if (type === 'enter') return;
    await tick();
    const heading = document.querySelector<HTMLElement>('main h1, main h2');
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
  });
</script>

<svelte:head>
  <title>{TITLES[route]}</title>
</svelte:head>

<main id="app">
  {#if data.bootError}
    <section aria-labelledby="boot-error-title">
      <h1 id="boot-error-title" class="app-title">Workout could not start</h1>
      <p>{data.bootError}</p>
    </section>
  {:else if ready}
    <ErrorNotice />
    {@render children()}
  {/if}
</main>
