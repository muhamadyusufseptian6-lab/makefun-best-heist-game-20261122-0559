// Velvet Vault — guards: patrol waypoints, vision cones, and the
// line-of-sight test that decides whether the thief is actually seen.
// A guard has three moods: patrolling, investigating a coin's clink, and
// alerted (chasing the last place the thief was seen).

import { GUARD, STEP, clamp, segmentHitsRect } from './config.js';

/** Fresh guard state from a patrol definition. */
export function makeGuard(pathDef) {
  const start = pathDef.points[0];
  return {
    x: start.x,
    y: start.y,
    angle: Math.PI / 2,
    path: pathDef.points.map((p) => ({ ...p })),
    targetIndex: 1,
    forward: true,
    mood: 'patrol',
    investigate: null,
    alertTimer: 0,
    lastSeen: null,
    // Small per-guard offset so patrols do not march in lockstep.
    phase: 0,
  };
}

/** Angle from the guard toward a point. */
export function angleTo(g, x, y) {
  return Math.atan2(y - g.y, x - g.x);
}

/** True when any rectangle in `rects` blocks the view from (ax,ay) to (bx,by). */
export function blocked(ax, ay, bx, by, rects) {
  for (let i = 0; i < rects.length; i += 1) {
    if (segmentHitsRect(ax, ay, bx, by, rects[i])) return true;
  }
  return false;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Is the thief inside this guard's vision cone with a clear line of sight? */
export function guardSees(g, thief, blockers) {
  const dx = thief.x - g.x;
  const dy = thief.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.coneRange) return false;
  if (dist < 30) return !blocked(g.x, g.y, thief.x, thief.y, blockers);
  const diff = Math.abs(angleDiff(Math.atan2(dy, dx), g.angle));
  if (diff > GUARD.coneHalfAngle) return false;
  return !blocked(g.x, g.y, thief.x, thief.y, blockers);
}

function moveToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  g.x += (dx / dist) * step;
  g.y += (dy / dist) * step;
  g.angle = Math.atan2(dy, dx);
  return dist <= speed * dt + 1;
}

/** Advance one guard one fixed step. Returns 'caught' if it touches the thief. */
export function stepGuard(g, dt, thief, blockers, alarmHigh) {
  const speedBoost = alarmHigh ? 1.25 : 1;
  if (g.mood === 'alert' && g.lastSeen) {
    const arrived = moveToward(g, g.lastSeen.x, g.lastSeen.y, GUARD.chaseSpeed * speedBoost, dt);
    if (arrived) {
      g.mood = 'patrol';
      g.alertTimer = 0;
    }
    g.alertTimer -= dt;
    if (g.alertTimer <= 0) {
      g.mood = 'patrol';
      g.lastSeen = null;
    }
  } else if (g.mood === 'investigate' && g.investigate) {
    const arrived = moveToward(g, g.investigate.x, g.investigate.y, GUARD.patrolSpeed * 1.4, dt);
    g.investigate.time -= dt;
    if (arrived || g.investigate.time <= 0) {
      g.mood = 'patrol';
      g.investigate = null;
    }
  } else {
    const target = g.path[g.targetIndex];
    const arrived = moveToward(g, target.x, target.y, GUARD.patrolSpeed * speedBoost, dt);
    if (arrived) {
      if (g.forward) {
        g.targetIndex += 1;
        if (g.targetIndex >= g.path.length) {
          g.targetIndex = g.path.length - 2;
          g.forward = false;
        }
      } else {
        g.targetIndex -= 1;
        if (g.targetIndex < 0) {
          g.targetIndex = 1;
          g.forward = true;
        }
      }
    }
  }
  const dx = thief.x - g.x;
  const dy = thief.y - g.y;
  if (Math.hypot(dx, dy) < GUARD.catchDistance && g.mood !== 'patrol') return 'caught';
  if (Math.hypot(dx, dy) < GUARD.catchDistance - 8) return 'caught';
  return null;
}

/** A guard spots the thief: remember where, and start the chase. */
export function guardAlert(g, thief) {
  g.mood = 'alert';
  g.lastSeen = { x: thief.x, y: thief.y };
  g.alertTimer = GUARD.alertMemory;
  g.investigate = null;
}

/** Send every guard within earshot toward the coin's landing spot. */
export function guardsHearCoin(guards, x, y, radius) {
  for (let i = 0; i < guards.length; i += 1) {
    const g = guards[i];
    if (g.mood === 'alert') continue;
    const dist = Math.hypot(g.x - x, g.y - y);
    if (dist < radius) {
      g.mood = 'investigate';
      g.investigate = { x, y, time: GUARD.investigateTime };
    }
  }
}
