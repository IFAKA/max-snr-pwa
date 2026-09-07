# Rest Next-Task Preview and Switching

## Goal

Make rest state communicate exactly what will begin when rest ends, while only allowing exercise changes after an exercise has finished.

## Design

- Compare the current task with the queued `nextPos` task.
- When both tasks belong to the same exercise, label the rest preview `Next set` and lock exercise choices.
- When they belong to different exercises, label the preview `Next exercise` and allow choosing another unfinished exercise. The choice updates `nextPos` without changing the timer.
- Keep lifting selection available before the current exercise has any completed set, then lock it after the first set is logged.
- Enforce the same rules in session actions as in the rendered menu.

## Validation

Cover same-exercise rest locking and finished-exercise rest switching in session tests, then run all tests, JavaScript syntax checks, `git diff --check`, and local route smoke tests before deployment.
