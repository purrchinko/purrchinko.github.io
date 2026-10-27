# Purrchinko

A cozy, endless cat-themed pachinko puzzle about bouncing marbles, clever blocks, brass gates, and mischievous cats. It uses one marble with one set of physics for the whole run. Marble color is cosmetic; every shot follows the same rules.

Rescued cats are now active companions. Mochi chases and bats marbles toward bells (her bell assist takes three paw hits and has a cooldown); Miso physically fetches and carries blocks into matches; Pepper intercepts falling marbles and delivers them to nests; Sunny travels to underpowered machines and winds one at a time. Moving paws transfer momentum to marbles, and cats can hop over dense block clusters without colliding mid-jump. Aim and hold near a cat to lure it toward the pointer. Each room has exactly one possible active rescued helper: when its gate opens, that cat retires from the board, leaving room for the next rescue. Freed cats are 16% smaller than their caged appearance, including their collision hitboxes. Previously unlocked cat identities remain in the collection.

In the second gameplay pass, Miso's successful matches launch a small pulse through nearby marbles, Pepper's delivery gives its nest a short attraction window, and Sunny's winding also kick-starts nearby marbles. Leaps find alternate clear landings when the board changes in midair; Miso keeps her block if a delivery gets blocked; and trapped marbles receive a finite escape nudge. The soundscape has distinct synthesized cat-action cues and a gentle filtered room echo, all fully offline.


The same build adapts to iPhone and tablet screens, including portrait, landscape, and split view. Touch controls stay at least 44 pixels across, and the layout respects safe areas.

Run locally with `python3 -m http.server 8000`, then open [the game](http://localhost:8000).

Edit `index.html`, `styles.css`, and `game.js`. Generate the downloadable single-file version with:

```sh
node scripts/build-standalone.mjs
```

Check gameplay regressions and confirm the standalone matches the source:

```sh
node --test
node --check game.js
```

The tests use Node's built-in runner and need no package installation. The standalone file embeds the same HTML, styles, JavaScript, and favicon; it runs offline.
