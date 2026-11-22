// Velvet Vault — everything the player sees: the dark museum floor, the
// walls and covers, the red guard cones, the green camera arcs, the gold
// loot, the thief, and the HUD (alarm meter, loot, coins, level, timer).
// The HUD is drawn on the canvas so a screenshot always shows the full
// state of the heist in one frame.

import { ALARM, CAMERA, FIELD, GUARD, PALETTE } from './config.js';
import { cameraAngle } from './cameras.js';
import { ROOM } from './level.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';
export const SCREEN_LEVEL = 'level';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, half, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// A soft vignette darkens the room edges, so the lit middle reads as night.
function drawVignette(ctx) {
  const g = ctx.createRadialGradient(640, 384, 260, 640, 384, 780);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
  ctx.strokeStyle = PALETTE.floorTile;
  ctx.lineWidth = 1;
  for (let x = ROOM.x + 80; x < ROOM.x + ROOM.w; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, ROOM.y); ctx.lineTo(x, ROOM.y + ROOM.h); ctx.stroke();
  }
  for (let y = ROOM.y + 80; y < ROOM.y + ROOM.h; y += 80) {
    ctx.beginPath(); ctx.moveTo(ROOM.x, y); ctx.lineTo(ROOM.x + ROOM.w, y); ctx.stroke();
  }
  // A faded velvet carpet down the middle of the room.
  ctx.fillStyle = 'rgba(122, 46, 46, 0.25)';
  ctx.fillRect(ROOM.x + ROOM.w / 2 - 90, ROOM.y, 180, ROOM.h);
}

