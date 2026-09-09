import {
  mount,
  state,
  runAction,
  showError,
  workoutStage,
  primaryAction,
  stepperMarkup,
  bindHoldSteppers,
} from './shared.js';
import { save } from '../storage.js';
import { esc } from '../dom.js';
import { getState } from '../state.js';
import { activeTask, completeSet } from '../workout.js';

export function renderLifting() {
  const active = state(),
    task = activeTask();
  if (!task) return;
  const draft = active.draft || {};
  let step = new URLSearchParams(location.search).get('step') || 'reps';
  if (
    step === 'load' &&
    !Object.keys(draft).length &&
    active.tasks.some((item) => item.completed)
  ) {
    step = 'reps';
    history.replaceState(history.state, '', '/workout/?step=reps');
  }
  const repsValue = draft.reps ?? String(String(task.reps).split('–')[0]);
  const weightValue = draft.weight ?? '0';
  const stage = workoutStage({
    className: 'lifting-stage',
    title: esc(task.performedName),
    actions: '',
  });
  const unit = getState().settings?.unit || 'kg';
  const formMarkup = `<form class="thumb-zone" id="set-form"><p class="set-count">Set ${esc(task.set)} of ${esc(task.sets)}</p>${step === 'load' ? stepperMarkup('weight', `Load · ${unit}`, weightValue, -2.5, 2.5) : stepperMarkup('reps', 'Reps', repsValue, -1, 1)}<input id="reps" type="hidden" value="${esc(repsValue)}"><input id="weight" type="hidden" value="${esc(weightValue)}">${primaryAction('next-step', step === 'load' ? 'Log set' : 'Next', step === 'load' ? 'submit' : 'button')}</form>`;
  mount(stage.replace('<div class="thumb-zone"></div>', formMarkup));
  const weight = document.querySelector('#weight'),
    reps = document.querySelector('#reps'),
    form = document.querySelector('#set-form');
  if (!weight || !reps || !form)
    return showError(new Error('The set form could not be loaded. Reload the workout.'));
  const saveDraft = () => {
    active.draft.weight = weight.value;
    active.draft.reps = reps.value;
    save().catch(showError);
  };
  const changeValue = (button, multiplier = 1) => {
    const field = button.dataset.stepper === 'reps' ? reps : weight;
    const step = Number(button.dataset.step) * multiplier;
    const next = Math.max(
      button.dataset.stepper === 'reps' ? 1 : 0,
      Number(field.value || 0) + step,
    );
    field.value =
      button.dataset.stepper === 'reps'
        ? String(Math.round(next))
        : next.toFixed(2).replace(/\.00$/, '');
    document.querySelector(`#${button.dataset.stepper}-value`).textContent = field.value;
    saveDraft();
  };
  bindHoldSteppers(changeValue);
  document.querySelector('#next-step')?.addEventListener('click', (event) => {
    if (step !== 'load') {
      event.preventDefault();
      saveDraft();
      history.pushState({ route: 'workout' }, '', '/workout/?step=load');
      renderLifting();
    }
  });
  form.onsubmit = (event) =>
    runAction(event.submitter, async () => {
      event.preventDefault();
      saveDraft();
      const result = await completeSet();
      if (result?.error) {
        showError(new Error(result.error));
        return false;
      }
      return result;
    });
}
