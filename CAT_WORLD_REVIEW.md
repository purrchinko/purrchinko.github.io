# Cat-world review — single-marble build

## Current direction

Cats remain active pieces in the physical board, while every marble is mechanically identical. Cat personality comes from what the cat does to the board or ordinary marbles, not from a player-selected projectile.

- Mochi chases nearby marbles, stays near a live bell when idle, and needs three separate swats before helping a bell. She has a ten-second assist cooldown.
- Miso walks to a chosen block, picks it up, visibly carries it to a matching block, and merges the delivered block. She cannot teleport blocks through the room.
- Pepper runs beneath descending marbles, stores up to three, then seeks a nest and adds her catches to its contents. If no nest can receive them, she spits ordinary marbles toward the nest or back into play.
- Sunny finds the least-wound local rotor, spring, or moving bumper, visits it, and energizes only that machine. Wound bumpers give ordinary marbles a stronger kick for a few seconds.
- Cat cages take repeated ordinary hits to open. Freed cats roam around occupied grid cells, can be herded by held aim, and add their walking momentum to swats. One freed cat per level is allowed, drawn at 84% of its former size with a proportional physics footprint. It departs when the gate opens so cats from previous levels cannot crowd the next board; its unlock remains in the collection.
- Cooperation: Pepper may contribute one charge to Mochi (only after Mochi has begun earning it), while Miso's successful block match can briefly wind one machine for nearby Sunny.
- Miso's completed match emits a small impulse ring; Pepper temporarily turns her nest into a marble attractor; Sunny's winding creates a one-time kick for marbles near the machine. Each acts on existing ordinary marbles only, with no hidden ammo generation.
- Recovery: cats recheck landing occupancy mid-jump and can select alternative perches. Unreachable jobs cool down instead of consuming attention forever; undelivered stolen tiles are returned before retirement rather than lost. Trapped marbles get a bounded release kick and, if necessary, an empty-cell relocation inside their current chamber.
- Each cat action has its own distinct synthesized sound, supported by a quiet filtered echo and priority-protected gate chimes.

## Rewards and legibility

A completed gate refills the reserve. The moving middle bowl returns an ordinary marble; paired side-bowl catches return one more. A full nest can be tapped to release its stored marbles as one satisfying burst and adds a small two-marble reserve reward. Freeing a caged cat can start a 3.8-second infinite-fire burst of ordinary marbles, available again after 18 seconds.

The opening view should stay quiet: no instruction toast, selectable-ball dock, or gameplay message popups. The board's visible matching blocks, live bells, and aim trace carry the teaching. Cat rescues and gate openings use animation, sound, and changing board state for feedback.

## QA checklist

- Launches and releases use the same marble radius and physics.
- Captured marbles retain only their cosmetic color and return as ordinary marbles.
- The UI contains no special-ball stock, selection controls, or milestone counter.
- The standalone HTML matches the separated source files.
- Run mobile-viewport browser checks for tapping, aiming, nest release, gate progress, and console errors.
