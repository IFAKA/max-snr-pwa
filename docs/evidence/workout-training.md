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

## Active program: fixed 3-day Monday/Wednesday/Friday

The optimizer's cost-only comparison above still favors two visits. The active program is nevertheless a user-chosen fixed three-day routine (`fixed-hypertrophy-3-day-v3`): Full body A, Upper body B, Full body C. This is a goal-priority ASSUMPTION, not an optimizer result: the user wants visible-when-clothed size (shoulders, lats, arms, forearms, obliques), with legs at a balance dose. The program is 66 base sets (22 a day) plus the personalization below; for the default profile it is 72 sets, 24/24/24. Weekly allocation: lateral raise 12, incline press 7, pulldown 7, row 2, overhead triceps 10, curl 6, hammer curl 5, reverse fly 3, crunch 4, woodchop 3, leg press 4, leg curl 3, calves 2, neck 2 + 2. There is no shrug. Overhead triceps and curl are an antagonist superset every day. Every priority muscle is directly trained on at least two days.

Why upper-body-heavy (what the evidence does and does not say):

- FACT: Sell, Lukaszewski & Townsley 2017 (Proc R Soc B, DOI [10.1098/rspb.2017.1819](https://doi.org/10.1098/rspb.2017.1819)) found upper-body strength cues explain over 70% of male bodily attractiveness ratings, with no ceiling in the range studied.
- FACT: Durkee et al. 2019 (Evolutionary Psychology, DOI [10.1177/1474704919852918](https://doi.org/10.1177/1474704919852918)): women ranked obliques first, glutes second and abdominals third among male muscles; lower-body muscles other than glutes were mostly not rated important; men overestimated the size women prefer. Hence the added woodchop (obliques) and crunch volume, and legs kept at maintenance-to-balance dose rather than cut to zero (leg work still serves health, see above).
- FACT: Maeo et al. 2023 (Eur J Sport Sci, DOI [10.1080/17461391.2022.2100279](https://doi.org/10.1080/17461391.2022.2100279)): overhead triceps extension produced about 1.4 times the triceps growth of pushdowns, so the triceps slot is the overhead extension and it carries the most arm volume.
- ASSUMPTION: a shoulder-to-waist ratio plateau near 1.6 comes from secondary sources and is used only as a direction for the shoulder target.
- HEURISTIC: hammer curl is modelled as forearms primary (1) with partial biceps (0.5) for brachialis and brachioradialis; woodchop as obliques primary with a quarter set of abs. Obliques get a priority weight of 1.15, equal to abs.

Waist reduction (fat loss) is likely the largest lever on how the shoulders look, but it is an outcome, not a set rule, so the program only reads the waist measurement as an input.

Reverse cable fly covers rear delts (about 0.45 fractional sets a week from other lifts otherwise). The coordinator never auto-switches a fixed program (`KEEP`, "The fixed program is canonical."). Existing installs on v1 or v2 are rebuilt once on load; history is kept and new exercises start without history. Falsifiers: flat rolling performance on priority lifts, session time above the time cap, or poor adherence. Any of these should lead to revising the program, not to silent adaptation.

## Personalization from body measurements

The fixed program is adjusted from the user's stored tape measurements (`src/lib/workout/personalization.ts`). Rule: `deficit = (target − measured) / target`; every 0.1 of deficit adds one weekly set (max +3) to the exercises that drive that measurement. Priority exercises (lateral raise, incline press, curl, overhead triceps, hammer curl) only ever gain sets: being at or above a target never cuts them. Only non-priority work (calves) is trimmed by 2 sets when within 2% of target and at least 6 sets remain. Added sets go to the shortest session containing the exercise (cap 24 sets).

- Shoulders → lateral raise. Target is 1.6 × the measured waist; with no waist reading, height × 0.43 × 1.6.
- Chest (0.58 × height) → incline press.
- Arms (biceps, 0.215 × height): overhead triceps gets the full set delta and curl half of it rounded down (2:1 toward triceps).
- Forearms (optional, 0.17 × height) → hammer curl. Skipped when forearms are not measured.
- Calves (0.215 × height) → calf raise.

Targets are ASSUMPTIONS that set the direction of the adjustment, not a proven optimum. Tape error is about ±1–2 cm and arm measurement conditions are not recorded. The program is recomputed whenever the profile measurements (including waist and forearms) change; history is untouched.

For the 172 cm / 79 waist / 111 shoulders / 92 chest / 28.5 arm / 26 forearm / 36 calves profile the deficits are shoulders 0.122, chest 0.078, arm 0.229, forearm 0.111, calves 0.027, giving lateral raise +1, incline press +1, triceps +2, curl +1, hammer curl +1, calves 0; sessions 24/24/24. Falsifier: if re-measurement after 4–6 weeks shows the arms or chest not moving while other measures do, revise the volume rather than trusting the target.

## What would change it

When enough recent observations exist, evaluate rolling performance, adherence, session time, recovery/pain notes, and current dose periodically. KEEP is the default. ADD one weekly set only for a priority muscle with adequate adherence and a flat rolling trend; REMOVE one when recovery or time cost is poor; REALLOCATE when another muscle has a better marginal-return case. Exercise replacement is not automatic, and a single noisy measurement never triggers a change. The evaluation cadence is a product heuristic, not a mandatory 4–8-week evidence claim.
