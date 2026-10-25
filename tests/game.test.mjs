import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('game.js', root), 'utf8');
const html = readFileSync(new URL('index.html', root), 'utf8');

function loadGame(saved = new Map()) {
  const handlers = new Map();
  const context2d = new Proxy({createRadialGradient: () => ({addColorStop() {}})}, {
    get: (target, key) => target[key] ?? (() => {}),
  });
  const element = () => ({
    textContent: '', hidden: false, style: {setProperty() {}, getPropertyValue: () => ''},
    classList: {add() {}, remove() {}, toggle() {}},
    setAttribute() {}, focus() {}, addEventListener() {},
    getBoundingClientRect: () => ({left: 0, top: 0, width: 600, height: 900}),
    getContext: () => context2d,
  });
  const elements = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, element()]));
  elements.ballCount.parentElement = element();
  const math = Object.create(Math);
  let seed = 123456;
  math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const env = {
    Math: math, performance,
    document: {
      getElementById(id) {assert.ok(elements[id], `Unknown DOM id: ${id}`); return elements[id];},
      createElement: element, addEventListener() {},
    },
    localStorage: {
      getItem: key => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key),
    },
    addEventListener: (event, handler) => handlers.set(event, handler),
    requestAnimationFrame: callback => {env.nextFrame = callback;},
  };
  env.window = env;
  vm.runInNewContext(source, env, {filename: 'game.js'});
  return {game: env.Purrchinko, env, elements, saved, handlers};
}

function ringGate(game) {
  const gate = game.state.gates[game.state.gatesPassed];
  for (const index of [0, 2, 1]) {
    const bell = game.state.tiles.find(tile => tile.id === gate.switchIds[index]);
    while (gate.bolts[index] > 0) assert.equal(game.activateBell(bell), true);
  }
  return gate;
}

test('startup, cached rendering, themes, and resizing work without retired UI', () => {
  const {env, game, elements, handlers} = loadGame();
  game.state.paused = true;
  for (let phase = 0; phase < 5; phase++) {
    game.state.phase = phase;
    env.nextFrame(performance.now());
    env.nextFrame(performance.now());
  }
  elements.frame.getBoundingClientRect = () => ({width: 390, height: 844});
  handlers.get('resize')();
  env.nextFrame(performance.now());
  assert.equal(elements.game.width, 390);
  assert.equal(elements.game.height, 844);
});

test('Retina rendering follows the displayed size, caps tablet pixels, and cancels a rotated hold', () => {
  const {game, env, elements, handlers} = loadGame();
  env.devicePixelRatio = 3;
  elements.frame.getBoundingClientRect = () => ({width: 900, height: 1366});
  game.state.pointerDown = true;
  game.state.keyboardFire = true;
  handlers.get('resize')();
  assert.ok(elements.game.width > 1200);
  assert.ok(elements.game.width * elements.game.height <= 3200000);
  assert.ok(Math.abs(elements.game.width / elements.game.height - 900 / 1366) < .001);
  assert.equal(game.state.pointerDown, false);
  assert.equal(game.state.keyboardFire, false);
  game.state.pointerDown = true;
  handlers.get('resize')();
  assert.equal(game.state.pointerDown, true); // A duplicate observer notification must not cancel input.
  const width = elements.game.width;
  elements.frame.getBoundingClientRect = () => ({width: 0, height: 0});
  handlers.get('resize')();
  assert.equal(elements.game.width, width);
});

test('visible bumpers and skill pegs remain interactive on tall phone screens', () => {
  const {game, elements, handlers} = loadGame();
  elements.frame.getBoundingClientRect = () => ({width: 390, height: 844});
  handlers.get('resize')();
  game.createShot();
  const ball = game.state.active[0];
  const bumper = {room: 0, x: 300, y: 1050, nowX: 300, nowY: 1050, kind: 'bumper', radius: 22, phase: 0, amp: 0, kick: 0, hitTime: -99};
  game.state.kickers = [bumper];game.state.starPegs = [];
  Object.assign(ball, {x: 300, y: 1040, vx: 0, vy: 200});
  game.updateContraptions(1 / 60);
  assert.ok(ball.vy < 0);
  assert.equal(bumper.kick, 1);
  const peg = {room: 0, x: 300, y: 1120, r: 10, lit: false, hitTime: -99, spin: 0};
  game.state.kickers = [];game.state.starPegs = [peg];
  Object.assign(ball, {x: 300, y: 1110, vx: 0, vy: 200});
  game.updateContraptions(1 / 60);
  assert.equal(peg.lit, true);
  // The same objects stay inactive below the bottom of a shorter landscape board.
  elements.frame.getBoundingClientRect = () => ({width: 350, height: 390});
  handlers.get('resize')();
  peg.lit = false;Object.assign(ball, {x: 300, y: 1110, vx: 0, vy: 200});
  game.updateContraptions(1 / 60);
  assert.equal(peg.lit, false);
});

