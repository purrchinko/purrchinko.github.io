# Cat-world review — single-marble build

## Current direction

Cats remain active pieces in the physical board, while every marble is mechanically identical. Cat personality comes from what the cat does to the board or ordinary marbles, not from a player-selected projectile.

- Mochi swats marbles toward live gate bells and can help nearby blocks combine.
- Miso steals a block and tries to place it beside a matching block.
- Pepper catches nearby marbles and spits them back into the board.
- Sunny winds nearby machines and can briefly quiet moving shutters.
- Cat cages take repeated ordinary hits to open. Freed cats become animated board companions.

## Rewards and legibility

A completed gate refills the reserve. The moving middle bowl returns an ordinary marble; paired side-bowl catches return one more. A full nest can be tapped to release its stored marbles as one satisfying burst and adds a small two-marble reserve reward. Freeing a caged cat can start a 3.8-second infinite-fire burst of ordinary marbles, available again after 18 seconds.

The opening view should stay quiet: no instruction toast, selectable-ball dock, or gameplay message popups. The board's visible matching blocks, live bells, and aim trace carry the teaching. Cat rescues and gate openings use animation, sound, and changing board state for feedback.

## QA checklist

- Launches and releases use the same marble radius and physics.
- Captured marbles retain only their cosmetic color and return as ordinary marbles.
- The UI contains no special-ball stock, selection controls, or milestone counter.
- The standalone HTML matches the separated source files.
- Run mobile-viewport browser checks for tapping, aiming, nest release, gate progress, and console errors.
