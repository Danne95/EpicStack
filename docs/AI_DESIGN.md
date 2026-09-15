# AI design

## Goals and boundaries

The computer is a consumer of the same legal engine moves as a human. Given a drawn brick,
evaluate every legal replacement, compare scores, and select a move. Keep components numeric,
small, and explainable. Shared AI has no UI or platform dependencies.

Stage 2 introduced the baseline, retained as Medium. Stage 3 adds Easy, Hard, and Expert,
with configuration-driven weights, range reasoning, decision spread, and bounded forecasting.
All levels score legal placements and return the choice with its numeric explanation.
These are understandable heuristics with reproducible comparison tests, not formally calibrated
ratings or a claim of optimal play.

Stage 1 confirmed fresh rolls on every turn: each of the eighty values absent from both
towers is equally likely. Removed values are immediately eligible again. There is no finite
future deck, depletion, or permanently unavailable discard set. Future probability scoring
must use this model. `getLegalPlacements` exposes legal choices to humans and AI alike.

## Scoring model

```text
score = neighbourFit      × neighbourFitWeight
      + orderImprovement  × orderWeight
      + positionQuality   × positionWeight
      + futureFlexibility × flexibilityWeight
      - deadEndRisk       × deadEndWeight
      + expectedProgress  × futureProgressWeight
```

| Component                | Intended meaning                                                             |
| ------------------------ | ---------------------------------------------------------------------------- |
| Immediate neighbour fit  | Does the placed brick fit between its immediate neighbours?                  |
| Ordering improvement     | How much does the move improve the tower's current ascending structure?      |
| Position suitability     | Is the number appropriate for its depth in a ten-position tower?             |
| Future flexibility       | How much viable numeric space remains for other positions?                   |
| Dead-end risk            | Does the move leave too few usable numbers for the positions that need them? |
| Expected future progress | How likely are future draws to help, using permitted information?            |

Do not put all calculations in one `chooseMove` function. `scoring.ts` supplies focused
components; `evaluator.ts` combines them and compares legal candidates. Model winning moves
explicitly so a heuristic cannot overlook an immediate victory.

## Implemented scoring functions

All scoring functions consume valid ten-brick towers produced by the engine. Let `before`
be the current tower, `after` a candidate tower, `p` its replaced position (0–9), and `A`
the eighty values absent from **both candidate towers after replacement**. The removed brick
is back in `A`; the placed brick is excluded. `getAvailableBricks` in the engine builds this
same pool for both actual rolls and AI estimates. Discard history does not reserve values.

1. **Neighbour fit — `scoreNeighbourFit(after, p)`**
   Count the existing neighbours that fit the placed value: above < placed and placed < below.
   Divide by the number of existing neighbours (one at the edges, two inside). Range `[0, 1]`.
   Missing edge neighbours provide neither a bonus nor a penalty.
2. **Ordering improvement — `scoreOrderImprovement(before, after)`**
   Let `O(t)` count ascending adjacent pairs in tower `t`. Return `(O(after) - O(before)) / 9`.
   Range `[-1, 1]`; a legal one-brick replacement changes at most two pairs. Negative scores
   explicitly penalize breaking established order. This is adjacent order, not a longest
   increasing subsequence or a claim about the minimum number of remaining moves.
3. **Position quality — `scorePositionQuality(after)`**
   Divide the 100-value range into ten bands of width 10 with centres `c(i) = 5.5 + 10i`.
   For each brick `x` at position `i`, compute `max(0, 1 - abs(x - c(i)) / 10)`; average over
   all ten positions. Range `[0, 1]` (maximum `0.95` for integer bricks). Evaluating the whole
   candidate tower accounts for the useful brick a replacement removes. Bands are preferences,
   never legal restrictions: every strictly ascending tower still wins.
4. **Future flexibility — `scoreFutureFlexibility(after, A)`**
   For each position, count values in `A` that fit strictly between its existing neighbours,
   ignoring the missing neighbour at a tower edge. Sum these counts and divide by `10 * |A|`.
   Range `[0, 1]`. This is the mean fraction of useful local replacement space, not a global
   proof that the tower can be completed while keeping all its current bricks.
5. **Dead-end risk — `scoreDeadEndRisk(after)`**
   A brick `x` at position `i` needs `i` smaller values above and `9-i` larger values below.
   Its numeric shortage is `max(0, i - (x-1)) + max(0, (9-i) - (100-x))`.
   Sum over the ten bricks and divide by `10 * 9`. Range `[0, 1]`. This penalizes anchors such
   as 98, 99, 100 near the top: each leaves too few possible larger numbers beneath it.
   The baseline ignores pairwise anchor compatibility and temporary opponent occupation here;
   a risky anchor can still be replaced on a later turn. It is not a terminal game condition.
