// Velvet Vault — the thief. Walks with WASD or arrows, sneaks with Shift
// (slow, harder to spot), throws coins with a mouse click to pull guards
// away, and picks up loot or slips out the exit with E.

import { LOOT, THIEF, clamp } from './config.js';
import { ROOM } from './level.js';

/** Fresh thief state at the room's starting spot. */
export function makeThief(start) {
  return {
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    sneaking: false,
    moving: false,
    facing: -Math.PI / 2,
    coins: THIEF.coins,
    coinsThrown: [],
    stepPhase: 0,
  };
}

/** Push a circle out of every solid rectangle it overlaps. */
export function resolveCollisions(body, radius, solids) {
  for (let i = 0; i < solids.length; i += 1) {
    const r = solids[i];
    const cx = clamp(body.x, r.x, r.x + r.w);
    const cy = clamp(body.y, r.y, r.y + r.h);
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    if (d2 === 0) {
      body.y = r.y - radius;
      continue;
    }
    const d = Math.sqrt(d2);
    body.x = cx + (dx / d) * radius;
    body.y = cy + (dy / d) * radius;
  }
  body.x = clamp(body.x, ROOM.x + THIEF.radius, ROOM.x + ROOM.w - THIEF.radius);
  body.y = clamp(body.y, ROOM.y + THIEF.radius, ROOM.y + ROOM.h - THIEF.radius);
}

/**
 * Move the thief from `input` ({x, y} unit vector, sneak flag) for one step.
 * Returns true while the thief is actually walking.
 */
export function stepThief(thief, input, dt, solids) {
  const speed = input.sneak ? THIEF.sneakSpeed : THIEF.walkSpeed;
  thief.sneaking = input.sneak;
  const len = Math.hypot(input.x, input.y);
  thief.moving = len > 0.1;
  if (thief.moving) {
    const nx = input.x / len;
    const ny = input.y / len;
    thief.x += nx * speed * dt;
    thief.y += ny * speed * dt;
    thief.facing = Math.atan2(ny, nx);
    thief.stepPhase += dt * (input.sneak ? 5 : 11);
  }
  resolveCollisions(thief, THIEF.radius, solids);
  return thief.moving;
}

/** Throw a coin toward (x, y) in room coordinates. Returns the landing spot or null. */
export function throwCoin(thief, x, y) {
  if (thief.coins <= 0) return null;
  thief.coins -= 1;
  const dx = x - thief.x;
  const dy = y - thief.y;
  const dist = Math.hypot(dx, dy);
  const range = Math.min(dist, 260);
  const landing = {
    x: clamp(thief.x + (dist === 0 ? 0 : (dx / dist) * range), ROOM.x + 20, ROOM.x + ROOM.w - 20),
    y: clamp(thief.y + (dist === 0 ? 0 : (dy / dist) * range), ROOM.y + 20, ROOM.y + ROOM.h - 20),
    age: 0,
  };
  thief.coinsThrown.push(landing);
  return landing;
}

/** Age thrown coins; old ones fade away. */
export function stepCoins(thief, dt) {
  for (let i = thief.coinsThrown.length - 1; i >= 0; i -= 1) {
    thief.coinsThrown[i].age += dt;
    if (thief.coinsThrown[i].age > 6) thief.coinsThrown.splice(i, 1);
  }
}

/** Nearest un-taken loot within pickup reach, or null. */
export function lootInReach(thief, lootList) {
  for (let i = 0; i < lootList.length; i += 1) {
    const l = lootList[i];
    if (l.taken) continue;
    if (Math.hypot(l.x - thief.x, l.y - thief.y) < LOOT.pickupDistance) return l;
  }
  return null;
}

/** True when the thief stands in the exit doorway (with a little slack). */
export function atExit(thief, exit) {
  return thief.x > exit.x - 10 && thief.x < exit.x + exit.w + 10
    && thief.y > exit.y - 10 && thief.y < exit.y + exit.h + 10;
}

/** True when the thief can leave: every piece of loot is taken and they are at the door. */
export function canEscape(thief, lootList, exit) {
  for (let i = 0; i < lootList.length; i += 1) {
    if (!lootList[i].taken) return false;
  }
  return atExit(thief, exit);
}
