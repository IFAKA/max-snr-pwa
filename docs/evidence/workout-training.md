# Workout body-health evidence and assumptions

Updated 2026-09-13. This is a programming record, not a claim that a formula can predict an individual's exact hypertrophy.

## Epistemic labels

**FACT / GUIDELINE** is a recommendation or result directly supported by a cited source. **ESTIMATE** is a provisional personal cost or measurement derived from available app data. **HEURISTIC** is a transparent prioritization rule. **ASSUMPTION** is a user or product prior. **UNKNOWN** is intentionally not filled with invented precision.

The app keeps resistance training, aerobic activity, daily movement, sedentary exposure, body measurements, and recovery as separate dimensions. It never collapses them into a biological 0–100 score, infers body-fat percentage from photos, or treats one noisy measurement as decisive.

## Evidence that changes the design

- Currier et al. (ACSM Position Stand, 2026, DOI [10.1249/MSS.0000000000003897](https://doi.org/10.1249/MSS.0000000000003897)) is an overview of reviews. It supports resistance training for hypertrophy and health, high effort, progressive loading, and training all major muscle groups. It does not identify one universally optimal weekly set number or frequency.
- Pelland et al. (2026, DOI [10.1007/s40279-025-02344-w](https://doi.org/10.1007/s40279-025-02344-w)) meta-regressed 67 studies / 2,058 participants and classified sets as direct or indirect. Its practical implication is a positive, diminishing volume relationship and that frequency is less decisive when volume is accounted for. Fractional accounting is a better model than forcing every compound set to be exactly zero or one direct set for each muscle. The estimates remain population averages with heterogeneous protocols.
- The 2025 superset systematic review/meta-analysis (DOI [10.1007/s40279-025-02176-8](https://doi.org/10.1007/s40279-025-02176-8)) found similar chronic hypertrophy and strength, with shorter sessions, but greater acute exertion. The app therefore pairs antagonist or low-interference work and keeps demanding compounds out of high-interference pairings.
- WHO's [Guidelines on Physical Activity and Sedentary Behaviour](https://www.who.int/publications/i/item/9789240015128) recommend 150–300 moderate minutes or 75–150 vigorous minutes weekly, plus muscle strengthening involving major muscle groups on at least two days. The guideline also supports reducing sedentary time; gym training does not erase ten seated hours.
- WHO also says adults with high sedentary exposure should do more than the recommended moderate-to-vigorous activity levels to help reduce detrimental effects, while recommending that sedentary time be limited and replaced with activity of any intensity. It does not establish a universal maximum sitting duration or magic interruption interval. The BMJ harmonised meta-analysis ([Ekelund et al. 2019](https://www.bmj.com/content/366/bmj.l4570)) supports a non-linear association between less sedentary time, more activity, and lower mortality risk, but observational associations do not justify an app-defined clinical cutoff.

The WHO guideline does not establish an exact safe sitting threshold, exact interruption interval, or exact amount of activity beyond the minimum for this individual. The app therefore treats the supplied approximately 10 hours/day as a high-exposure user prior, while any 45–60 minute reminder and 2–5 minute movement activity remain configurable behavioural heuristics.

## Programming assumptions

The routine is a configurable, evidence-constrained starting prior. It uses stable exercises, mostly 6–15 reps for compounds and 10–20 for isolations, generally 1–2 RIR, and longer rests for demanding compounds. Failure is reserved for selected final isolation sets as an option; it is not required for compounds. These are heuristics where the literature does not determine the user's exact dose.

Sedentary exposure is tracked as a separate health dimension: the current user prior is approximately 10 sitting hours/day and is labelled high exposure by profile assumption, not because 10 hours is treated as a clinical threshold. Logs can add daily sitting hours, longest uninterrupted sitting period, and movement interruptions. A reminder interval is a configurable behavioural implementation choice, not a research-proven safety boundary. The recommendation is to replace sitting with low-opportunity-cost movement and, when exposure is high, aim for more than minimum MVPA without inventing an exact above-minimum target.

The optimizer audit reports every prescribed set's raw marginal utility per modeled minute, alongside its direct and fractional muscle contributions. The final re-optimization retains two wrist-extension sets and four direct lat sets, retains four direct side-delt sets, and removes the fourth calf set because its marginal return per modeled minute is lower than the retained alternatives. The 41-set prescription starts from a 102-minute weekly gym-time prior (51 minutes per session at two visits). Completed workout durations update that prior with a bounded rolling-median blend; this is a personal time-estimate heuristic, not measured physiology.

The optimizer scores each candidate muscle allocation with `priority × diminishing-return value`. Individual-set analysis accounts for execution, rest, setup, and pairing costs; frequency comparison accounts for modeled time and visits. A set's indirect contribution is fractional and exercise-specific. Time estimates are planning estimates, not measured physiology.

## 2 vs 3 vs 4 days

The current starting frontier is two full-body gym days. Two days satisfy the two-day resistance baseline while minimizing visits; supersets keep each session near the existing 45–60 minute constraint. Sedentary exposure is deliberately excluded from the gym-day utility score: it is solved outside the gym, so adding sitting hours cannot make three or four lifting days look valuable. Three and four days could distribute the same work more comfortably, but add visits and transition costs without a strong independent hypertrophy advantage under volume control. The comparison is a transparent heuristic, not a mathematical proof. The adaptation engine can recommend reallocation or a different frequency if adherence, recovery, or progression data falsify this prior.

## What would change it

When enough recent observations exist, evaluate rolling performance, adherence, session time, recovery/pain notes, and current dose periodically. KEEP is the default. ADD one weekly set only for a priority muscle with adequate adherence and a flat rolling trend; REMOVE one when recovery or time cost is poor; REALLOCATE when another muscle has a better marginal-return case. Exercise replacement is not automatic, and a single noisy measurement never triggers a change. The evaluation cadence is a product heuristic, not a mandatory 4–8-week evidence claim.