6. **Expected progress — `scoreExpectedProgress(after, A)`**
   Count values in `A` for which at least one placement increases `O(after)`; divide by `|A|`.
   Each value counts once even if several placements improve order. Only the two adjacent
   comparisons touched by a placement need checking. Range `[0, 1]`. An already ascending
   tower scores zero because no adjacent-order improvement remains; explicit win priority
   still makes it preferable to every non-winning move.

Flexibility and progress return zero for an empty supplied pool, though valid engine states
always supply eighty values. They use a static-board approximation: the opponent's intervening
move is not predicted. They describe hypothetical immediate roll opportunities, not the exact
distribution on the AI's next turn or a probability of eventually winning. Hard and Expert
replace some of these local components with the Stage 3 analysis described below.

## Baseline weights

`weights.ts` retains the frozen Stage 2 baseline used by Medium and combines any profile's
weights using the displayed signed sum. The following table explains the unchanged Medium values.

| Component            | Weight         | Reason                                                                                                                           |
| -------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Neighbour fit        | 1              | A modest immediate preference for fitting the selected slot.                                                                     |
| Ordering improvement | 3              | Each newly ordered pair contributes 1/3 point; broken pairs lose the same amount.                                                |
| Position quality     | 6              | Main long-term guide toward sensible number ranges; moving one badly placed brick near its band centre can add about 0.57 point. |
| Future flexibility   | 0.5            | Small preference for keeping usable local intervals, rather than preserving broad disorder.                                      |
| Dead-end risk        | 2 (subtracted) | Penalize numeric shortages while still allowing damaged anchors to be repaired later.                                            |
| Expected progress    | 0.25           | A small opportunity signal; a large weight could reward remaining unsorted simply because more improvements are possible.        |

The normalization constants come from game dimensions: 9 adjacent pairs, band width `100/10`,
and total anchor capacity `10*9`. There are no extra win bonuses or fuzzy tie tolerances.
Weights express one initial tradeoff, not a measured optimal strategy.

## Selection, public information, and API

- `evaluateMoves(state, playerId, profile?)` defaults to Medium and returns a `MoveEvaluation` for every position returned
  by the engine's `getLegalPlacements`, in its original order. Each record contains
  `position`, `wins`, `score`, and all six `components`.
- Candidates are produced using the real `replaceBrick` operation. AI never implements its
  own replacement, discard, or victory rules. Candidate snapshots are discarded after scoring.
- `chooseMove(state, playerId, { profile?, random? }?)` returns a chosen evaluation, or `null` if the player cannot
  currently place a brick (wrong player, wrong phase, or completed game).
- Best-move ranking is lexicographic: immediate win first, then higher weighted score, then
  lowest position for an exact tie. Every level always takes a win. Non-winning choices can
  use the profile's decision spread as described below.
- Evaluation consumes no randomness and never mutates state. Medium, Hard, and Expert selection
  is also deterministic without randomness. The controller must explicitly apply the returned position
  with `replaceBrick`, and call `endTurn` only if that move did not win.
- Information used is the acting player, turn phase, drawn value, both towers, and terminal
  status. Both towers are the visible board described in the planned game screen. Discard
  history, initial unused deck entries, and future random inputs do not influence decisions.

Evaluation never reads timers, uses a network, or simulates the opponent's strategy. Expert's
bounded one-roll projection and measured runtime are documented below.

## Difficulty profiles (Stage 3)

The implemented data model in `difficulty.ts` is:

```ts
interface DifficultyProfile {
  readonly weights: Readonly<ScoreComponents>;
  readonly rangeAwareness: number;
  readonly decisionSpread: number;
  readonly forecastRollCount: number;
}
```

`DIFFICULTY_PROFILES` is a frozen record keyed by `easy`, `medium`, `hard`, and `expert`.
Profiles and their nested weight objects are frozen. Callers may also supply a valid custom
profile; evaluation never branches on a difficulty name. The default is Medium for backward
compatibility. There is no unused `searchDepth` field: forecasting has one explicit horizon
and a bounded number of roll values to examine.

