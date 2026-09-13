# Max-SNR training evidence and assumptions

Updated 2026-09-13. This is a programming record, not a claim that a formula can predict an individual's exact hypertrophy.

## Evidence that changes the design

- Currier et al. (ACSM Position Stand, 2026, DOI [10.1249/MSS.0000000000003897](https://doi.org/10.1249/MSS.0000000000003897)) is an overview of reviews. It supports resistance training for hypertrophy and health, high effort, progressive loading, and training all major muscle groups. It does not identify one universally optimal weekly set number or frequency.
- Pelland et al. (2026, DOI [10.1007/s40279-025-02344-w](https://doi.org/10.1007/s40279-025-02344-w)) meta-regressed 67 studies / 2,058 participants and classified sets as direct or indirect. Its practical implication is a positive, diminishing volume relationship and that frequency is less decisive when volume is accounted for. Fractional accounting is a better model than forcing every compound set to be exactly zero or one direct set for each muscle. The estimates remain population averages with heterogeneous protocols.
- The 2025 superset systematic review/meta-analysis (DOI [10.1007/s40279-025-02176-8](https://doi.org/10.1007/s40279-025-02176-8)) found similar chronic hypertrophy and strength, with shorter sessions, but greater acute exertion. The app therefore pairs antagonist or low-interference work and keeps demanding compounds out of high-interference pairings.
- WHO's [Guidelines on Physical Activity and Sedentary Behaviour](https://www.who.int/publications/i/item/9789240015128) recommend 150–300 moderate minutes or 75–150 vigorous minutes weekly, plus muscle strengthening involving major muscle groups on at least two days. The guideline also supports reducing sedentary time; gym training does not erase ten seated hours.

## Programming assumptions

The routine is a configurable, evidence-constrained starting prior. It uses stable exercises, mostly 6–15 reps for compounds and 10–20 for isolations, generally 1–2 RIR, and longer rests for demanding compounds. Failure is reserved for selected final isolation sets as an option; it is not required for compounds. These are heuristics where the literature does not determine the user's exact dose.

The optimizer scores each candidate muscle allocation with `priority × diminishing-return value`, subtracts time, visit, setup, redundancy, and fatigue costs, and enforces minimum coverage for chest, back, shoulders, arms, trunk, quads, posterior chain, and calves. A set's indirect contribution is fractional and exercise-specific. Time estimates are planning estimates, not measured physiology.

## 2 vs 3 vs 4 days

The current starting frontier is two full-body gym days. Two days satisfy the two-day resistance baseline while minimizing visits; supersets keep each session near the existing 45–60 minute constraint. Three and four days could distribute the same work more comfortably, but add visits and transition costs without a strong independent hypertrophy advantage under volume control. The comparison is a transparent heuristic, not a mathematical proof. The adaptation engine can recommend reallocation or a different frequency if adherence, recovery, or progression data falsify this prior.

## What would change it

Every 4–8 weeks, use rolling performance, adherence, session time, recovery/pain notes, and body-measurement trends. KEEP is the default. ADD one weekly set only for a priority muscle with adequate adherence and a flat rolling trend; REMOVE one when recovery or time cost is poor; REALLOCATE when another muscle has a better marginal-return case; change an exercise only for a documented reason. A single noisy measurement never triggers a change.
