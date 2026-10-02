import { mount, runAction, state, workoutStage, primaryAction } from './shared.js';
import { finishWorkout, formatDuration, lastExercisePerformances } from '../workout.js';
import { getState } from '../state.js';
import { esc, listMarkup } from '../dom.js';
import { navigateTo } from '../navigation.js';

function improvementCallouts(active, unit) {
  const seen = new Set();
  const callouts = [];
  active.tasks.forEach((task) => {
    if (!task.completed || seen.has(task.exerciseId)) return;
    const previousSets = lastExercisePerformances(task.exerciseId, unit);
    const previous = previousSets[task.set - 1];
    if (!previous) return;
    const loadGain =
      task.completed.weight !== undefined &&
      previous.weight !== undefined &&
      task.completed.weight > previous.weight
        ? Number((task.completed.weight - previous.weight).toFixed(2))
        : 0;
    const repGain =
      Number(task.completed.reps) > Number(previous.reps) ? task.completed.reps - previous.reps : 0;
    if (!loadGain && !repGain) return;
    seen.add(task.exerciseId);
    const gain = loadGain ? `+${loadGain} ${unit}` : `+${repGain} rep${repGain === 1 ? '' : 's'}`;
    callouts.push(`${task.performedName}: ${gain}`);
  });
  return callouts;
}

export function renderCompletion() {
  const active = state();
  const unit = getState().settings?.unit || 'kg';
  const completedCount = active.tasks.filter((task) => task.completed).length;
  const skippedCount = active.tasks.filter((task) => task.skipped).length;
  const callouts = improvementCallouts(active, unit);
  const body = [
    `<p class="set-count">${formatDuration(Date.now() - active.startedAt)} · ${completedCount} sets completed${skippedCount ? ` · ${skippedCount} skipped` : ''}</p>`,
    callouts.length
      ? listMarkup(
          callouts.map((line) => `<li><div class="list-link"><span>${esc(line)}</span></div></li>`),
          '',
          'Improvements Since Last Session',
        )
      : '',
  ].join('');
  mount(
    workoutStage({
      title: active.name,
      body,
      actions: primaryAction('finish', 'Save Workout'),
    }),
  );
  document
    .querySelector('#finish')
    ?.addEventListener('click', (event) =>
      runAction(event.currentTarget, finishWorkout, () =>
        navigateTo(`/?completed=1&day=${encodeURIComponent(active.day)}`),
      ),
    );
}
