import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('game.js', root), 'utf8');
const html = readFileSync(new URL('index.html', root), 'utf8');

function loadGame(saved = new Map(), initialSeed = 123456) {
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
  let seed = initialSeed;
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
  if(gate.mode==='windup'&&!gate.wound)game.activateLever(game.state.tiles.find(t=>t.kind==='lever'&&t.room===gate.index));
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

test('generated chambers vary cats, cages, blockers, fans, and playable gate layouts', () => {
  const cagePositions = new Set(), modes = new Set(), spans = new Set();
  let blockers = 0, fans = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const {game} = loadGame(new Map(), seed);
    for (let room = 0; room < 12; room++) {
      const gate = game.state.gates[room], cats = game.state.tiles.filter(t => !t.removed && t.kind === 'cat' && t.caged && t.room === room);
      assert.equal(cats.length, 1, `Seed ${seed}, room ${room}: exactly one rescue`);
      assert.equal(gate.row, room * 10 + 9);
      modes.add(gate.mode);
      for (const cat of cats) {
        spans.add(cat.span);cagePositions.add(`${cat.r-room*10}/${cat.c}`);
        for(let dr=0;dr<cat.span;dr++)for(let dc=0;dc<cat.span;dc++)
          assert.equal(game.state.grid[cat.r+dr][cat.c+dc],cat,'cage occupies its actual footprint');
      }
      gate.maxBolts.forEach((count, index) => {
        if (!count) return;
        const bell = game.state.tiles.find(t => !t.removed && t.id === gate.switchIds[index]);
        assert.ok(bell && bell.kind === 'switch', `Seed ${seed}, room ${room}, bell ${index} is intact`);
        assert.equal(game.state.grid[bell.r][bell.c], bell);
      });
      if (gate.mode === 'windup') assert.ok(game.state.tiles.some(t => !t.removed && t.kind === 'lever' && t.room === room));
      blockers += game.state.tiles.filter(t => !t.removed && t.bigBlocker && Math.floor(t.r/10)===room).length;
      fans += game.state.kickers.filter(k => k.room===room && k.kind==='fan').length;
      ringGate(game);
    }
  }
  assert.ok(modes.has('duet')&&modes.has('solo')&&modes.has('relay')&&modes.has('windup')&&modes.has('boss'));
  assert.ok(spans.has(1)&&spans.has(2));
  assert.ok(cagePositions.size >= 6);
  assert.ok(blockers>0&&fans>0);
});

test('ordered and wind-up gates enforce their distinct mechanisms and survive reload', () => {
  const {game,saved} = loadGame();
  for(let room=0;room<4;room++)ringGate(game);
  const relay=game.state.gates[4];
  assert.equal(relay.mode,'relay');
  const later=game.state.tiles.find(t=>t.id===relay.switchIds[2]);
  assert.equal(game.activateBell(later),false);
  assert.equal(relay.bolts[2],relay.maxBolts[2]);
  ringGate(game);ringGate(game);
  const gate=game.state.gates[6],bell=game.state.tiles.find(t=>t.id===gate.switchIds[0]);
  assert.equal(gate.mode,'windup');
  assert.equal(game.activateBell(bell),false);
  assert.equal(gate.bolts[0],gate.maxBolts[0]);
  const lever=game.state.tiles.find(t=>t.kind==='lever'&&t.room===6);
  game.activateLever(lever);
  assert.equal(gate.wound,true);
  game.saveRun(true);
  const restored=loadGame(saved).game;
  assert.equal(restored.state.gates[6].wound,true);
  ringGate(restored);
  assert.equal(restored.state.gatesPassed,7);
});

test('one rescued cat acts and retires safely after its gate', () => {
  const {game,saved}=loadGame();ringGate(game);
  const cats=game.state.tiles.filter(t=>t.kind==='cat'&&t.room===1&&t.caged);
  assert.equal(cats.length,1);
  const [miso]=cats;game.freeCat(miso);
  assert.equal(miso.catType,1);
  assert.equal(game.catAbility(miso),true);
  game.state.boostUntil=-99;game.createShot();
  const ball=game.state.active[0];
  Object.assign(ball,{x:miso.roamX+20,y:miso.roamY,vx:0,vy:0});
  assert.equal(game.catHit(miso,ball),true);
  game.saveRun(true);
  const restored=loadGame(saved).game;
  assert.equal(restored.state.tiles.filter(t=>t.kind==='cat'&&!t.caged&&!t.removed&&t.room===1).length,1);
  ringGate(restored);
  assert.equal(restored.state.tiles.filter(t=>t.kind==='cat'&&!t.caged&&!t.removed).length,0);
});