| Control / weight         | Easy | Medium | Hard | Expert |
| ------------------------ | ---- | ------ | ---- | ------ |
| neighbourFit             | 2    | 1      | 0.5  | 0.5    |
| orderImprovement         | 3    | 3      | 3    | 3      |
| positionQuality          | 2    | 6      | 5    | 5      |
| futureFlexibility        | 0    | 0.5    | 1    | 1      |
| deadEndRisk (subtracted) | 0    | 2      | 5    | 5      |
| expectedProgress         | 0    | 0.25   | 0.25 | 2      |
| rangeAwareness           | 0    | 0      | 1    | 1      |
| decisionSpread           | 0.3  | 0      | 0    | 0      |
| forecastRollCount        | 0    | 0      | 0    | 80     |

- **Easy:** doubles the immediate-fit preference, keeps the same adjacent-order signal,
  and lowers position quality to 2. It ignores future scores and structural risk. A spread
  of 0.3 allows close alternatives while being smaller than the 1/3-point contribution of
  one newly ordered pair. It is intentionally short-sighted, not given worse rolls.
- **Medium:** preserves all six baseline weights and deterministic best-move selection.
- **Hard:** reduces local fit to 0.5 and position quality from 6 to 5 to give structural
  analysis more influence. Each extra retainable anchor improves the risk contribution by
  0.5 point (`5/10`). Flexibility weight 1 favors comfortable ranges alongside retained order.
  The 0.25 local opportunity weight remains a small tiebreaking influence.
- **Expert:** retains Hard's weights except expected progress increases to 2 and uses the
  one-roll retention forecast. That term now measures expected retained fraction, so it can
  contribute at most 2 points and at most 0.2 for one extra expected retained brick.
  It examines all eighty possible values, not the actual next random value.

These coefficients were chosen to express the stated priorities and checked on the fixed
comparison corpus below. They are not a guarantee of monotonically better choices on every
position or of Expert beating Hard in every game.

`validateDifficulty` requires non-negative finite weights with a finite sum, range awareness
in `[0,1]`, a non-negative finite spread, and an integer forecast count in `[0,80]`. Invalid
profiles throw `RangeError` before evaluation. The 80 cap derives from 100 minus two towers
of ten, preventing accidental unbounded work in custom profiles. Zero weights are allowed.

## Range analysis used by Hard and Expert

`ranges.ts` builds prefix counts of values not held by the opponent. Own bricks that are not
retained may be removed and rolled again later, so they are not permanently excluded from
long-term numeric capacity. The opponent's current bricks are treated as unavailable for this
estimate; its future moves can change that assumption.

**Retained bricks:** find the largest subset of current bricks that can stay at their exact
positions in an ascending completion, with the opponent fixed. Add virtual boundary anchors
at position -1/value 0 and position 10/value 101. Two anchors at positions `i < j` are compatible
if their values increase and at least `j-i-1` non-opponent values lie strictly between them.
A longest-path dynamic program over these twelve anchors counts retained real bricks.
It has at most 66 pair checks; no arbitrary search pruning or tie randomness is involved.
The advanced dead-end score is `1 - retainedBrickCount / 10`.

**Range flexibility:** for each real anchor, count non-opponent values strictly above/below
its value. For each side that has required tower slots, divide by `10 * requiredSlots`, cap
at 1, and average over all eighteen non-empty sides. Ten values per slot comes from the same
100/10 band width as position quality. This distinguishes barely feasible ranges from roomy
ones. The result is in `[0,1]` and is a heuristic, not a proof of completion probability.

`rangeAwareness` blends each local flexibility/risk score with its advanced counterpart:
`(1-awareness)*local + awareness*advanced`. Easy/Medium use only local scoring; Hard/Expert
use only advanced scoring. Custom profiles can blend the two. Other components keep their
baseline meaning except Expert's forecast replacement for expected progress.

## Bounded future-roll forecast

When `forecastRollCount > 0`, `forecast.ts` replaces the local expected-progress score with
the mean best retained fraction after one hypothetical future roll and mandatory placement.
For each examined eligible value, project all ten placements and take the largest retained
brick count, then average those maxima and divide by ten. Return zero for an empty pool.

The eligible pool is the real eighty-value pool after the current candidate replacement.
Expert examines every value exactly once with equal weight. Custom smaller sample counts use
deterministic midpoint quantiles: sample `k` takes sorted-pool index
`floor((k+0.5)*poolLength/sampleCount)`. No random stream is consumed by this sampling.

