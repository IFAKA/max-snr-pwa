// While a finger drags a workout screen up, the exercise drawer rises under it. `px` is how far
// it has come up; `handoff` tells the real drawer that opens on release to skip its slide-in.
export const drawerPeek = $state({ px: 0, handoff: false });
