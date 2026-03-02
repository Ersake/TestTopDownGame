# Multiplayer Co-op Integration Plan (Colyseus)

## Overview

Convert this single-player top-down shmup into a server-authoritative co-op multiplayer game
supporting up to 8 players. All game logic (enemy spawning, collision detection, scoring, bullet
firing) moves to a Colyseus server. Phaser clients send input to the server and render state
received back.

**Tech choices:**
- **Colyseus** — server-side room/state management
- **Vite** — client bundler (required to bundle Colyseus SDK; outputs static files for GitHub Pages)
- **TypeScript** on the server (Schema decorators require it), plain JS kept on the client
- Server hosted on a Node.js relay host (Render / Railway / Fly.io); client hosted on GitHub Pages

---

## Project Structure (after integration)

```
project root
├── index.html
├── vite.config.js          ← new
├── package.json            ← new (client)
├── .env                    ← new (VITE_SERVER_URL)
├── .env.example            ← new (template)
├── MULTIPLAYER_PLAN.md     ← this file
├── phaser.js
├── assets/
├── src/                    ← Phaser client (plain JS)
│   ├── main.js
│   ├── assets.js
│   ├── animation.js
│   ├── network/
│   │   └── RoomClient.js   ← new singleton for Colyseus connection
│   ├── gameObjects/
│   │   ├── Explosion.js    ← still used (visual only)
│   │   ├── Player.js       ← kept but no longer imported (superseded by server state)
│   │   ├── PlayerBullet.js ← kept but no longer imported
│   │   ├── EnemyFlying.js  ← kept but no longer imported
│   │   └── EnemyBullet.js  ← kept but no longer imported
│   └── scenes/
│       ├── Boot.js
│       ├── Preloader.js
│       ├── Start.js
│       ├── Game.js         ← refactored to rendering-only
│       └── GameOver.js
└── server/                 ← new (Colyseus server, TypeScript)
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── schema/
        │   └── GameState.ts
        └── rooms/
            └── ShmupRoom.ts
```

---

## Running Locally

```bash
# Terminal 1 — game server
cd server
npm run server:dev        # Colyseus on ws://localhost:2567
# Colyseus monitor → http://localhost:2567/colyseus

# Terminal 2 — client dev server
npm run client:dev        # Vite on http://localhost:5173
```

Open two browser tabs to test local co-op. Use the Colyseus monitor to inspect room state.

---

## Steps (Completed)

### Phase 1 — Build Tooling & Project Structure ✅

1. Added `package.json` + `vite.config.js` to project root.
   - `vite` and `colyseus.js` installed as client dependencies.
   - `base: './'` set in Vite config for GitHub Pages compatibility.
   - Build outputs to `docs/` for GitHub Pages deployment.
2. Created `server/` with its own `package.json` and `tsconfig.json`.
   - Installed `colyseus`, `@colyseus/core`, `@colyseus/monitor`, `@colyseus/schema`, `express`, `zod`, `typescript`, `ts-node`.
3. Root-level npm scripts added:
   - `client:dev` — Vite dev server
   - `client:build` — builds to `docs/`
   - `server:dev` — TypeScript watch via ts-node
   - `server:start` — compiled production start
4. `.env` with `VITE_SERVER_URL=ws://localhost:2567` for local dev.

---

### Phase 2 — Colyseus State Schemas ✅

`server/src/schema/GameState.ts` — `@colyseus/schema` classes:

| Schema Class | Fields |
|---|---|
| `PlayerState` | `sessionId`, `x`, `y`, `health`, `kills`, `isDead` |
| `EnemyState` | `id`, `x`, `y`, `shipId`, `power`, `health` |
| `PlayerBulletState` | `id`, `x`, `y`, `power`, `ownerId` |
| `EnemyBulletState` | `id`, `x`, `y`, `power` |
| `GameRoomState` | `MapSchema<PlayerState>` players, `MapSchema<EnemyState>` enemies, `MapSchema<PlayerBulletState>` playerBullets, `MapSchema<EnemyBulletState>` enemyBullets, `teamScore`, `gameStarted`, `gameOver` |

