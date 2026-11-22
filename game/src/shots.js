// Velvet Vault — deterministic screenshot scenes behind
// ?shot=cover|play|alarm|win&seed=1. Each scene builds a real room from
// the same rules the player faces, places the thief, guards and cameras
// mid-action, and returns the screen to draw — so every screenshot is a
// true render of the game's own code, and the same seed gives the same frame.

import { ALARM, GUARD } from './config.js';
import { guardAlert } from './guards.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Place a guard mid-patrol between two waypoints, facing along the path. */
function placeGuardMid(guard, t) {
  const a = guard.path[0];
  const b = guard.path[1] || a;
  guard.x = a.x + (b.x - a.x) * t;
  guard.y = a.y + (b.y - a.y) * t;
  guard.angle = Math.atan2(b.y - a.y, b.x - a.x);
  guard.targetIndex = 1;
}

/**
 * Stage the named scene on a live world object and return the screen
 * and alarm level to draw. Unknown names fall back to the cover scene.
 */
export function stageShot(name, world) {
  const scene = name || 'cover';
  if (scene === 'win') {
    world.reset(2);
    world.lootTaken = world.room.loot.length;
    for (const l of world.room.loot) l.taken = true;
    world.score = 1450;
    world.timeLeft = 42;
    world.screen = SCREEN_WIN;
    world.alarm = 18;
    return { screen: SCREEN_WIN, alarm: 18 };
  }
  if (scene === 'alarm') {
    world.reset(1);
    world.thief.x = 700;
    world.thief.y = 380;
    world.thief.sneaking = false;
    world.alarm = 82;
    const g = world.guards[0];
    placeGuardMid(g, 0.55);
    guardAlert(g, world.thief);
    g.x = 640;
    g.y = 340;
    const g2 = world.guards[1];
    placeGuardMid(g2, 0.3);
    world.cameras[0].time = 1.2;
    world.score = 350;
    world.lootTaken = 2;
    world.timeLeft = 96;
    world.screen = SCREEN_PLAY;
    return { screen: SCREEN_PLAY, alarm: 82 };
  }
  if (scene === 'play') {
    world.reset(0);
    world.thief.x = 480;
    world.thief.y = 520;
    world.thief.sneaking = true;
    world.thief.facing = Math.PI / 4;
    world.alarm = 12;
    placeGuardMid(world.guards[0], 0.4);
    placeGuardMid(world.guards[1], 0.6);
    world.cameras[0].time = 0.8;
    world.score = 100;
    world.lootTaken = 1;
    world.room.loot[0].taken = true;
    world.timeLeft = 168;
    world.screen = SCREEN_PLAY;
    return { screen: SCREEN_PLAY, alarm: 12 };
  }
  // Cover: mid-heist in room one, every element in one frame — the room,
  // the thief sneaking past a crate, both guards and their red cones, the
  // green camera arc, gold loot, and the alarm meter at 35%.
  world.reset(0);
  world.thief.x = 560;
  world.thief.y = 470;
  world.thief.sneaking = true;
  world.thief.facing = -Math.PI / 3;
  world.alarm = 35;
  placeGuardMid(world.guards[0], 0.45);
  placeGuardMid(world.guards[1], 0.5);
  world.guards[0].angle = Math.PI / 2;
  world.guards[1].angle = -Math.PI / 2;
  world.cameras[0].time = 0.6;
  world.score = 200;
  world.lootTaken = 1;
  world.room.loot[0].taken = true;
  world.timeLeft = 150;
  world.screen = SCREEN_PLAY;
  return { screen: SCREEN_PLAY, alarm: 35 };
}
