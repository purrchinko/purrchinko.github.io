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
  assert.equal(elements.game.height, Math.round(844 * 600 / 390));
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