test('a wind fan accelerates existing marbles without creating new ones', () => {
  const {game}=loadGame();ringGate(game);ringGate(game);
  const fan=game.state.kickers.find(k=>k.room===2&&k.kind==='fan');assert.ok(fan);
  game.state.kickers=[fan];game.state.starPegs=[];game.state.cameraY=1040;
  game.state.boostUntil=-99;game.createShot();const ball=game.state.active[0];
  Object.assign(ball,{x:fan.x+30,y:fan.y+55,vx:0,vy:0});
  game.updateContraptions(1/60);
  assert.ok(ball.vy<0);assert.ok(ball.vx>0);assert.equal(game.state.active.length,1);
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

test('rescued cats clear their cage cells, chase marbles, and add running momentum to swats', () => {
  const {game, saved} = loadGame();
  const cat = game.state.tiles.find(t => t.kind === 'cat' && t.room === 0);
  assert.equal(game.freeCat(cat), true);
  assert.equal(game.state.grid[cat.r][cat.c], null);
  game.state.boostUntil = -99;
  assert.equal(game.createShot(), true);
  const marble = game.state.active[0];
  Object.assign(marble, {x: cat.roamX + 125, y: cat.roamY, vx: 0, vy: 0});
  const before = cat.roamX;
  game.step(25);
  assert.ok(cat.roamX > before + 5, `cat should pursue within 150px, moved ${cat.roamX - before}`);
  // The generic paw kick is measured independently from Mochi's directional bat.
  cat.catType = 1;cat.catVX = 150;cat.catVY = -15;cat.lastSwatAt = -99;
  Object.assign(marble, {x: cat.roamX + 20, y: cat.roamY, vx: 0, vy: 0, dead: false});
  assert.equal(game.catHit(cat, marble), true);
  assert.ok(marble.vx > 100);
  assert.ok(marble.vy < -90);
  assert.equal(game.saveRun(true), true);
  const restored = loadGame(saved).game;
  const restoredCat = restored.state.tiles.find(t => t.id === cat.id);
  assert.equal(restoredCat.caged, false);
  assert.equal(restored.state.grid[cat.r][cat.c], null);
});

test('Pepper deposits captured ordinary marbles into a nest instead of spawning extra balls', () => {
  const {game} = loadGame();
  const cat = game.state.tiles.find(t => t.kind === 'cat' && t.room === 0);
  game.freeCat(cat);cat.catType = 2;game.state.boostUntil = -99;
  const nest = game.state.tiles.find(t => t.kind === 'nest' && t.room === 0),before = nest.captures.length;
  cat.roamX=60+(nest.c+.5)*60+100;cat.roamY=137+(nest.r+.5)*52;
  cat.captures.push(...Array.from({length: 3}, () => ({color: '#f7e0ad', t: 0})));
  game.step(2);
  assert.equal(nest.captures.length, before + 3);
  assert.equal(cat.captures.length, 0);
  assert.equal(game.state.active.length, 0);
});

test('Pepper delivery makes a short-lived nest attraction field', () => {
  const {game} = loadGame();
  const cat=game.state.tiles.find(t=>t.kind==='cat'&&t.room===0);
  game.freeCat(cat);cat.catType=2;game.state.boostUntil=-99;
  const nest=game.state.tiles.find(t=>t.kind==='nest'&&t.room===0);
  cat.roamX=60+(nest.c+.5)*60+100;cat.roamY=137+(nest.r+.5)*52;
  cat.captures.push(...Array.from({length:3},()=>({color:'#f7e0ad',t:0})));
  game.step(2);
  assert.ok(nest.lureUntil>game.state.worldTime);
  game.createShot();const b=game.state.active[0];
  Object.assign(b,{x:145,y:215,vx:0,vy:0});
  game.step(1);
  assert.ok(b.vx<0,'the nest pulls nearby marbles inward');
});

test('Miso plans a physical block pickup; Sunny picks one machine to wind', () => {
  const {game} = loadGame();
  const cat = game.state.tiles.find(t => t.kind === 'cat' && t.room === 0);
  game.freeCat(cat);game.state.boostUntil = -99;cat.catType = 1;
  assert.equal(game.catAbility(cat), true);
  assert.equal(cat.job.kind, 'fetch');
  const victim = game.state.tiles.find(t => t.id === cat.job.victimId);
  cat.roamX = 75 + victim.c * 60;cat.roamY = 137 + victim.r * 52;
  game.step(1);
  assert.equal(victim.removed, true);
  assert.equal(cat.job.kind, 'deliver');
  assert.ok(cat.carry);
  const buddy = game.state.tiles.find(t => t.id === cat.job.buddyId);
  const spot = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]
    .map(([dr,dc]) => ({r: buddy.r+dr, c: buddy.c+dc}))
    .find(s => s.r >= 0 && s.c >= 0 && s.c < 9 && !game.state.grid[s.r]?.[s.c]);
  assert.ok(spot);
  cat.roamX = 60 + spot.c * 60 + 70;cat.roamY = 137 + spot.r * 52;
  game.step(1);
  assert.equal(cat.deliveries, 1);
  assert.equal(cat.carry, null);
  cat.catType = 3;
  assert.equal(game.catAbility(cat), true);
  assert.equal(cat.job.kind, 'wind');
  const machine = cat.job.target;
  cat.roamX = machine.x + 80;cat.roamY = machine.y;
  game.step(1);
  const wound = machine.kind === 'kicker' ? game.state.kickers[machine.index] : game.state.tiles.find(t => t.id === machine.id);
  assert.ok(machine.kind === 'kicker' || wound.kind === 'spring' ? wound.boostUntil > game.state.worldTime : wound.spin > 5);
});

test('Miso can autonomously complete a block delivery on a generated board', () => {
  const {game} = loadGame();
  const cat = game.state.tiles.find(t => t.kind === 'cat' && t.room === 0);
  game.freeCat(cat);cat.catType = 1;game.state.boostUntil = -99;
  game.step(1200);
  assert.ok((cat.deliveries || 0) >= 1, `Miso completed ${cat.deliveries || 0} deliveries after 20s`);
});

test('Sunny autonomously reaches an underpowered machine without marble contact', () => {
  const {game} = loadGame();
  const cat = game.state.tiles.find(t => t.kind === 'cat' && t.room === 0);
  game.freeCat(cat);cat.catType = 3;game.state.boostUntil = -99;
  game.step(900);
  assert.ok((cat.winds || 0) >= 1, `Sunny after 15s: ${JSON.stringify({x:cat.roamX,y:cat.roamY,job:cat.job,lastAction:cat.catLastAction})}`);
});

test('a saved mid-jump cat lands safely and remains off the occupied grid', () => {
  const {game, saved} = loadGame();
  const cage = game.state.tiles.find(t => t.kind === 'cat' && t.room === 0);
  game.freeCat(cage);game.state.boostUntil = -99;
  const trio = () => game.state.tiles.filter(t => !t.removed && t.kind === 'cat' && !t.caged && t.room === 0);
  let jumper = null;
  for(let i=0;i<600&&!jumper;i++){game.step(1);jumper=trio().find(u=>u.jump)||null;}
  assert.ok(jumper, 'Blocked cats should find an empty landing spot and hop to it');
  game.saveRun(true);
  const restored=loadGame(saved).game, survivor=restored.state.tiles.find(t => t.id === jumper.id);
  assert.ok(survivor.jump);
  restored.step(60);
  assert.equal(survivor.jump, null);
  assert.notEqual(restored.state.grid[survivor.r][survivor.c], survivor);
});

test('a cat lands on a different open perch if a block occupies its planned jump landing', () => {
  const {game} = loadGame();
  const cat = game.state.tiles.find(t => t.kind === 'cat' && t.room === 0);
  game.freeCat(cat);game.state.boostUntil = -99;
  const target={x:300,y:137+3*52};
  const obstruction=game.createTile(3,4,'sage');
  assert.ok(obstruction);
  game.getPhysics().removeTile(cat);
  cat.jump={fromX:cat.roamX,fromY:cat.roamY,toX:target.x,toY:target.y,start:game.state.worldTime,duration:.2};
  game.step(26);
  assert.equal(cat.jump,null);
  assert.ok(Math.abs(cat.roamX-target.x)>=50||Math.abs(cat.roamY-target.y)>=46,
    'A landing cannot overlap a new solid block');
});

test('an unfinished Miso pickup is returned to a free old-room cell when its room ends', () => {
  const {game} = loadGame();
  const cat = game.state.tiles.find(t => t.kind === 'cat' && t.room === 0);
  game.freeCat(cat);game.state.boostUntil=-99;cat.catType=1;
  assert.equal(game.catAbility(cat),true);
  const victim=game.state.tiles.find(t => t.id === cat.job.victimId);
  cat.roamX=75+victim.c*60;cat.roamY=137+victim.r*52;
  game.step(1);
  const carriedFamily=cat.carry.family,origin=cat.carry.origin;
  assert.ok(game.createTile(origin.r,origin.c,'gold'));
  const before=game.state.tiles.filter(t=>!t.removed&&t.kind==='block'&&t.family===carriedFamily).length;
  ringGate(game);
  assert.equal(cat.removed,true);
  assert.equal(cat.carry,null);
  assert.equal(game.state.tiles.filter(t=>!t.removed&&t.kind==='block'&&t.family===carriedFamily).length,before+1);
  assert.equal(game.state.tiles.filter(t=>!t.removed&&t.kind==='cat'&&!t.caged).length,0);
});

test('a trapped marble is nudged, then relocated within its chamber if it remains trapped', () => {
  const {game} = loadGame();
  game.state.boostUntil=-99;game.createShot();
  const b=game.state.active[0];Object.assign(b,{x:300,y:340,vx:0,vy:0});
  game.state.worldTime=1;game.recoverStuckBall(b);
  game.state.worldTime=1.86;game.recoverStuckBall(b);
  game.state.worldTime=2.72;assert.equal(game.recoverStuckBall(b),true);
  assert.ok(b.vy<-200);assert.equal(b.unstickCount,1);
  const original={x:b.x,y:b.y};
  for(const time of [3.6,4.5,5.4,6.3]){game.state.worldTime=time;game.recoverStuckBall(b);}
  assert.ok(b.unstickCount>=2);
  assert.ok(Math.hypot(b.x-original.x,b.y-original.y)>25);
  assert.ok(Number.isFinite(b.vx)&&Number.isFinite(b.vy));
});

test('a marble looping inside a tiny area is detected even with nonzero velocity', () => {
  const {game} = loadGame();game.state.boostUntil=-99;game.createShot();
  const b=game.state.active[0];b.age=4;
  let nudged=false;
  for(const [i,time] of [0,1,2,3,4,5].map((i)=>[i,i*.9])){
    Object.assign(b,{x:290+(i%2)*35,y:340+((i+1)%2)*25,vx:220,vy:-150});
    game.state.worldTime=time;
    if(game.recoverStuckBall(b))nudged=true;
  }
  assert.equal(nudged,true);
  assert.ok(b.unstickCount>=1);
});

test('cat pulses keep the number of ordinary marbles stable and visibly kick them', () => {
  const {game} = loadGame();
  game.state.boostUntil=-99;game.createShot();
  const b=game.state.active[0];Object.assign(b,{x:360,y:360,vx:0,vy:25});
  const before=game.state.active.length;
  game.catPulse(300,360,155,250,'#f4d46e');
  assert.equal(game.state.active.length,before);
  assert.ok(b.vx>40&&b.vy<0);
  assert.ok(game.state.mergeFX.some(fx=>fx.pulse));
});

test('Mochi requires three swats and cannot repeat a bell assist during cooldown', () => {
  const {game} = loadGame();
  const cat = game.state.tiles.find(t => t.kind === 'cat' && t.room === 0);
  game.freeCat(cat);game.state.boostUntil = -99;
  const gate = game.state.gates[0],bell = game.state.tiles.find(t => t.id === gate.switchIds[0]);
  cat.roamX = 60 + (bell.c + (bell.span-1)/2)*60 + 82;
  cat.roamY = 137 + (bell.r + (bell.span-1)/2)*52 + 65;
  game.createShot();const marble = game.state.active[0];
  const original = gate.bolts[0];
  for(let n=0;n<2;n++){game.state.worldTime += 1;game.catHit(cat, marble);}
  assert.equal(gate.bolts[0], original);
  game.state.worldTime += 1;game.catHit(cat, marble);
  assert.equal(gate.bolts[0], original-1);
  const remaining=gate.bolts[2];
  for(let n=0;n<3;n++){game.state.worldTime += 1;game.catHit(cat, marble);}
  assert.equal(gate.bolts[2], remaining);
});

test('each room has only its own freed cat; previous cats retire at the gate', () => {
  const {game, saved} = loadGame();
  const cats = [];
  for(let room = 0; room < 3; room++){
    const cat = game.state.tiles.find(t => t.kind === 'cat' && t.room === room && t.caged);
    assert.ok(cat,`Room ${room} contains its own cat`);
    assert.equal(game.state.tiles.filter(t => t.kind==='cat' && !t.removed && !t.caged).length,0);
    game.freeCat(cat);cats.push(cat);
    const expected = cat.catType === 0 ? 3 : 1;
    assert.equal(game.state.tiles.filter(t => t.kind==='cat' && !t.removed && !t.caged).length,expected);
    ringGate(game);
    assert.equal(cat.removed,true);
    assert.equal(game.state.tiles.filter(t => t.kind==='cat' && !t.removed && !t.caged).length,0);
  }
  assert.equal(game.state.catsFreed,3);
  assert.ok(game.state.catCollection.has(0)&&game.state.catCollection.has(1)&&game.state.catCollection.has(2));
  assert.equal(game.saveRun(true), true);
  const restored = loadGame(saved).game;
  assert.equal(restored.state.tiles.filter(t => t.kind === 'cat' && !t.caged).length,0);
  assert.equal(restored.state.catsFreed,3);
  const next=restored.state.tiles.find(t=>t.kind==='cat'&&t.caged&&t.room===3);
  assert.ok(next);
  restored.freeCat(next);
  assert.equal(restored.state.tiles.filter(t=>t.kind==='cat'&&!t.caged&&!t.removed).length,1);
});

test('Pepper keeps its collected marbles in the ammo economy when a gate opens', () => {
  const {game}=loadGame();
  const pepper=game.state.tiles.find(t=>t.kind==='cat'&&t.room===0);
  game.freeCat(pepper);pepper.catType=2;
  pepper.captures.push({color:'#e9b55d',t:0},{color:'#8fbab0',t:0});
  const before=game.state.reserve,prize=10;
  ringGate(game);
  assert.equal(game.state.reserve,before+prize+2);
  assert.equal(pepper.captures.length,0);
  assert.ok(pepper.removed);
});

test('loading an older save retires cats that migrated from previous rooms', () => {
  const {game,saved}=loadGame();
  const cat=game.state.tiles.find(t=>t.kind==='cat'&&t.room===0);
  game.freeCat(cat);
  cat.room=1;game.state.gatesPassed=1;
  game.saveRun(true);
  const restored=loadGame(saved).game;
  assert.equal(restored.state.tiles.filter(t=>t.kind==='cat'&&!t.caged&&!t.removed).length,0);
  assert.ok(restored.state.tiles.some(t=>t.kind==='cat'&&t.room===1&&t.caged));
  assert.equal(restored.state.catsFreed,1);
});

test('ten successive rooms keep cats and marbles finite without blocked landings', () => {
  const {game} = loadGame();
  for(let room=0;room<10;room++){
    const cat=game.state.tiles.find(t=>t.kind==='cat'&&t.room===room&&t.caged);
    assert.ok(cat,`Room ${room} has a rescue`);
    game.freeCat(cat);game.state.boostUntil=-99;game.state.boostDisplayed=false;
    ringGate(game);game.step(40);
    for(const t of game.state.tiles.filter(t=>t.kind==='cat'&&!t.caged&&!t.removed)){
      assert.ok(Number.isFinite(t.roamX)&&Number.isFinite(t.roamY));
      if(t.jump)assert.ok(Number.isFinite(t.jump.toX)&&Number.isFinite(t.jump.toY));
    }
    for(const b of game.state.active)assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));
  }
  assert.equal(game.state.gatesPassed,10);
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

test('cat-specific sound cues synthesize within the effect voice budget', () => {
  const events=['swat','fetch','drop','catch','deposit','wind','hop','land','unstick','bell','cage','lever'];
  const notes=[];
  const param=()=>({setValueAtTime(value){notes.push(value);},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>({frequency:param(),gain:param(),Q:{},pan:{},connect(){},disconnect(){},start(){},stop(){}});
  const env=vm.createContext({audio:{currentTime:10,state:'running',createOscillator:node,createBufferSource:node,
    createGain:node,createBiquadFilter:node,createStereoPanner:node},
    state:{soundEnabled:true,chain:0},effectsBus:{},noiseBuffer:{},W:600,
    clamp:(n,a,b)=>Math.max(a,Math.min(b,n))});
  const audioSource=source.slice(source.indexOf('function tone('),source.indexOf('function updateAudioSettings('));
  vm.runInContext(`let voices=0;const soundTimes=new Map(),EFFECT_VOICE_LIMIT=48,GATE_VOICE_RESERVE=18,FAMILY_COLORS=['rose','sage','teal','gold'],NOTES=[261.63,293.66,329.63,392,440,523.25,587.33,659.25];${audioSource}`,env);
  for(const event of events){env.audio.currentTime+=1;vm.runInContext(`sound('${event}',{x:210})`,env);}
  assert.ok(notes.length>events.length*2,'Each interaction should have a layered musical cue');
  assert.ok(vm.runInContext('voices',env)<=48,'Busy interactions should respect the limiter');
});

test('each chamber generates exactly one cat cage', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const {game} = loadGame(new Map(), seed);
    for (let room = 0; room < 8; room++) {
      const cats = game.state.tiles.filter(t => !t.removed && t.kind === 'cat' && t.caged && t.room === room);
      assert.equal(cats.length, 1, `Seed ${seed}, room ${room}: exactly one cage`);
      ringGate(game);
    }
  }
});

test('freed kittens are three independent units spread across the gate', () => {
  const {game} = loadGame();
  const cage = game.state.tiles.find(t => t.kind === 'cat' && t.room === 0);
  game.freeCat(cage);
  assert.equal(cage.catType, 0);
  game.state.boostUntil = -99;
  const trio = () => game.state.tiles.filter(t => !t.removed && t.kind === 'cat' && !t.caged && t.room === 0);
  assert.equal(trio().length, 3);
  const spread = arr => Math.max(...arr) - Math.min(...arr);
  assert.ok(spread(trio().map(t => t.roamX)) > 150, `kittens spread across the gate: ${trio().map(t => t.roamX.toFixed(0))}`);
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
    const [a, b] = [trio()[i], trio()[j]];
    assert.ok(Math.hypot(a.roamX - b.roamX, a.roamY - b.roamY) > 50, `kittens ${i} and ${j} are separate units`);
  }
  const paths = [0, 0, 0];
  let prev = trio().map(t => ({x: t.roamX, y: t.roamY, id: t.id}));
  for (let s = 0; s < 6; s++) {
    game.step(10);
    assert.equal(trio().length, 3);
    const now = trio().map(t => ({x: t.roamX, y: t.roamY, id: t.id}));
    now.forEach((p, i) => {
      const q = prev.find(r => r.id === p.id) || prev[i];
      paths[i] += Math.hypot(p.x - q.x, p.y - q.y);
    });
    prev = now;
  }
  assert.ok(paths.every(p => p > 2), `each kitten roams on its own: ${paths.map(p => p.toFixed(1))}`);
  assert.ok(Math.max(...paths) - Math.min(...paths) > 1, 'kittens do not move identical distances');
  assert.ok(spread(trio().map(t => t.roamX)) > 120, 'trio stays spread instead of collapsing to one unit');
});

test('standalone is generated from the current game, styles, and HTML', () => {
  execFileSync(process.execPath, [new URL('scripts/build-standalone.mjs', root).pathname, '--check']);
});