test('bells open ordinary and boss gates once and retire passed contraptions', () => {
  const {game} = loadGame();
  for (let room = 0; room < 6; room++) {
    const gate = ringGate(game);
    assert.equal(gate.opened, true);
    assert.equal(game.state.gatesPassed, room + 1);
    assert.ok(game.state.kickers.every(k => k.room > room));
    assert.ok(game.state.starPegs.every(p => p.room > room));
    const reserve = game.state.reserve;
    game.openGate(gate);
    assert.equal(game.state.reserve, reserve);
  }
  assert.ok(game.state.gates.length > 6);
});

test('merging adjacent blocks evolves one cell and preserves the ordinary marble', () => {
  const {game} = loadGame();
  const tile = game.state.tiles.find(t => t.kind === 'block' && game.matchingNeighbor(t));
  const next = game.merge(tile, game.matchingNeighbor(tile));
  assert.ok(next);
  assert.equal(next.span, 1);
  assert.equal(game.state.merges, 1);
  assert.equal(game.createShot(), true);
  const marble = game.state.active[0];
  assert.equal(marble.r, 7.25);
  assert.equal('kind' in marble, false);
});

test('saves restore flight, captured marbles, and bell contact history', () => {
  const run = loadGame();
  const {game} = run;
  game.createShot();
  game.step(12);
  const marble = game.state.active[0];
  const gate = game.state.gates[0];
  const bell = game.state.tiles.find(t => t.id === gate.switchIds[0]);
  game.activateBell(bell, marble);
  assert.equal(game.saveRun(true), true);
  const snapshot = JSON.parse(run.saved.get('purrchinko.run'));
  assert.equal('trail' in snapshot.active[0], false);
  snapshot.state.found = {__purrchinkoSet: ['retired discovery']};
  snapshot.state.unlockedCats = 4;
  run.saved.set('purrchinko.run', JSON.stringify(snapshot));
  const restored = loadGame(run.saved).game;
  const savedBall = restored.state.active.find(b => b.id === marble.id);
  assert.equal(savedBall.x, marble.x);
  assert.equal(savedBall.y, marble.y);
  assert.equal(savedBall.switchHistory.has('0/0'), true);
  assert.equal(restored.state.gates[0].bolts[0], 0);
  assert.equal('found' in restored.state, false);
  assert.equal('unlockedCats' in restored.state, false);
  assert.equal(restored.state.tiles.find(t => t.kind === 'nest').captures.length, 3);
  for (const tile of restored.state.tiles) assert.equal(restored.state.grid[tile.r][tile.c], tile);
});

test('restart clears input state while retaining sound preferences and cat collection', () => {
  const {game} = loadGame();
  Object.assign(game.state, {pointerDown: true, pointerFired: true, holdTime: 3, soundEnabled: false, aimAngle: 1});
  game.state.catCollection.add(2);
  game.reset();
  assert.equal(game.state.pointerDown, false);
  assert.equal(game.state.pointerFired, false);
  assert.equal(game.state.holdTime, 0);
  assert.equal(game.state.aimAngle, 0);
  assert.equal(game.state.soundEnabled, false);
  assert.equal(game.state.catCollection.has(2), true);
});

test('shared simulation steps drive held input and the final ordinary-marble wave', () => {
  const {game} = loadGame();
  game.state.pointerDown = true;
  game.step(60);
  assert.equal(game.state.frame, 60);
  assert.equal(game.state.pointerFired, true);
  assert.ok(game.state.shots > 1);
  game.reset();
  game.state.reserve = 0;
  game.startFinalWave();
  game.step(360);
  assert.equal(game.state.finalWaveUsed, true);
  assert.equal(game.state.finalWaveShotsLeft, 0);
  assert.equal(game.state.finalWaveActive, false);
  assert.ok(game.state.shots >= 84);
  assert.ok(game.state.active.every(ball => ball.r === 7.25 && !('kind' in ball)));
});

test('distance records persist across restarts and reloads without treating ties as records', () => {
  const run = loadGame(new Map([['purrchinko.bestDistance', '52']]));
  const {game, elements, saved} = run;
  assert.equal(game.state.bestDistance, 52);
  assert.equal('bestDistance' in elements, false);
  assert.equal(elements.distanceRecordBadge.hidden, true);
  Object.assign(game.state, {cameraY: 520, cameraTarget: 520});
  game.saveRun(true);
  assert.equal(game.state.newDistanceRecord, false);
  Object.assign(game.state, {cameraY: 530, cameraTarget: 530});
  game.saveRun(true);
  assert.equal(game.state.newDistanceRecord, true);
  assert.equal(elements.distanceRecordBadge.hidden, false);
  assert.equal(saved.get('purrchinko.bestDistance'), '53');
  const reloaded = loadGame(saved);
  assert.equal(reloaded.game.state.bestDistance, 53);
  assert.equal(reloaded.game.state.newDistanceRecord, true);
  assert.equal(reloaded.elements.distanceRecordBadge.hidden, false);
  reloaded.game.reset();
  assert.equal(reloaded.game.state.bestDistance, 53);
  assert.equal(reloaded.game.state.newDistanceRecord, false);
  assert.equal(reloaded.elements.distanceRecordBadge.hidden, true);
  Object.assign(reloaded.game.state, {cameraY: 500, cameraTarget: 500, score: 999999});
  reloaded.game.saveRun(true);
  assert.equal(saved.get('purrchinko.bestDistance'), '53');
  assert.equal(reloaded.game.state.newDistanceRecord, false);
});

