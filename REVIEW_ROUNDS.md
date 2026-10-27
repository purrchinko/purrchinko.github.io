# PURRCHINKO — GAMEPLAY REVIEW, ROUNDS 1 & 2

This document records the playable revision and its design review.

## Goals and comparative research

| Design influence | Characteristic worth borrowing | Implemented adaptation |
| --- | --- | --- |
| Peggle / Peggle 2 | Specific high-value targets, rebounds, long shots, ball-catching bowl | Separate small brass-bell switches, golden star pegs, moving center rescue bowl, per-room skill rewards |
| Peglin | Crit/refresh pegs create reachable shot priorities and trade-offs between direct effect and future power | Target priority shifts among gate bells, limited star pairs and reserve-saving returns |
| holedown | Fixed and breakable obstacles make angles matter; shots have a real scarcity cost | Timber/vine/glass barriers, progressively stronger gates, reduced handouts, more obstruction by chamber |
| The Incredible Machine / contraption puzzles | A visible trigger changes another part of the machine | Cyan lever freezes moving yarn shutters for six seconds; wiring communicates relationships |
| 2048 / Suika / falling-block combinations | Adjacent matching objects merge and change the board, rewarding spatial control | Retained from the original: tile pushes, mergers, physical special-tile evolutions |

Research points: official Peggle 2 manual (peg targeting, ball catch, style shots), holedown's description of fixed blocks and scarce shots, Peglin's critical/refresh and peg-targeting mechanics.

## Pass 1 — Make a shot mean something

**Problem:** Gate HP was advanced largely by colliding with the door. Random spray made progress without a clear target.

**Changes:**

- Gates are solid scenery until players strike the *separate brass cat-bell switches* roughly three rows above them.
- Each active switch has a pulsing target, remaining-hit number, animated completion mark, and a dashed physical wire to its gate lock.
- Chamber 1 teaches **two one-hit switches**. Chamber 2 adds a third; later chambers require several impacts. Every third chamber has a boss gate whose outer switches must be activated before the center bell becomes live.
- Hitting the door itself no longer advances its locks. A short, contextual hint explains the difference.
- Added physical spinning bumpers, swinging pendulums, moving corridor barriers and optional pairs of gold skill pegs.
- Retained the original shapes, sound, merge rules, cat art and mostly one-finger control scheme.

**Finding during tests:** A scrolling-camera refund was replenishing too many spent marbles. It made rapid firing effectively free. Corrected in pass 2.

## Pass 2 — Make the machine fight back, and reward planning

- Added horizontal, oscillating yarn shutters with **capsule-shaped collision** rather than a purely cosmetic moving object.
- Added **cyan lever tiles** in later chambers. Hit them with a ball to temporarily freeze that chamber's shutters for six seconds. Their cooldown is visible on the lever. This creates the simple setup: strike the lever, then line up a shot through the temporarily open lane.
- Added staggered destructible timber, glass, and vine baffles. They push trajectories toward different routes rather than randomly covering the whole board.
- Added controlled yarn growth every 15 shots from the third chamber onward. Growth is bounded and forbidden from occupying critical switch cells.
- Reworked the reward economy: opening a gate gives fewer balls later; star pairs, yarn knots and chains give smaller, finite bonuses; all stored marbles remain the same ordinary marble; scrolling the camera no longer refunds every shot still near the launcher.
- The roaming center fish bowl returns a captured marble. The two stationary side bowls accumulate fish stamps; collecting two side catches earns one marble. Its motion is slow and readable, so expert players can aim shots with an eventual landing position in mind.
- Fixed a placement collision where a newly positioned bell accidentally replaced a 2×2 cat nest; the nest now has its own early-room space.
- Shortened the top goal readout and corrected its contrast during Midnight Cat and other darker chapter palettes.

## Difficulty structure

| Chamber | Lesson and pressure | Gate objective |
| --- | --- | --- |
| 1 | Static rails, first bouncing wheel, open approach | Two one-hit bells |
| 2 | First swinging pendulum, more colored blocks | Three one-hit bells |
| 3 | Moving yarn bar, first cyan freeze lever, first sequential boss | Two outer bells, then center |
| 4 | Staggered obstacles + yarn growth + bar | Three stronger bells |
| 5 | Denser baffles + more paths to the target | Three still-stronger bells |
| 6 | Boss mixed with yarn and shutters | Clear outer switches, then tougher center |
| 7+ | Repeat themes with larger switch counters, adversarial knots and more active moving pieces | Increasingly challenging, capped hit requirements |

