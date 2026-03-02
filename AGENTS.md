# AGENTS.md — Developer Guide & Best Practices

This document is the canonical reference for working on this project. Read it before making changes.

---

## Architecture Overview

This is a **server-authoritative co-op multiplayer shmup** built with Phaser 3 and Colyseus.

```
┌─────────────────────────────────┐       WebSocket (ws://)      ┌──────────────────────────────┐
│  Browser (Phaser 3 client)      │ ◄──────────────────────────► │  Colyseus Server (Node.js)   │
│                                 │                               │                              │
│  src/scenes/Game.js             │   sends: "input" message      │  server/src/rooms/           │
│    - renders sprites from state │   { left, right, up,          │    ShmupRoom.ts              │
│    - lerps positions            │     down, fire }              │    - runs game tick at 20/s  │
│    - sends keyboard input       │                               │    - moves players           │
│                                 │   receives: state patches     │    - moves enemies           │
│  src/network/RoomClient.js      │   (Colyseus schema diff)      │    - fires bullets           │
│    - singleton Colyseus client  │                               │    - AABB collision          │
│    - joinOrCreate("shmup_room") │                               │    - updates score           │
└─────────────────────────────────┘                               └──────────────────────────────┘
```

### Key principle: the client never mutates game state

The Phaser client is a **dumb renderer**. It:
- Reads `room.state` (pushed by Colyseus schema patches)
- Sends raw keyboard input to the server each frame (on change only)
- Spawns/destroys/moves sprites based on state changes

All physics, collision, spawning, scoring, and win/loss logic lives in `ShmupRoom.ts`.

---

## Repository Layout

```
/
├── src/                    Phaser client (plain JavaScript, ES modules)
│   ├── main.js             Entry point — connects to server, then launches Phaser
│   ├── assets.js           Asset key/path registry
│   ├── animation.js        Animation config registry
│   ├── network/
│   │   └── RoomClient.js   Colyseus connection singleton
│   ├── gameObjects/
│   │   └── Explosion.js    Visual-only sprite (still used by Game.js)
│   └── scenes/
│       ├── Boot.js         → Preloader
│       ├── Preloader.js    Loads spritesheets → Game
│       ├── Game.js         Main scene (rendering only)
│       ├── Start.js        Skeleton (currently unused)
│       └── GameOver.js     Skeleton (currently unused; game over handled in-scene)
├── server/                 Colyseus server (TypeScript)
│   ├── src/
│   │   ├── index.ts        Express + Colyseus server entry point
│   │   ├── schema/
│   │   │   └── GameState.ts  @colyseus/schema definitions (synced to all clients)
│   │   └── rooms/
│   │       └── ShmupRoom.ts  All game logic
│   ├── package.json
│   └── tsconfig.json
├── assets/                 Game sprites (ships.png, tiles.png)
├── index.html              Single HTML page mounting Phaser
├── phaser.js               Phaser 3 standalone bundle (loaded as global script)
├── vite.config.js          Vite config — base './', builds to docs/
├── package.json            Client deps + convenience npm scripts
├── .env                    Local env vars (do not commit secrets)
├── .env.example            Template — commit this, not .env
├── MULTIPLAYER_PLAN.md     Full integration plan and architecture decisions
└── AGENTS.md               This file
```

---

## Running Locally

You need two terminals running simultaneously.

### Terminal 1 — Game Server

```bash
cd server
npm install          # first time only
npm run server:dev   # starts Colyseus on ws://localhost:2567
```

The server uses `ts-node` to run TypeScript directly (no build step needed in dev).

Colyseus monitor (inspect live rooms and state):
```
http://localhost:2567/colyseus
```

### Terminal 2 — Client Dev Server

```bash
# from project root
npm install          # first time only
npm run client:dev   # starts Vite on http://localhost:5173
```

Open `http://localhost:5173` in two browser tabs to test co-op locally.

### Environment Variables

The client reads `VITE_SERVER_URL` to find the server. The `.env` file (already created) sets it for local dev:

```
VITE_SERVER_URL=ws://localhost:2567
```

To point at a deployed server, change this value or set the variable in your deployment environment.

---

## Making Changes

### Adding a new synced state field

1. Add the field to the relevant schema class in `server/src/schema/GameState.ts` with a `@type(...)` decorator.
2. Update `ShmupRoom.ts` to write to it in the tick or on game events.
3. Subscribe to it in `src/scenes/Game.js` using `state.listen(...)` or `entity.onChange(...)`.

### Changing physics constants

Both values must stay in sync:

| Constant | Server (`ShmupRoom.ts`) | Client |
|---|---|---|
| Player acceleration | `PLAYER_ACCEL = 3000` | _not needed (server-driven)_ |
| Player max velocity | `PLAYER_MAX_VEL = 500` | _not needed_ |
| Player drag | `PLAYER_DRAG = 1000` | _not needed_ |
| Fire rate | `FIRE_RATE_MS = 167` | _not needed_ |
| Bullet speed | `P_BULLET_VEL = 1000` | _not needed_ |

