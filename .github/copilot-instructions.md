# Copilot Instructions — TestTopDownGame

This is a **server-authoritative co-op multiplayer shmup** built with Phaser 3 and Colyseus.

## Architecture

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

**Key principle:** The client never mutates game state. The Phaser client is a dumb renderer — it reads `room.state` and sends raw keyboard input. All physics, collision, spawning, scoring, and win/loss logic lives in `ShmupRoom.ts`.

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
│   │   └── Explosion.js    Visual-only sprite
│   └── scenes/
│       ├── Boot.js         → Preloader
│       ├── Preloader.js    Loads spritesheets → Game
│       ├── Game.js         Main scene (rendering only)
│       ├── Start.js        Skeleton (currently unused)
│       └── GameOver.js     Skeleton (currently unused)
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
├── vite.config.js          Vite config — base './', builds to docs/
└── package.json            Client deps + convenience npm scripts
```

## Making Changes

### Adding a new synced state field
1. Add the field to the relevant schema class in `server/src/schema/GameState.ts` with a `@type(...)` decorator.
2. Update `ShmupRoom.ts` to write to it in the tick or on game events.
3. Subscribe to it in `src/scenes/Game.js` using `state.listen(...)` or `entity.onChange(...)`.

### Adding a new game object type
1. Add a new `Schema` class in `GameState.ts`.
2. Add a `MapSchema<NewType>` field to `GameRoomState`.
3. Add server-side logic (spawn, tick, collision) in `ShmupRoom.ts`.
4. In `Game.js`, register `state.newObjects.onAdd` / `onRemove` to create/destroy sprites.

### TypeScript type checking (server)
```bash
cd server && npx tsc --noEmit
```

## Best Practices

### General
- **Never put game logic in the client.** Computing scores, checking collisions, or deciding whether an enemy dies belongs in `ShmupRoom.ts`, not `Game.js`.
- **Keep `RoomClient.js` as the only Colyseus import on the client.** Other files must not import `colyseus.js` directly.
- **Do not import `phaser.js` as an ES module.** It is loaded as a plain `<script>` tag and available as the global `Phaser`.

### Server (`ShmupRoom.ts` / `GameState.ts`)
- **Always use delta time (`dt`) in the tick.** Multiply velocities by `dt / 1000` (seconds).
- **Keep private (non-synced) server state in `Map` objects** (`serverPlayers`, `serverEnemies`, etc.). Only put data in the schema if clients need to render it.
- **Use `@type("float32")` for positions** and **`int8` / `int32` for small integers** (health, score, kills).

### Client (`Game.js`)
- **Lerp sprite positions** toward server values: `s.x = Phaser.Math.Linear(s.x, serverX, 0.3);`
- **Only send input on change** — `RoomClient.sendInput` already does this; do not send every frame unconditionally.
- **Register all `onAdd`/`onRemove` listeners in `initNetworking()`** and clean up in `clearAllSprites()` when rejoining.

### Adding assets
1. Drop the file into `assets/`.
2. Register it in `src/assets.js` under the correct type key (`spritesheet`, `image`, etc.).
3. The Preloader scene loads everything registered there automatically.

## Running Locally

**Terminal 1 — Game Server:**
```bash
cd server && npm install && npm run server:dev
# Colyseus on ws://localhost:2567
```

**Terminal 2 — Client Dev Server:**
```bash
npm install && npm run client:dev
# Vite on http://localhost:5173
```

Set `VITE_SERVER_URL=ws://localhost:2567` in `.env` (see `.env.example`).

For full details see [`AGENTS.md`](../AGENTS.md).
