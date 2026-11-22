// Velvet Vault — security cameras: fixed to the wall, sweeping their arc
// back and forth. Their green arc is the danger zone; a thief caught in
// it with a clear line of sight feeds the alarm just like a guard's cone.

import { CAMERA, segmentHitsRect } from './config.js';

/** Fresh camera state from a level definition. */
export function makeCamera(def, index) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    // Stagger the sweep so cameras do not all swing together.
    time: index * 1.7,
  };
}

/** Current aim angle of a camera, sweeping around its base angle. */
export function cameraAngle(cam) {
  return cam.baseAngle + Math.sin(cam.time * CAMERA.sweepSpeed) * cam.sweep;
}

/** Advance a camera's sweep by one fixed step. */
export function stepCamera(cam, dt) {
  cam.time += dt;
}

/** Is the thief inside this camera's arc with a clear line of sight? */
export function cameraSees(cam, thief, blockers) {
  const dx = thief.x - cam.x;
  const dy = thief.y - cam.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA.range) return false;
  let diff = Math.atan2(dy, dx) - cameraAngle(cam);
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > CAMERA.halfAngle) return false;
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(cam.x, cam.y, thief.x, thief.y, blockers[i])) return false;
  }
  return true;
}

/** The arc's edge angles, for the renderer: [start, end] in radians. */
export function cameraArcEdges(cam) {
  const angle = cameraAngle(cam);
  return [angle - CAMERA.halfAngle, angle + CAMERA.halfAngle];
}
