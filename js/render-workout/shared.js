import { app } from '../dom.js';
import { save } from '../storage.js';
import { getState } from '../state.js';

export const state = () => getState().active;
export function workoutStage({className = '', eyebrow, title, body = '', actions = ''}) {
  return `<section class="workout-stage ${className}" aria-labelledby="workout-title"><div class="stage-info"><p class="context-label">${eyebrow}</p><h1 id="workout-title">${title}</h1>${body}</div><div class="thumb-zone">${actions}</div></section>`;
}
export const primaryAction = (id, label, type = 'button') => `<button class="primary" id="${id}" type="${type}">${label}</button>`;
export function showError(error) { const message = error?.message || 'Something went wrong. Your latest change may not have been saved.'; let status = document.querySelector('#app-error'); if (!status) { status = document.createElement('p'); status.id = 'app-error'; status.className = 'notice error'; status.setAttribute('role', 'alert'); app.prepend(status); } status.textContent = message; }
export async function runAction(button, action, onSuccess = () => location.reload()) { if (button) button.disabled = true; try { const result = await action(); if (result !== false) onSuccess(result); else if (button) button.disabled = false; } catch (error) { if (button) button.disabled = false; showError(error); } }
export function mount(html) {
  app.innerHTML = html;
  const saveLater = document.querySelector('#save-later');
  if (saveLater) saveLater.onclick = () => runAction(saveLater, async () => { await save(); return true; }, () => location.assign('/'));
}