test('record highlights update while scrolling and the end summary survives reload', () => {
  const run = loadGame(new Map([['purrchinko.bestDistance', '1']]));
  run.game.state.cameraTarget = 40;
  run.game.step(6);
  assert.ok(run.game.state.bestDistance > 1);
  assert.equal(run.elements.distanceRecordBadge.hidden, false);
  run.game.state.ended = true;
  run.game.saveRun(true);
  const restored = loadGame(run.saved);
  assert.equal(restored.elements.finalRecord.textContent, 'NEW DISTANCE RECORD');
  assert.equal(restored.elements.gameOver.hidden, false);
  restored.game.reset();
  restored.game.state.ended = true;
  restored.game.saveRun(true);
  assert.match(loadGame(restored.saved).elements.finalRecord.textContent, /^BEST DISTANCE/);
});

test('record flair expires once per run while the best distance stays saved', () => {
  const {game, elements, saved} = loadGame(new Map([['purrchinko.bestDistance', '10']]));
  Object.assign(game.state, {cameraY: 110, cameraTarget: 110});
  game.saveRun(true);
  assert.equal(elements.distanceRecordBadge.hidden, false);
  game.state.worldTime += 5;
  game.step();
  assert.equal(elements.distanceRecordBadge.hidden, true);
  assert.equal(game.state.newDistanceRecord, true);
  Object.assign(game.state, {cameraY: 120, cameraTarget: 120});
  game.saveRun(true);
  assert.equal(elements.distanceRecordBadge.hidden, true);
  assert.equal(saved.get('purrchinko.bestDistance'), '12');
});

test('invalid stored records recover and existing saved runs seed the distance record', () => {
  for (const invalid of ['NaN', 'Infinity', '-20', '{}']) {
    assert.equal(loadGame(new Map([['purrchinko.bestDistance', invalid]])).game.state.bestDistance, 0);
  }
  const old = loadGame();
  Object.assign(old.game.state, {cameraY: 810, cameraTarget: 810});
  old.game.saveRun(true);
  old.saved.delete('purrchinko.bestDistance');
  const snapshot = JSON.parse(old.saved.get('purrchinko.run'));
  delete snapshot.state.newDistanceRecord;
  snapshot.state.bestDistance = 1; // A run snapshot cannot overwrite the separate record.
  old.saved.set('purrchinko.run', JSON.stringify(snapshot));
  const migrated = loadGame(old.saved);
  assert.equal(migrated.game.state.bestDistance, 81);
  assert.equal(old.saved.get('purrchinko.bestDistance'), '81');
  old.saved.set('purrchinko.bestDistance', '100');
  const higher = loadGame(old.saved);
  assert.equal(higher.game.state.bestDistance, 100);
  assert.equal(higher.game.state.newDistanceRecord, false);
  assert.equal(higher.elements.distanceRecordBadge.hidden, true);
});

test('gate audio retains the full latch and chime when ordinary effects are saturated', () => {
  const nodes = [];
  const param = () => ({setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}});
  const node = () => ({frequency: param(), gain: param(), Q: {}, pan: {}, connect() {}, disconnect() {}, start() {}, stop() {}});
  const voice = () => {const n = node(); nodes.push(n); return n;};
  const env = vm.createContext({
    audio: {currentTime: 10, state: 'running', createOscillator: voice, createBufferSource: voice, createGain: node, createBiquadFilter: node, createStereoPanner: node},
    state: {soundEnabled: true, chain: 0}, effectsBus: {}, noiseBuffer: {}, W: 600,
    clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
  });
  const audioSource = source.slice(source.indexOf('function tone('), source.indexOf('function updateAudioSettings('));
  vm.runInContext(`let voices=48;const soundTimes=new Map(),EFFECT_VOICE_LIMIT=48,GATE_VOICE_RESERVE=18,FAMILY_COLORS=['rose'],NOTES=[440];${audioSource}`, env);
  vm.runInContext("sound('hit'); sound('gate');", env);
  assert.equal(vm.runInContext('voices', env), 66);
  assert.equal(nodes.length, 19); // Eighteen voices plus the vibrato oscillator.
  const count = nodes.length;
  vm.runInContext("state.soundEnabled=false;audio.currentTime++;sound('gate');", env);
  assert.equal(nodes.length, count);
});

test('standalone is generated from the current game, styles, and HTML', () => {
  execFileSync(process.execPath, [new URL('scripts/build-standalone.mjs', root).pathname, '--check']);
});
