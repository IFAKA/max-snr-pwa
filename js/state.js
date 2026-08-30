export const emptyState = () => ({version: 2, history: [], active: null});
let state = emptyState();
export const getState = () => state;
export const setState = next => { state = next; return state; };
