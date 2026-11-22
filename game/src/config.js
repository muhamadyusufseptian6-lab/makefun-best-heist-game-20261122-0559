// Velvet Vault — every tuning number and colour in one place.
// Night rules in short: sneak slow and quiet, coins pull guards away,
// the alarm climbs in any cone or camera arc and falls when you hide.
// The playfield is a fixed 1280x720 logical area; the renderer scales it
// to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** Fixed simulation step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  walkSpeed: 175,
  sneakSpeed: 78,
  coins: 3,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 128,
  coneRange: 225,
  coneHalfAngle: 0.62,
  // Alarm points per second while the thief is inside a live cone.
  spotRate: 34,
  spotRateSneak: 15,
  // Seconds a guard keeps investigating a thrown coin.
  investigateTime: 4.5,
  // Seconds a guard stays alerted after losing sight of the thief.
  alertMemory: 3.0,
  catchDistance: 26,
};

export const CAMERA = {
  range: 265,
  halfAngle: 0.5,
  sweepSpeed: 0.55,
  spotRate: 26,
};

export const ALARM = {
  decayPerSecond: 9,
  // Alarm level at which the room locks down and the run ends.
  lockdown: 100,
  // Alarm level at which guards go on high alert and patrol faster.
  highAlert: 60,
};

export const LOOT = { radius: 15, pickupDistance: 34 };
export const EXIT = { width: 64, height: 84 };

export const PALETTE = {
  backdrop: '#0b0d16',
  floor: '#171a26',
  floorTile: '#1d2133',
  wall: '#3a415c',
  wallTop: '#4d5578',
  coverCrate: '#6b4f2a',
  coverCrateTop: '#8a6a38',
  coverPlant: '#2e6b3a',
  coverPlantTop: '#3f8f4f',
  thief: '#e8b64c',
  thiefCoat: '#232946',
  guard: '#c94f4f',
  guardUniform: '#7a2e2e',
  cone: 'rgba(224, 82, 82, 0.28)',
  coneEdge: 'rgba(224, 82, 82, 0.55)',
  cameraArc: 'rgba(86, 214, 130, 0.22)',
  cameraArcEdge: 'rgba(86, 214, 130, 0.6)',
  cameraBody: '#9aa3b2',
  loot: '#ffd94a',
  lootGem: '#7ee7ff',
  exit: '#3ddc84',
  exitGlow: 'rgba(61, 220, 132, 0.35)',
  alarmLow: '#3ddc84',
  alarmMid: '#ffb020',
  alarmHigh: '#e5484d',
  text: '#eef1f5',
  muted: '#9aa3b8',
  panel: 'rgba(10, 12, 22, 0.82)',
  gold: '#ffd94a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Seeded random generator (mulberry32): the same seed always deals the same night. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clamp a number into [lo, hi]. */
export function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

/** True when segment (ax,ay)-(bx,by) hits rectangle r. Used for line-of-sight. */
export function segmentHitsRect(ax, ay, bx, by, r) {
  const dx = bx - ax;
  const dy = by - ay;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (ax < r.x || ax > r.x + r.w) return false;
  } else {
    let t1 = (r.x - ax) / dx;
    let t2 = (r.x + r.w - ax) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (ay < r.y || ay > r.y + r.h) return false;
  } else {
    let t1 = (r.y - ay) / dy;
    let t2 = (r.y + r.h - ay) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}
