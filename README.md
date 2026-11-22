[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-blue)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![GitHub repo](https://img.shields.io/badge/GitHub-muhamadyusufseptian6--lab-green)](https://github.com/muhamadyusufseptian6-lab/makefun-best-heist-game-20261122-0559)
[![Velvet Vault](https://img.shields.io/badge/Velvet%20Vault-heist%20game-gold)](https://make.fun/bounty/best-heist-game-20261122-0559)

# Velvet Vault — A Midnight Heist

A top-down 2D stealth heist game that plays offline in a desktop browser.
You are the thief. Three museum rooms stand between you and the Velvet
Vault: patrolling guards with red vision cones, sweeping security cameras
with green arcs, and an alarm meter that climbs every second you are seen.

## How to play

- **WASD / arrow keys** — move
- **Shift** — sneak (slow, harder to spot)
- **Mouse click** — throw a coin (3 per room) to lure a guard to the sound
- **E** — pick up loot / slip out the exit once all loot is taken
- **R** — restart the room · **M** — mute · **Enter** — start / continue

Grab every piece of loot (gold 100, gem 250), then reach the glowing EXIT.
If a guard touches you while alerted, you are caught. If the alarm hits
100%, the vault locks down. Each room has at least two routes: a fast front
lane past the guards, or a slow back lane through crates and plants that
block line of sight. You have 180 seconds per room.

## Play it

Serve `game/` with any static server (or `node serve.ts`) and open
`http://localhost:8080`. No network requests, no external files — all art
is drawn on canvas and all sound is synthesized with WebAudio.

Three rooms, escalating: 2 guards + 1 camera, then 3 + 2, then 4 + 3 in
the vault itself. A high alarm makes guards patrol faster, so a sloppy
room gets harder the longer you stay in it.

## Screenshots

Deterministic scenes via `?shot=cover|play|alarm|win&seed=1` — the cover
frame shows the room, the thief, guards and cones, a camera arc, loot,
and the alarm meter in a single shot.

## Build

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `$MAKEFUN_OUTPUT_DIR` (default `/output`) and writes
`dossier.json` with the vendored `vendor/makefun-game.ts` library.

---

Built with [make.fun](https://make.fun/r/515temp1) — referral code `515temp1`.
