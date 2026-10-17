// While a finger drags a workout screen up, the exercise drawer rises under it. `px` is how far
// it has come up; `settleMs` is the length of the release animation (0 while the finger is
// down); `handoff` tells the real drawer that opens afterwards to skip its slide-in.
export const drawerPeek = $state({ px: 0, settleMs: 0, handoff: false });

/** A fast flick settles quickly, a slow drag takes its time (like Base UI's swipe strength). */
export const settleDuration = (velocityPxPerMs: number) =>
  Math.round(Math.min(420, Math.max(160, 420 - velocityPxPerMs * 180)));