These are scoring projections of tower arrays, never committed `GameState` transitions.
The real selected move still passes through `replaceBrick`. The opponent is frozen during
the projection, so this is not a full alternating-turn or adversarial search. Values may be
released or occupied before the AI's actual next turn. The forecast is exact only for its
stated one-roll static-opponent model, not the real future game or probability of winning.

**Work budget:** at most ten current candidates × eighty rolls × ten projected placements
= 8,000 future retention analyses, plus ten current analyses. Tests assert this deterministic
operation bound. No wall-clock cutoff affects choices, preserving cross-platform reproducibility.

Measured on 2026-09-13 using Node.js 24.14.0 on the development Windows machine, on the paired
match corpus below: Expert median decision time 2.32 ms, 95th percentile 2.86 ms, maximum
5.74 ms over 223 decisions. Other levels' 95th percentiles were below 0.20 ms. Measurements
exclude engine actions and use compiled shared TypeScript. The initial desktop target is
under 16 ms at the 95th percentile; this run meets it. Browser/mobile timing must be measured
when those clients exist, and no device-wide latency promise is made.

## Decision spread and random streams

`evaluateMoves` always gives the same scores for identical state and profile. `chooseMove`
first finds the best move using the existing win/score/position ranking. If it is a win,
return it immediately without decision randomness. Otherwise, with spread greater than zero,
collect every move whose score is within that distance of the best score. If multiple remain,
select uniformly among them with exactly one caller-supplied decision random value in `[0,1)`.
One remaining choice, zero spread, or no legal moves consumes no random value.

A missing random source when multiple spread choices exist throws `TypeError`; invalid random
values use the engine's `INVALID_RANDOM_VALUE` error. Never pass the same stateful random
generator for both decision randomness and game rolls. There is no global `Math.random` fallback.
Repeatability requires identical state, profile, and decision random inputs. Changing how long
the AI thinks does not change the game's random rolls.

Example controller call:

```ts
const move = chooseMove(state, playerId, {
  profile: DIFFICULTY_PROFILES.easy,
  random: decisionRandom, // Separate from the source supplied to drawBrick.
});
if (move !== null) {
  state = replaceBrick(state, playerId, move.position);
}
```

Difficulty behavior belongs in profile data, not scattered difficulty-name conditionals.
Higher difficulties must not inspect future random inputs or receive advantageous bricks.
Define the public information model before estimating probabilities; do not pass unrestricted
hidden state into scoring simply because the engine has access to it.

For example, placing 99 between 98 and 100 near the top has strong local fit but leaves almost
no numeric space for a long ascending tower beneath it. Easy may accept that placement; Hard
should usually prefer a move with better long-term room. Add a targeted test for this tradeoff.

## Determinism and verification

Inject randomness for any tie-breaking or decision spread. Identical observable state,
configuration, and random inputs must produce identical decisions on web, Android, and tests.
Search must not consume or peek at the actual game-roll random stream. Keep any AI decision
randomness separate so thinking longer cannot change the player's next brick.

Stage 2 tests cover each component with hand-calculated examples, legal move selection,
immediate winning moves for both seats, score signs/weights, exact ties, repeatability,
post-placement availability, history independence, and frozen inputs. Seeded games exercise
AI → engine turns through victory, and verify thinking does not consume game randomness.
These fixtures establish regression coverage, not a guarantee of victory within a fixed number
of turns for arbitrary random inputs. Stage 3 adds invalid-profile cases, bounded work,
range-capacity examples, exact forecast arithmetic, decision spread, and immediate wins
across all profiles. On the 98/?/100 near-top fixture, Easy's highest-scoring placement puts
99 between them; Hard and Expert place it at the bottom instead.

`difficultyMatches.test.ts` runs seeds 1–8 for each adjacent level pairing, then swaps profile
assignments between seats: sixteen games per pairing. Initial dealing uses the seed; seat
roll streams use seed+1000/+2000 and decision streams seed+3000/+4000. These offsets simply
separate deterministic test streams, not difficulty advantages. Results:

| Pairing       | Lower level wins | Higher level wins | Unfinished at 600-turn test bound |
| ------------- | ---------------- | ----------------- | --------------------------------- |
| Easy / Medium | 1                | 15                | 0                                 |
| Medium / Hard | 6                | 10                | 0                                 |
| Hard / Expert | 7                | 9                 | 0                                 |

All moves go through the engine and preserve active uniqueness. The 600-turn bound is a test
safety limit, not a gameplay rule. This small reproducible corpus detects regressions; it is
not a statistically representative skill rating, especially for the narrow Expert/Hard result.
