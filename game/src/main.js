// Velvet Vault — game loop and state machine. Title, play, room-cleared,
// getaway win, and caught/lockdown lose screens; fixed-step simulation
// at 60 Hz; keyboard + mouse input; deterministic screenshot scenes via
// ?shot=cover|play|alarm|win&seed=1.

import { ALARM, CAMERA, FIELD, GUARD, PALETTE, STEP, clamp, makeRng } from './config.js';
import { buildRoom, solidRects } from './level.js';
import { cameraSees, makeCamera, stepCamera } from './cameras.js';
import { guardAlert, guardSees, guardsHearCoin, makeGuard, stepGuard } from './guards.js';
import { atExit, canEscape, lootInReach, makeThief, stepCoins, stepThief, throwCoin } from './player.js';
import { SCREEN_LEVEL, SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, render } from './render.js';
import { stageShot } from './shots.js';
import { ensureAudio, soundAlarm, soundCaught, soundCoin, soundDoor, soundLoot, soundStep, soundWin, toggleMute } from './audio.js';

const LEVEL_SECONDS = 180;
const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shotName = params.get('shot');
const rng = makeRng(seed * 2654435761);

function resize() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = Math.round(FIELD.width * scale * (window.devicePixelRatio || 1));
  canvas.height = Math.round(FIELD.height * scale * (window.devicePixelRatio || 1));
  canvas.style.width = Math.round(FIELD.width * scale) + 'px';
  canvas.style.height = Math.round(FIELD.height * scale) + 'px';
}

const world = {
  levelIndex: 0,
  room: null,
  thief: null,
  guards: [],
  cameras: [],
  solids: [],
  blockers: [],
  alarm: 0,
  score: 0,
  lootTaken: 0,
  timeLeft: LEVEL_SECONDS,
  screen: SCREEN_TITLE,
  loseReason: null,
  message: '',
  time: 0,
  stepCount: 0,
  lastStepSound: 0,
  alarmSoundAt: 0,
  // Screenshot scenes are still frames: when frozen, the loop draws but
  // never advances the simulation, so the staged alarm and poses hold.
  frozen: false,
  reset(levelIndex) {
    this.levelIndex = levelIndex;
    this.room = buildRoom(levelIndex);
    this.thief = makeThief(this.room.thiefStart);
    this.guards = this.room.def.guards.map((g) => makeGuard(g));
    this.cameras = this.room.def.cameras.map((c, i) => makeCamera(c, i));
    this.solids = solidRects(this.room);
    // Vision blockers: walls and covers only (not the outer bounds).
    this.blockers = [...this.room.walls, ...this.room.covers];
    this.alarm = 0;
    this.lootTaken = 0;
    this.timeLeft = LEVEL_SECONDS;
    this.screen = SCREEN_PLAY;
    this.loseReason = null;
    this.message = '';
    this.time = 0;
    this.stepCount = 0;
  },
};

const keys = new Set();
let mouse = { x: 0, y: 0, clicked: false };

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (FIELD.width / rect.width),
    y: (event.clientY - rect.top) * (FIELD.height / rect.height),
  };
}

