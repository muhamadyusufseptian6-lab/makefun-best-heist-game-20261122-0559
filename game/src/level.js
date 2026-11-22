// Velvet Vault — the three museum rooms. Each room is one night's job:
// walls shape the space, covers block sight, loot waits in the open or
// behind a patrol, and the exit only opens once every piece is taken.
// Every room has at least two routes: a fast front lane past the guards
// and a slow back lane through the covers. Loot values: gold 100, gem 250;
// escaping a room pays 500 plus 2 points per second left on the clock.

export const ROOM = { x: 48, y: 96, w: 1184, h: 576 };

function wall(x, y, w, h) { return { x, y, w, h }; }
function cover(x, y, w, h, kind) { return { x, y, w, h, kind }; }
function loot(x, y, kind, value) { return { x, y, kind, value, taken: false }; }
function guardPath(points) { return { points, index: 0, forward: true }; }
function camera(x, y, baseAngle, sweep) { return { x, y, baseAngle, sweep }; }

export const LEVELS = [
  {
    name: 'Gallery of Gilded Frames',
    intro: 'Level 1 — two guards, one camera. Learn the cones.',
    thiefStart: { x: 110, y: 620 },
    exit: { x: 1160, y: 120, w: 64, h: 84 },
    walls: [
      wall(300, 220, 200, 26),
      wall(300, 460, 200, 26),
      wall(760, 220, 200, 26),
      wall(760, 460, 200, 26),
    ],
    covers: [
      cover(560, 300, 64, 64, 'crate'),
      cover(560, 420, 64, 64, 'plant'),
      cover(180, 300, 64, 64, 'plant'),
      cover(1020, 420, 64, 64, 'crate'),
    ],
    loot: [
      loot(400, 340, 'gold', 100),
      loot(880, 340, 'gold', 100),
      loot(640, 620, 'gem', 250),
    ],
    guards: [
      guardPath([{ x: 360, y: 160 }, { x: 360, y: 600 }]),
      guardPath([{ x: 920, y: 600 }, { x: 920, y: 160 }]),
    ],
    cameras: [camera(640, 130, Math.PI / 2, 0.9)],
  },
  {
    name: 'Hall of the Jade Serpent',
    intro: 'Level 2 — three guards, two cameras. The back lane pays off.',
    thiefStart: { x: 110, y: 140 },
    exit: { x: 1160, y: 560, w: 64, h: 84 },
    walls: [
      wall(260, 300, 26, 220),
      wall(620, 180, 26, 220),
      wall(900, 300, 26, 220),
      wall(420, 520, 260, 26),
    ],
    covers: [
      cover(340, 180, 64, 64, 'crate'),
      cover(700, 420, 64, 64, 'plant'),
      cover(980, 180, 64, 64, 'plant'),
      cover(180, 420, 64, 64, 'crate'),
      cover(1060, 520, 64, 64, 'crate'),
    ],
    loot: [
      loot(480, 180, 'gold', 100),
      loot(800, 620, 'gold', 100),
      loot(1080, 340, 'gem', 250),
      loot(640, 340, 'gold', 100),
    ],
    guards: [
      guardPath([{ x: 300, y: 620 }, { x: 300, y: 160 }]),
      guardPath([{ x: 760, y: 160 }, { x: 760, y: 620 }]),
      guardPath([{ x: 1080, y: 160 }, { x: 1080, y: 620 }]),
    ],
    cameras: [
      camera(640, 130, Math.PI / 2, 1.0),
      camera(640, 640, -Math.PI / 2, 1.0),
    ],
  },
  {
    name: 'The Velvet Vault',
    intro: 'Level 3 — the vault itself. Four guards, three cameras, no mercy.',
    thiefStart: { x: 640, y: 620 },
    exit: { x: 640, y: 120, w: 64, h: 84 },
    walls: [
      wall(220, 220, 220, 26),
      wall(840, 220, 220, 26),
      wall(220, 460, 220, 26),
      wall(840, 460, 220, 26),
      wall(620, 300, 40, 140),
    ],
    covers: [
      cover(480, 180, 64, 64, 'plant'),
      cover(736, 180, 64, 64, 'plant'),
      cover(480, 520, 64, 64, 'crate'),
      cover(736, 520, 64, 64, 'crate'),
      cover(180, 340, 64, 64, 'crate'),
      cover(1036, 340, 64, 64, 'plant'),
    ],
    loot: [
      loot(330, 340, 'gold', 100),
      loot(950, 340, 'gold', 100),
      loot(640, 380, 'gem', 250),
      loot(640, 220, 'gem', 250),
      loot(180, 620, 'gold', 100),
    ],
    guards: [
      guardPath([{ x: 280, y: 160 }, { x: 280, y: 600 }]),
      guardPath([{ x: 1000, y: 600 }, { x: 1000, y: 160 }]),
      guardPath([{ x: 480, y: 600 }, { x: 480, y: 160 }]),
      guardPath([{ x: 800, y: 160 }, { x: 800, y: 600 }]),
    ],
    cameras: [
      camera(640, 130, Math.PI / 2, 0.8),
      camera(160, 640, -Math.PI / 2, 1.1),
      camera(1120, 640, -Math.PI / 2, 1.1),
    ],
  },
];

/** Deep-copy a level definition into a fresh, mutable room state. */
export function buildRoom(levelIndex) {
  const def = LEVELS[levelIndex];
  return {
    def,
    index: levelIndex,
    walls: def.walls.map((r) => ({ ...r })),
    covers: def.covers.map((r) => ({ ...r })),
    loot: def.loot.map((l) => ({ ...l, taken: false })),
    exit: { ...def.exit },
    thiefStart: { ...def.thiefStart },
  };
}

/** Every solid rectangle in the room (outer bounds, walls, covers). */
export function solidRects(room) {
  const r = ROOM;
  return [
    { x: r.x - 24, y: r.y - 24, w: r.w + 48, h: 24 },
    { x: r.x - 24, y: r.y + r.h, w: r.w + 48, h: 24 },
    { x: r.x - 24, y: r.y, w: 24, h: r.h },
    { x: r.x + r.w, y: r.y, w: 24, h: r.h },
    ...room.walls,
    ...room.covers,
  ];
}
