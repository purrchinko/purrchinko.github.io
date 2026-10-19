# Purrchinko

A cozy, endless cat-themed pachinko puzzle about bouncing marbles, clever blocks, brass gates, and mischievous cats. It uses one marble with one set of physics for the whole run. Marble color is cosmetic; every shot follows the same rules.


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