**Threats are directed, never fully random:** a switch stays visible, a barrier can be destroyed, yarn can be removed, and a shutter's disabling lever can be reached. The player can still hold to fire, but doing that now costs significant inventory.

## QA completed

- JavaScript syntax checks (`node --check`) after each change.
- Chromium browser smoke tests with the complete generated HTML, CSS, and game JS injected in a page. Checked first-chamber rendering, mobile (390×844) frame bounds, aim/firing, 28-shot simulation, gate unlocking, and absence of uncaught browser exceptions.
- A controlled gate progression test explicitly activated each bell in eight successive chambers (including boss phase order) and advanced the camera, verifying that all gates could unlock and that later mechanisms were created.
- A paced 125-shot physics simulation with changing aim traversed multiple chambers. One post-tuning run ended with about 65 reserve marbles, compared with an earlier version that had around 113 after the same number of fired shots. Exact outcomes vary with board generation, bounce interactions, and timing.
- Observed that the moving bowl could overlap a static side bowl at its original travel amplitude. Reduced amplitude to prevent visual/functional overlap.
- Confirmed that the board and controls fit a narrow portrait browser and that the game does not need an external JavaScript dependency.

## Remaining considerations for a full production-quality game

The fallback physics engine is deliberately compact, and there is not yet a full playtest corpus, deterministic seed selector, automated target-reachability solver, local save of partially finished runs, full tutorial, or a persistent score leaderboard. Numerical gate tuning and moving-bar difficulty need additional *human* usability testing; visual browser checks and scripted physics runs cannot establish whether every generated configuration feels fair. Matter.js remains optional; the shipped game is self-contained and uses the existing local solver by default.


## Single-marble cleanup

The game launches one ordinary marble type throughout the run. Scheduled projectile milestones, stored-ball selection, special impact effects, and the power-ball dock have been removed. Freeing a caged cat can start a 3.8-second infinite-fire surge of those same marbles, with an 18-second cooldown to keep the burst finite. Gameplay notices, tutorial highlights, floating labels, and the end-run card were removed; state changes stay in the board, sound, and reserve HUD. The offline standalone file is kept in sync with the separated HTML, CSS, and JavaScript.

## Cat rescue surge and quiet board

A real mobile-sized browser playtest hit the first cat cage and showed the infinite reserve, auto-firing ordinary marbles, and a countdown ring around the launcher cat. The live reserve remained available during the burst, then returned to its normal count after the surge. No message banner appeared over the board.

## Second rescued-cat interaction and audio pass

- Miso block matches create a bounded impulse ring that moves nearby ordinary marbles; failed pickups avoid repeating the same target immediately, and carried blocks are preserved when a destination refills or the cat travels to the next room.
- Pepper deliveries temporarily magnetize the receiving nest; Sunny's machine winding creates an immediate radial marble kick in addition to powering the mechanism. These actions do not generate extra marbles.
- Cats recalculate landing positions after midair board changes and can find alternate room perches instead of intersecting occupied tiles. Marble anti-stall monitoring detects both stillness and short repeating loops and supplies finite impulses and within-chamber escape positions.
- Individual cat-action sounds now have distinct pitch/envelope recipes, with a quiet filtered slapback and softened musical accents. Music has subtle syncopated responses, while gate sounds keep reserved polyphony.
- Automated regression coverage extends to multi-room rescues, autonomous deliveries and winding, mid-jump saves, landing obstruction, cargo preservation, marble recovery, nested attraction, radial impulse behavior, and the offline standalone export. Human mobile playtesting is still needed for final sound levels and difficulty feel.

## Third rescued-cat density pass

- Only the freed cat native to the current room can be active. Earlier rescued cats retire as the gate opens, and new rooms retain their own distinct rescue; collection unlocks and total rescues are preserved.
- A retired Pepper's unspent stored marbles return to reserve. Miso's undelivered block goes back into an open cell of its original room, or becomes one reserve marble if no cell remains. Older saves containing traveling rescued cats are normalized when loaded.
- Freed-cat drawings are scaled to 84% with proportional collision footprints and slightly tighter tap bounds. Cages remain full size and easy to strike. Gameplay regression coverage: 32 passing tests.