function drawWallsAndCovers(ctx, room) {
  for (const w of room.walls) {
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(w.x, w.y + 5, w.w, w.h - 5);
  }
  for (const c of room.covers) {
    if (c.kind === 'crate') {
      ctx.fillStyle = PALETTE.coverCrate;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = PALETTE.coverCrateTop;
      ctx.fillRect(c.x + 5, c.y + 5, c.w - 10, c.h - 10);
      ctx.strokeStyle = '#4a3517';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 5, c.y + 5, c.w - 10, c.h - 10);
    } else {
      ctx.fillStyle = PALETTE.coverPlant;
      ctx.beginPath(); ctx.arc(c.x + 32, c.y + 32, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.coverPlantTop;
      ctx.beginPath(); ctx.arc(c.x + 24, c.y + 24, 16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(c.x + 42, c.y + 38, 14, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Room border.
  ctx.strokeStyle = PALETTE.wallTop;
  ctx.lineWidth = 6;
  ctx.strokeRect(ROOM.x - 3, ROOM.y - 3, ROOM.w + 6, ROOM.h + 6);
}

function drawLoot(ctx, room, time) {
  for (const l of room.loot) {
    if (l.taken) continue;
    const bob = Math.sin(time * 2 + l.x) * 3;
    const glow = ctx.createRadialGradient(l.x, l.y + bob, 2, l.x, l.y + bob, 34);
    glow.addColorStop(0, 'rgba(255, 217, 74, 0.5)');
    glow.addColorStop(1, 'rgba(255, 217, 74, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(l.x, l.y + bob, 34, 0, Math.PI * 2); ctx.fill();
    if (l.kind === 'gem') {
      ctx.fillStyle = PALETTE.lootGem;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y - 14 + bob);
      ctx.lineTo(l.x + 12, l.y + bob);
      ctx.lineTo(l.x, l.y + 14 + bob);
      ctx.lineTo(l.x - 12, l.y + bob);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = PALETTE.loot;
      ctx.beginPath(); ctx.arc(l.x, l.y + bob, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath(); ctx.arc(l.x - 3, l.y - 3 + bob, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawExit(ctx, room, allLootTaken, time) {
  const e = room.exit;
  const open = allLootTaken;
  ctx.fillStyle = open ? PALETTE.exitGlow : 'rgba(120, 120, 120, 0.25)';
  ctx.fillRect(e.x - 8, e.y - 8, e.w + 16, e.h + 16);
  ctx.fillStyle = open ? '#12351f' : '#2a2f42';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = open ? PALETTE.exit : '#6a7086';
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = open ? PALETTE.exit : '#9aa3b8';
  ctx.font = 'bold 15px ' + 'system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', e.x + e.w / 2, e.y + e.h / 2 + 5);
  if (open) {
    const pulse = 0.5 + Math.sin(time * 4) * 0.3;
    ctx.fillStyle = 'rgba(61, 220, 132, ' + pulse.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(e.x + e.w / 2, e.y - 14, 7, 0, Math.PI * 2); ctx.fill();
  }
}

function drawThief(ctx, thief, time) {
  const bob = thief.moving ? Math.sin(thief.stepPhase) * 2 : 0;
  ctx.save();
  ctx.translate(thief.x, thief.y + bob);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath(); ctx.ellipse(0, 12, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.thiefCoat;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  // Little mask stripe and the direction the thief faces.
  ctx.strokeStyle = '#232946';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.stroke();
  ctx.strokeStyle = PALETTE.thief;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(thief.facing) * 10, Math.sin(thief.facing) * 10);
  ctx.lineTo(Math.cos(thief.facing) * 18, Math.sin(thief.facing) * 18);
  ctx.stroke();
  ctx.restore();
  if (thief.sneaking) {
    ctx.fillStyle = 'rgba(232, 182, 76, 0.9)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAKING', thief.x, thief.y - 24);
  }
  for (const coin of thief.coinsThrown) {
    const fade = coin.age > 5 ? (6 - coin.age) : 1;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = PALETTE.loot;
    ctx.beginPath(); ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 217, 74, 0.7)';
    ctx.beginPath(); ctx.arc(coin.x, coin.y, 12 + coin.age * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawGuards(ctx, guards, time) {
  for (const g of guards) {
    drawCone(ctx, g.x, g.y, g.angle, GUARD.coneRange, GUARD.coneHalfAngle,
      g.mood === 'alert' ? 'rgba(224, 82, 82, 0.45)' : PALETTE.cone, PALETTE.coneEdge);
  }
  for (const g of guards) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y + 12, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.guardUniform;
    ctx.beginPath(); ctx.arc(g.x, g.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g.mood === 'alert' ? '#ff6b6b' : PALETTE.guard;
    ctx.beginPath(); ctx.arc(g.x, g.y, 9, 0, Math.PI * 2); ctx.fill();
    // Flashlight dot at the cone's tip direction.
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.angle) * 18, g.y + Math.sin(g.angle) * 18, 3, 0, Math.PI * 2);
    ctx.fill();
    if (g.mood === 'alert') {
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 22);
    } else if (g.mood === 'investigate') {
      ctx.fillStyle = '#ffd94a';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 22);
    }
  }
}

function drawCameras(ctx, cameras, time) {
  for (const cam of cameras) {
    const angle = cameraAngle(cam);
    drawCone(ctx, cam.x, cam.y, angle, CAMERA.range, CAMERA.halfAngle,
      PALETTE.cameraArc, PALETTE.cameraArcEdge);
  }
  for (const cam of cameras) {
    const angle = cameraAngle(cam);
    ctx.fillStyle = PALETTE.cameraBody;
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a6274';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.lineTo(cam.x + Math.cos(angle) * 16, cam.y + Math.sin(angle) * 16);
    ctx.stroke();
    ctx.fillStyle = '#ff5b5b';
    ctx.beginPath(); ctx.arc(cam.x + Math.cos(angle) * 16, cam.y + Math.sin(angle) * 16, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function alarmColour(alarm) {
  if (alarm >= ALARM.highAlert) return PALETTE.alarmHigh;
  if (alarm >= 35) return PALETTE.alarmMid;
  return PALETTE.alarmLow;
}

function drawHud(ctx, state) {
  const { alarm, score, lootTaken, lootTotal, coins, levelIndex, timeLeft, message } = state;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, 24, 16, 1232, 58, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VELVET VAULT', 40, 40);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Level ' + (levelIndex + 1) + ' of 3', 40, 60);
  // Alarm meter.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('ALARM', 260, 34);
  ctx.fillStyle = '#2a3040';
  roundRect(ctx, 260, 42, 260, 16, 8);
  ctx.fill();
  ctx.fillStyle = alarmColour(alarm);
  const w = Math.max(0, Math.min(1, alarm / 100)) * 260;
  if (w > 2) { roundRect(ctx, 260, 42, w, 16, 8); ctx.fill(); }
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(Math.round(alarm) + '%', 528, 55);
  // Loot, coins, score, timer.
  ctx.fillStyle = PALETTE.loot;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('◆ Loot ' + lootTaken + '/' + lootTotal, 600, 40);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('● Coins ' + coins, 740, 40);
  ctx.fillText('Score ' + score, 860, 40);
  ctx.fillText('⏱ ' + Math.max(0, Math.ceil(timeLeft)) + 's', 1000, 40);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('WASD move · Shift sneak · Click throw coin · E loot / exit · R restart', 600, 62);
  if (message) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, FIELD.width / 2, 700);
    ctx.textAlign = 'left';
  }
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 8, 16, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = accent || PALETTE.gold;
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, FIELD.width / 2, 300);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, 350 + i * 32);
  });
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Press Enter or click to continue · R to restart', FIELD.width / 2, 350 + lines.length * 32 + 24);
  ctx.textAlign = 'left';
}

/** Draw the whole frame for the current screen and world state. */
export function render(ctx, view) {
  const { screen, room, thief, guards, cameras, time } = view;
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  if (screen === SCREEN_TITLE) {
    drawFloor(ctx);
    drawWallsAndCovers(ctx, room);
    drawLoot(ctx, room, time);
    drawExit(ctx, room, false, time);
    drawGuards(ctx, guards, time);
    drawCameras(ctx, cameras, time);
    drawThief(ctx, thief, time);
    drawVignette(ctx);
    drawOverlay(ctx, 'VELVET VAULT', [
      'A midnight heist in three museum rooms.',
      'Grab every piece of loot, dodge the cones, and slip out the exit.',
      'WASD move · Shift sneak · Click throws a coin · E takes loot',
    ], PALETTE.gold);
    return;
  }
  drawFloor(ctx);
  drawWallsAndCovers(ctx, room);
  drawExit(ctx, room, view.lootTaken === view.lootTotal, time);
  drawLoot(ctx, room, time);
  drawCameras(ctx, cameras, time);
  drawGuards(ctx, guards, time);
  drawThief(ctx, thief, time);
  drawVignette(ctx);
  drawHud(ctx, view);
  if (screen === SCREEN_WIN) {
    drawOverlay(ctx, 'CLEAN GETAWAY!', [
      'Every room emptied. Score: ' + view.score,
      'Loot taken: ' + view.lootTaken + ' · Time left: ' + Math.max(0, Math.ceil(view.timeLeft)) + 's',
      'The Velvet Vault is yours tonight.',
    ], PALETTE.exit);
  } else if (screen === SCREEN_LOSE) {
    const loseTitle = view.loseReason === 'lockdown' ? 'LOCKDOWN!'
      : view.loseReason === 'time' ? 'OUT OF TIME!' : 'CAUGHT!';
    const loseLine = view.loseReason === 'lockdown'
      ? 'The alarm hit 100% and the vault sealed shut.'
      : view.loseReason === 'time'
        ? 'Dawn broke before you slipped out with the loot.'
        : 'A guard got their hands on you.';
    drawOverlay(ctx, loseTitle, [
      loseLine,
      'Score: ' + view.score + ' · Loot taken: ' + view.lootTaken,
      'Press R to try the night again.',
    ], PALETTE.alarmHigh);
  } else if (screen === SCREEN_LEVEL) {
    drawOverlay(ctx, 'ROOM CLEARED!', [
      view.room.def.intro,
      'Score: ' + view.score,
      'Press Enter to slip into the next room.',
    ], PALETTE.exit);
  }
}
