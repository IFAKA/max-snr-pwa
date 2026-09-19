import {
  mount,
  state,
  runAction,
  showError,
  workoutStage,
  primaryAction,
  stepperMarkup,
  bindHoldSteppers,
  supersetMetadataMarkup,
} from './shared.js';
import { save } from '../storage.js';
import { esc } from '../dom.js';
import { getState } from '../state.js';
import {
  activeTask,
  completeSet,
  finishAtBudget,
  lastPerformance,
  lastExercisePerformances,
  recommendDoubleProgression,
  exerciseChangeAvailable,
  parseRirRange,
  sessionBudgetState,
  formatDuration,
} from '../workout.js';
import { navigateTo } from '../navigation.js';

const rirValue = (value) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.max(0, Math.min(3, number)) : 0;
};

const formatRir = (value) => (value >= 3 ? '+3' : String(value));
const defaultRir = (target, set, sets) => {
  const range = parseRirRange(target);
  return set === sets ? (range.lower ?? 1) : (range.upper ?? 1);
};
const nextTask = (active) =>
  active.tasks.find(
    (candidate, index) => index > active.pos && !candidate.completed && !candidate.skipped,
  ) || active.tasks.find((candidate) => !candidate.completed && !candidate.skipped);

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
  const unit = getState().settings?.unit || 'kg';
  const previous = lastPerformance(task.performedName, unit, task.exerciseId);
  const previousSets = lastExercisePerformances(task.exerciseId, unit);
  const recommendation = recommendDoubleProgression({
    load: previous?.weight,
    performances: previousSets,
    prescribedSets: task.workingSets || task.sets,
    targetRepRange: task.targetRepRange || task.reps,
    targetRir: task.targetRir || task.rir,
  });
  const recommendedLoad =
    recommendation.action === 'increase-load' ? recommendation.load : previous?.weight;
  const weightValue = draft.weight ?? recommendedLoad ?? '';
  const progressionNote =
    recommendation.action === 'increase-load'
      ? `<p class="progression-note">Progression: try ${esc(recommendation.load)} ${esc(unit)} this exposure.</p>`
      : '';
  const currentRir = rirValue(
    draft.rir ?? previous?.rir ?? defaultRir(task.targetRir || task.rir, task.set, task.sets),
  );
  const next = nextTask(active);
  const budget = sessionBudgetState(active);
  const budgetAction =
    budget.capReached &&
    active.tasks.some((item) => item.cutPriority && !item.completed && !item.skipped)
      ? primaryAction('cut-optional', 'Cut optional accessories')
      : '';
  const budgetNote = `<p class="session-budget${budget.capReached ? ' is-at-cap' : ''}"><span>Session <time id="session-elapsed">${formatDuration(budget.elapsedMs)}</time></span>${budget.capReached ? ' · 60:00 reached' : ''}</p>`;
  const supersetMetadata = supersetMetadataMarkup(active, task);
  const stage = workoutStage({
    className: 'lifting-stage',
    title: esc(task.performedName),
    body: `${supersetMetadata}<p class="set-count">Set ${esc(task.set)} of ${esc(task.sets)}</p><p class="target-prescription">Target: ${esc(task.targetRepRange || task.reps)} reps · ${esc(task.targetRir || task.rir)} RIR</p><p class="previous-performance">Previous: ${previous ? `${esc(previous.weight ?? 'bodyweight')} ${esc(previous.unit || unit)} × ${esc(previous.reps)} @ ${esc(previous.rir ?? '—')} RIR` : 'No logged set'}</p>${progressionNote}${next ? `<p class="next-exercise">Next: ${esc(next.performedName)} · set ${esc(next.set)} of ${esc(next.sets)}</p>` : '<p class="next-exercise">Last planned set</p>'}${budgetNote}`,
    actions: budgetAction,
  });
  const changeExercise =
    task.set === 1
      ? `<button class="secondary" id="change-exercise" type="button"${exerciseChangeAvailable(active) ? '' : ' disabled'}>Change exercise</button>`
      : '';
  const formMarkup = `<form id="set-form">${step === 'load' ? `${stepperMarkup('weight', `Load · ${unit}`, weightValue, -2.5, 2.5)}${stepperMarkup('rir', 'RIR', formatRir(currentRir), -1, 1)}` : stepperMarkup('reps', 'Reps', repsValue, -1, 1)}<input id="rir" type="hidden" value="${formatRir(currentRir)}"><input id="reps" type="hidden" value="${esc(repsValue)}"><input id="weight" type="hidden" value="${esc(weightValue)}">${primaryAction('next-step', step === 'load' ? 'Log set' : 'Next', step === 'load' ? 'submit' : 'button')}${budgetAction}${changeExercise}</form>`;
  mount(
    stage.replace('<div class="thumb-zone"></div>', `<div class="thumb-zone">${formMarkup}</div>`),
  );
  const elapsed = document.querySelector('#session-elapsed');
  const tick = () => {
    if (!elapsed || !document.body.contains(elapsed) || !state()) return;
    const currentBudget = sessionBudgetState(state());
    elapsed.textContent = formatDuration(currentBudget.elapsedMs);
    const note = document.querySelector('.session-budget');
    if (note) note.classList.toggle('is-at-cap', currentBudget.capReached);
  };
  const clock = setInterval(tick, 1000);
  setTimeout(() => clearInterval(clock), 2 * 60 * 60 * 1000);
  const weight = document.querySelector('#weight'),
    reps = document.querySelector('#reps'),
    form = document.querySelector('#set-form');
  if (!weight || !reps || !form)
    return showError(new Error('The set form could not be loaded. Reload the workout.'));
  const saveDraft = () => {
    active.draft.weight = weight.value;
    active.draft.reps = reps.value;
    const rir = document.querySelector('#rir');
    if (rir) active.draft.rir = rir.value;
    save().catch(showError);
  };
  const changeValue = (button, multiplier = 1) => {
    const stepper = button.dataset.stepper;
    const field =
      stepper === 'reps' ? reps : stepper === 'rir' ? document.querySelector('#rir') : weight;
    const step = Number(button.dataset.step) * multiplier;
    const maximum = stepper === 'rir' ? 3 : Number.POSITIVE_INFINITY;
    const next = Math.max(stepper === 'reps' ? 1 : 0, Number(field.value || 0) + step);
    const bounded = Math.min(maximum, next);
    field.value =
      stepper === 'reps'
        ? String(Math.round(bounded))
        : stepper === 'rir'
          ? formatRir(Math.round(bounded))
          : bounded.toFixed(2).replace(/\.00$/, '');
    document.querySelector(`#${stepper}-value`).textContent = field.value;
    saveDraft();
  };
  bindHoldSteppers(changeValue);
  document
    .querySelector('#cut-optional')
    ?.addEventListener('click', (event) =>
      runAction(event.currentTarget, finishAtBudget, () => location.reload()),
    );
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
  document
    .querySelector('#change-exercise')
    ?.addEventListener('click', () => navigateTo('/workout/?view=exercises'));
}
