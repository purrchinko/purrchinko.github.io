# Purrchinko

A cozy, endless cat-themed pachinko puzzle about bouncing marbles, clever blocks, brass gates, and mischievous cats. It uses one marble with one set of physics for the whole run. Marble color is cosmetic; every shot follows the same rules.

## Play

Open [Purrchinko-Standalone.html](Purrchinko-Standalone.html) in a browser. For editing, use `index.html`, `styles.css`, and `game.js`.

Tap and release to aim and shoot. Hold to fire a short stream; move your finger while holding to change its angle. Tap a stocked nest to send its ordinary marbles back into play. Press Space to fire, or P/Escape to pause.

## The loop

Aim through a board of simple blocks and physical bumpers. A ball nudges blocks; touching matching colors combine them into a more elaborate machine. The board scrolls down as you open brass-bell gates, and the run continues through changing zones and occasional boss gates.

Every shot launches the same marble. Freeing a caged cat can trigger a short, 3.8-second rapid-fire surge: the launcher sends a stream of ordinary marbles without spending reserve. A surge can start again after 18 seconds. If the reserve and board both run dry, the hopper gets one last board-wide sweep of ordinary marbles; their normal bounces can still open a gate or return reserve. Strategy comes from choosing a line, arranging merges, using each machine's physical effect, timing moving obstacles, and steering marbles toward the roaming return bowl. Full nests are another deliberate burst: release the stored marbles together, with a small reserve bonus when the nest is full.

Around every 1,000m, the hopper adds a short shower of 30 ordinary marbles. The distance between showers varies from about 850m to 1,150m, and the launcher ring shows the burst running down.

Cats are board pieces with different behaviors. Free them by hitting their cages; they bat, steal blocks, gather and release marbles, or tinker with nearby machines. The game keeps its interface on the board: marble reserve, gate progress, distance, and pause. Event feedback uses physical animation, sound, and the board HUD rather than message popups.

## Implementation

Plain HTML, CSS, and JavaScript. Artwork, effects, and a gentle ambient music bed are synthesized in-browser. Music is off by default; the pause controls let you turn game effects and music on or off independently. Music starts on a player gesture to satisfy browser autoplay rules. A fixed-step local physics solver is included; an already-loaded Matter.js global can optionally be used. No external images or runtime services are required.

Saved cat unlocks and sound preferences from the previous game name migrate automatically on first launch.

The current run automatically saves in browser storage and resumes after a reload, including the board, live marbles, distance, and gate progress.