function inputVector() {
  let x = 0;
  let y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  return { x, y, sneak: keys.has('ShiftLeft') || keys.has('ShiftRight') };
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function startLevel(index) {
  world.reset(index);
  announce(world.room.def.name + '. ' + world.room.def.intro);
}

function nextLevel() {
  if (world.levelIndex + 1 >= 3) {
    world.screen = SCREEN_WIN;
    soundWin();
    announce('Clean getaway! You emptied the Velvet Vault.');
    return;
  }
  world.score += Math.round(world.timeLeft) * 2;
  world.levelIndex += 1;
  world.screen = SCREEN_LEVEL;
  announce('Room cleared! Press Enter for the next room.');
}

function lose(reason) {
  world.screen = SCREEN_LOSE;
  world.loseReason = reason;
  soundCaught();
  announce(reason === 'lockdown' ? 'Lockdown! The alarm hit 100%.' : 'Caught by a guard.');
}

function tryInteract() {
  if (world.screen !== SCREEN_PLAY) return;
  const loot = lootInReach(world.thief, world.room.loot);
  if (loot) {
    loot.taken = true;
    world.lootTaken += 1;
    world.score += loot.value;
    world.message = loot.kind === 'gem' ? 'Gem pocketed! +' + loot.value : 'Gold pocketed! +' + loot.value;
    soundLoot();
    if (world.lootTaken === world.room.loot.length) {
      world.message = 'All loot taken — get to the EXIT!';
      soundDoor();
    }
    return;
  }
  if (canEscape(world.thief, world.room.loot, world.room.exit)) {
    world.score += 500;
    soundDoor();
    nextLevel();
  } else if (atExit(world.thief, world.room.exit)) {
    world.message = 'The exit is locked — take all the loot first!';
  }
}

function step(dt) {
  if (world.frozen) return;
  world.time += dt;
  world.stepCount += 1;
  if (world.screen !== SCREEN_PLAY) return;
  world.timeLeft -= dt;
  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    lose('time');
    return;
  }
  const input = inputVector();
  const moving = stepThief(world.thief, input, dt, world.solids);
  if (moving && world.time - world.lastStepSound > (input.sneak ? 0.45 : 0.28)) {
    world.lastStepSound = world.time;
    soundStep(input.sneak);
  }
  stepCoins(world.thief, dt);
  if (mouse.clicked) {
    mouse.clicked = false;
    const landing = throwCoin(world.thief, mouse.x, mouse.y);
    if (landing) {
      guardsHearCoin(world.guards, landing.x, landing.y, 320);
      soundCoin();
      world.message = 'Coin thrown — a guard goes to listen.';
    } else {
      world.message = 'Out of coins!';
    }
  }
  const alarmHigh = world.alarm >= ALARM.highAlert;
  let seen = false;
  for (const g of world.guards) {
    const caught = stepGuard(g, dt, world.thief, world.blockers, alarmHigh);
    if (caught === 'caught') {
      lose('caught');
      return;
    }
    if (guardSees(g, world.thief, world.blockers)) {
      seen = true;
      world.alarm += (world.thief.sneaking ? GUARD.spotRateSneak : GUARD.spotRate) * dt;
      guardAlert(g, world.thief);
    }
  }
  for (const cam of world.cameras) {
    stepCamera(cam, dt);
    if (cameraSees(cam, world.thief, world.blockers)) {
      seen = true;
      world.alarm += CAMERA.spotRate * dt;
    }
  }
  if (!seen) {
    world.alarm = Math.max(0, world.alarm - ALARM.decayPerSecond * dt);
  } else if (world.alarm >= 50 && world.time - world.alarmSoundAt > 1.2) {
    world.alarmSoundAt = world.time;
    soundAlarm();
  }
  world.alarm = clamp(world.alarm, 0, 100);
  if (world.alarm >= ALARM.lockdown) {
    lose('lockdown');
    return;
  }
  if (world.message && world.stepCount % 180 === 0) world.message = '';
}

function draw() {
  const scale = canvas.width / FIELD.width;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  render(ctx, {
    screen: world.screen,
    room: world.room,
    thief: world.thief,
    guards: world.guards,
    cameras: world.cameras,
    time: world.time,
    alarm: world.alarm,
    score: world.score,
    lootTaken: world.lootTaken,
    lootTotal: world.room.loot.length,
    coins: world.thief.coins,
    levelIndex: world.levelIndex,
    timeLeft: world.timeLeft,
    message: world.message,
    loseReason: world.loseReason,
  });
}

let last = performance.now();
let accumulator = 0;
function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  accumulator += elapsed;
  while (accumulator >= STEP) {
    step(STEP);
    accumulator -= STEP;
  }
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  ensureAudio();
  keys.add(event.code);
  if (event.code === 'KeyE') tryInteract();
  if (event.code === 'KeyR') startLevel(world.levelIndex);
  if (event.code === 'Enter') {
    if (world.screen === SCREEN_TITLE) startLevel(0);
    else if (world.screen === SCREEN_LEVEL) startLevel(world.levelIndex + 1);
    else if (world.screen === SCREEN_WIN || world.screen === SCREEN_LOSE) startLevel(0);
  }
  if (event.code === 'KeyM') {
    const nowMuted = toggleMute();
    world.message = nowMuted ? 'Sound off (M to turn back on).' : 'Sound on.';
  }
});

window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

canvas.addEventListener('mousedown', (event) => {
  ensureAudio();
  const p = canvasPoint(event);
  mouse.x = p.x;
  mouse.y = p.y;
  if (world.screen === SCREEN_TITLE) {
    startLevel(0);
    return;
  }
  if (world.screen === SCREEN_LEVEL) {
    startLevel(world.levelIndex + 1);
    return;
  }
  if (world.screen === SCREEN_WIN || world.screen === SCREEN_LOSE) {
    startLevel(0);
    return;
  }
  mouse.clicked = true;
});

canvas.addEventListener('mousemove', (event) => {
  const p = canvasPoint(event);
  mouse.x = p.x;
  mouse.y = p.y;
});

window.addEventListener('resize', resize);

resize();
world.reset(0);
world.screen = SCREEN_TITLE;
if (shotName) {
  const staged = stageShot(shotName, world);
  world.screen = staged.screen;
  world.alarm = staged.alarm;
  world.frozen = true;
  world.time = 3.2;
  announce('Velvet Vault screenshot scene: ' + shotName);
} else {
  announce('Velvet Vault. Press Enter to start the heist.');
}
requestAnimationFrame(frame);
