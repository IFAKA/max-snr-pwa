export const emptyState = () => ({version: 2, history: [], active: null, settings: {unit: 'kg'}, updatedAt: 0});
let state = emptyState();
export const getState = () => state;
export const setState = next => { state = next; return state; };