---

### Phase 3 — Colyseus Room (Server Game Logic) ✅

`server/src/rooms/ShmupRoom.ts`:

- **`onCreate`**: initialize state; 20 ticks/sec via `setSimulationInterval(50ms)`.
- **`onJoin`**: add `PlayerState`; set `gameStarted = true` on first join; enforce `maxClients: 8`.
- **`onLeave`**: remove player; trigger game over if all players gone/dead.
- **`onMessage("input")`**: store `{ left, right, up, down, fire }` per `sessionId`.
- **Tick logic**:
  - Delta-time physics matching the original Phaser values (accel 3000 px/s², drag 1000 px/s², maxVel 500 px/s)
  - CatmullRom spline path for enemies (matches `Phaser.Curves.Spline`)
  - Player/enemy bullet spawning with cooldowns
  - AABB collision detection (player bullets vs enemies, enemy bullets vs players, enemies vs players)
  - `teamScore` (+10 per kill) and per-player `kills`
  - `gameOver` when all players dead

---

### Phase 4 — Server Entry Point ✅

`server/src/index.ts`:
- Express HTTP server + Colyseus `Server`
- Registers `ShmupRoom` as `"shmup_room"`
- Exposes `/colyseus` monitor endpoint

---

### Phase 5 — Client Networking Layer ✅

`src/network/RoomClient.js`:
- Singleton wrapping the Colyseus `Client`
- `connect()` — reads `VITE_SERVER_URL` and calls `joinOrCreate("shmup_room")`
- `sendInput(input)` — sends input diff to server (only transmits on state change)

---

### Phase 6 — Refactored Game.js ✅

`src/scenes/Game.js` is now **rendering-only**:

- `initNetworking()` replaces `initPhysics()` + `initPlayer()`
- Registers `onAdd`/`onRemove`/`onChange` for all four schema maps
- HUD shows: team score (top-left), local player kills (top-right, yellow), player count (top-right)
- Remote players rendered in cyan tint; local player uses original ship frame 8
- Player positions lerped toward server values for smooth rendering at 60 fps
- `update()` only calls `updateMap()` (visual scroll) + `sendInput()`
- Game over triggers on `state.gameOver`; Space rejoin calls `RoomClient.connect()` and re-registers listeners
- Tilemap scrolling is unchanged (purely visual, client-side)

---

### Phase 7 — Deployment Prep (TODO)

- `vite.config.js` already configured to build to `docs/` for GitHub Pages
- Deploy server to Render / Railway / Fly.io
- Set `VITE_SERVER_URL` in `.env` (local) or deployment env vars (production)
  - Local: `ws://localhost:2567`
  - Production: `wss://your-server.onrender.com`
- GitHub Actions workflow can push `docs/` to `gh-pages` branch (optional)

---

## Known Bugs Fixed During Integration

| # | Location | Fix |
|---|---|---|
| 1 | `Game.js` `removeEnemyBullet()` | Was calling `playerBulletGroup.remove()` — enemy bullet cleanup now handled server-side |
| 2 | `GameOver.js` `create()` | References unloaded `'background'` asset — this scene is still never visited (game over handled in-scene) |

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Server-authoritative | Consistent state across all clients, prevents cheating, single source of truth |
| TypeScript server / JS client | Schema decorators require TS; avoids adding a build step to existing JS client |
| Vite on client | Required to bundle `colyseus.js` npm package; enables GitHub Pages deployment |
| 20 ticks/sec server rate | Sufficient for a shmup; keeps bandwidth low; client lerps sprite positions for smoothness |
| `docs/` build output | GitHub Pages can serve directly from `/docs` folder without a separate branch |
| Up to 8 players | `maxClients: 8` on ShmupRoom; all players share the same enemy wave |
| Both individual + team score | `kills` per `PlayerState`, `teamScore` on `GameRoomState` |
