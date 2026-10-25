# Purrchinko — current design

Purrchinko is an endless, portrait-first marble puzzle. It should feel like a handmade cat toy that gradually turns into a lively mechanical course. The game stays on one board: no level select, sidebars, inventory, or explanatory opening screen.

## The rule set

- Every shot is the same ordinary marble: identical radius, speed range, collision behavior, and value. Its color is visual variation only.
- Aim through blocks and obstacles. A hit pushes a tile; touching matching colors combine into a higher-tier machine. The aim preview shows the likely impact and, for movable tiles, the next cell.
- Glowing brass bells open the gates. Moving shutters, levers, baffles, and boss phases shape each route. Opening a gate advances the scrolling course and refills the reserve.
- Returns, star pairs, feeders, portal machines, cats, and full nests reward board decisions. Stored marbles remain ordinary marbles when released.
- Cats are physical companions with distinct behaviors: Mochi bats toward nearby targets, Miso steals and relocates blocks, Pepper catches and releases marbles, and Sunny winds nearby machinery.
- Freeing a caged cat can trigger a 3.8-second rapid-fire burst, available again after 18 seconds. It launches the same ordinary marbles without spending reserve; there are no special projectile types.
- At a randomly spaced distance milestone around every 1,000m, the hopper launches a short shower of 30 ordinary marbles. The gap varies between about 850m and 1,150m so the reward is readable but not clockwork.
- When reserve is empty and all in-flight marbles are gone, pending cat/nest rescues get a brief chance to resolve, then the hopper fires one broad finale wave of ordinary marbles. Their normal physics can still rescue a run; if they do not, the run ends quickly without a message or popup.
- The current run is saved locally and restored after reload, including the board layout, in-flight and captured marbles, distance, gate state, and reward state.
- Surprise comes from the generated board, obstacle timing, cat behavior, the route through each chamber, and distance-based marble showers.

## Feel and presentation

The board is vector-drawn at a logical width of 600, with its height following the available screen space. The responsive layout supports iPhone and tablet sizes in portrait, landscape, and split view; safe-area insets keep controls clear of notches and home indicators. Tablet boards grow up to 900 CSS pixels wide, and Retina rendering follows the displayed size within a 3.2-million-pixel budget. A restrained HUD shows the reserve, current bell progress, and distance. The first frame opens directly on the board, and gameplay events do not interrupt it with message popups.

Impacts, block pushes, merges, returns, gates, and cat actions have distinct synthesized sounds. Merge and gate rewards should feel clear and warm without filling the screen with counters or inventory controls. The pause panel contains sound and restart controls.

The ambient soundtrack is a quiet, slow chord loop with soft plucked notes. Music is off by default; pause controls toggle it independently from game effects, so a player can keep the marble and cat sounds without music. The soundtrack starts after the first player gesture because browsers block audio autoplay.

## Controls

Tap and release to shoot toward that point. Hold to fire continuously; move the pointer or finger to steer the volley. Tapping a nest with three or more stored marbles releases them together. Space fires; P or Escape pauses.

## Verification boundary

The local browser build and standalone HTML should remain in sync. Browser smoke tests can verify startup, input, scrolling, merges, gates, ordinary-marble identity, and absence of JavaScript errors. They cannot establish whether the reward pacing feels good on a physical phone; that still needs human playtesting.
