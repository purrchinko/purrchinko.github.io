# Purrchinko

A cozy, endless cat-themed pachinko puzzle about bouncing marbles, clever blocks, brass gates, and mischievous cats. It uses one marble with one set of physics for the whole run. Marble color is cosmetic; every shot follows the same rules.


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