All physics is server-side only. If you change a constant, only edit `ShmupRoom.ts`.

### Adding a new game object type

1. Add a new `Schema` class in `GameState.ts` (e.g. `PowerUpState`).
2. Add a `MapSchema<PowerUpState>` field to `GameRoomState`.
3. Add server-side logic (spawn, tick, collision) in `ShmupRoom.ts`.
4. In `Game.js`, register `state.powerUps.onAdd` / `onRemove` to create/destroy sprites.

### Changing the tick rate

Edit the interval in `ShmupRoom.ts`:

```ts
this.setSimulationInterval((dt) => this.tick(dt), 50); // 50ms = 20 ticks/sec
```

Lower values = smoother but more CPU and bandwidth. 50ms (20/s) is a good baseline for a shmup.

### TypeScript type checking (server)

```bash
cd server
npx tsc --noEmit
```

Run this before committing server changes.

---

## Deployment

### Client → GitHub Pages

1. Set the production server URL in your CI environment (or locally before building):
   ```bash
   # .env (do not commit) or CI env var
   VITE_SERVER_URL=wss://your-server.onrender.com
   ```
2. Build the client:
   ```bash
   npm run client:build   # outputs to docs/
   ```
3. Push to GitHub. In repo **Settings → Pages**, set source to `main` branch, `/docs` folder.

Alternatively, use a GitHub Actions workflow to automate the build and push to a `gh-pages` branch.

### Server → Render / Railway / Fly.io

All three have free tiers suitable for a hobby game server. The steps below use Render as an example.

1. Push the repo to GitHub.
2. In Render, create a new **Web Service** pointing at your repo.
3. Set the root directory to `server/`.
4. Build command: `npm install && npm run server:build`
5. Start command: `npm run server:start`
6. Add environment variable: `PORT=10000` (Render sets this automatically; the server reads `process.env.PORT`).
7. Note the deployed URL (e.g. `https://shmup-server.onrender.com`) and set `VITE_SERVER_URL=wss://shmup-server.onrender.com` on the client.

> **Note:** Render free-tier servers spin down after inactivity. For a real release, use a paid tier or Railway/Fly.io which have better cold-start behaviour.

### CORS / WebSocket notes

Colyseus uses WebSockets, not HTTP. No CORS configuration is needed for WebSocket connections. If you add REST endpoints to the Express server, configure CORS there as needed.

For production, use `wss://` (secure WebSocket) — most WebSocket hosts enforce this automatically.

---

## Best Practices

### General

- **Never put game logic in the client.** If you find yourself computing a score, checking a collision, or deciding whether an enemy dies in `Game.js`, move it to `ShmupRoom.ts`.
- **Keep `RoomClient.js` as the only Colyseus import on the client.** Other files should never import `colyseus.js` directly.
- **Do not import `phaser.js` as an ES module.** It is loaded as a plain `<script>` tag in `index.html` and available as the global `Phaser`. Vite's `optimizeDeps` config keeps it external.

### Server

- **Always use delta time (`dt`) in the tick.** Multiply velocities by `dt / 1000` (seconds) so physics behaviour is frame-rate independent.
- **Keep private (non-synced) server state in `Map` objects** (`serverPlayers`, `serverEnemies`, etc.). Only put data in the schema if clients need to render it — schema diffs are sent over the network on every change.
- **Use `@type("float32")` for positions.** It gives sufficient precision for a 1280×720 game and is more compact than `float64`.
- **Prefer `int8` / `int32` for small integers** (health, power, score, kills) to minimise patch size.

### Client

- **Lerp sprite positions** toward server values rather than snapping. This hides the 50ms tick latency:
  ```js
  s.x = Phaser.Math.Linear(s.x, serverX, 0.3);
  ```
- **Only send input on change** (`RoomClient.sendInput` already does this via the `_lastInput` diff check). Do not send every frame unconditionally.
- **Register all `onAdd`/`onRemove` listeners in `initNetworking()`** and clean up properly in `clearAllSprites()` when rejoining.

### Adding assets

1. Drop the file into `assets/`.
2. Register it in `src/assets.js` under the correct type key (`spritesheet`, `image`, etc.).
3. The Preloader scene automatically loads everything registered there.

---

## Known Limitations / Future Work

| Item | Notes |
|---|---|
| `Start.js` scene is unused | Fully commented out; could become a lobby/matchmaking screen |
| `GameOver.js` scene references unloaded `'background'` asset | Never actually visited; in-scene Game Over overlay is used instead |
| No reconnection handling | If a client drops mid-game, their player is removed; `onLeave` logic handles it server-side |
| Enemies do not re-use IDs | IDs increment globally via `nextId()`; fine for a session but IDs grow unbounded over time |
| No difficulty scaling | Enemy `power` and `speed` are random; could scale with `teamScore` |
| No lobby / player-ready flow | Game starts the moment the first player joins |
