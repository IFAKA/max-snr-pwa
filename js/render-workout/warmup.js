import { state, showError } from './shared.js';
import { beginLifting } from '../workout.js';

export function renderWarmup() {
  if (!state()) return;
  void beginLifting().then(() => location.reload()).catch(showError);
}
