# Purrchinko

A cozy, endless cat-themed pachinko puzzle about bouncing marbles, clever blocks, brass gates, and mischievous cats. It uses one marble with one set of physics for the whole run. Marble color is cosmetic; every shot follows the same rules.

Four distinct rescues bring different play: Mochi and three tiny kittens bat marbles toward bells; fluffy Miso fetches blocks into matches; grumpy Pepper catches falling marbles and brings them to nests; and Maine Coon Sunny winds nearby toys. Cages vary from one-cell portraits to two-cell group rescues. Each chamber holds exactly one cage, and its rescue roams until the gate opens; Mochi's three kittens each wander their own spot. Cats nudge and catch real marbles, activate machines, hop over crowded blocks, and react to nearby aim. Their smaller roaming hitboxes match their freed scale. New gate patterns include solo and duet bells, ordered relays, wind-up levers, and boss phases, with varied blockers and fan kickers changing ball trajectories. Previously unlocked identities remain in the collection.

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
