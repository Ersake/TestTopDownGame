# Architecture Reference

This document describes the current multiplayer architecture. It is not a migration plan.

For day-to-day contributor guidance, see [AGENTS.md](AGENTS.md).

---

## System Shape

```text
Browser client (Phaser 3)
  src/main.js
  src/scenes/Lobby.js
  src/scenes/Game.js
  src/network/RoomClient.js
        |
        | WebSocket via Colyseus
        v
Node.js server (Colyseus)
  server/src/index.ts
  server/src/rooms/ShmupRoom.ts
  server/src/schema/GameState.ts
```

The server is authoritative. Clients send player intent and render Colyseus schema patches. The server owns all durable game state and all gameplay decisions.

---

## Client Responsibilities

The Phaser client is responsible for:

- Booting scenes and loading assets.
- Presenting the lobby create/join room-code UI.
- Sending input and attack intent to the server.
- Mirroring Colyseus schema state with sprites, UI, camera, animations, and audio.
- Playing one-shot presentation effects from server messages.
- Cleaning up sprites and listeners when returning to the lobby or rejoining.

Important client files:

| File | Responsibility |
|---|---|
| `src/main.js` | Creates the Phaser game and registers scenes. |
| `src/scenes/Preloader.js` | Loads all assets registered in `src/assets.js`, then starts `Lobby`. |
| `src/scenes/Lobby.js` | Creates rooms and joins rooms by 4-letter room code. |
| `src/scenes/Game.js` | Renders synced state, sends input, handles UI/audio presentation. |
| `src/network/RoomClient.js` | Owns the Colyseus client and current room reference. |
| `src/assets.js` | Asset registry consumed by the preloader. |
| `src/animation.js` | Animation registry consumed by `Game.js`. |

---

## Server Responsibilities

The Colyseus server is responsible for:

- Creating and disposing game rooms.
- Assigning process-local 4-letter room codes.
- Owning player, enemy, bullet, tree, log, score, timer, revive, and game-over state.
- Validating and applying player input.
- Applying movement, attacks, enemy behavior, collision, resource pickup, revives, and cleanup.
- Broadcasting synced schema patches and one-shot event messages.

Important server files:

| File | Responsibility |
|---|---|
| `server/src/index.ts` | Express/HTTP server, Colyseus server setup, room registration, dev monitor. |
| `server/src/rooms/ShmupRoom.ts` | Authoritative simulation and room message handlers. |
| `server/src/schema/GameState.ts` | Colyseus schema classes synced to clients. |

---

## Scene and Room Flow

1. `src/main.js` launches Phaser with `Boot`, `Preloader`, `Lobby`, `Start`, `Game`, and `GameOver` registered.
2. `Boot` immediately starts `Preloader`.
3. `Preloader` loads assets from `src/assets.js` and starts `Lobby`.
4. In `Lobby`, a player can:
   - create a new `"shmup_room"` via `RoomClient.createRoom()`, or
   - join an existing room by code via `RoomClient.joinRoom(code)`.
5. The server assigns new rooms a 4-letter uppercase room ID.
6. After a room is created or joined, the client starts `Game`.
7. `Game` registers Colyseus state listeners, renders existing state, and starts sending input.
8. On game over, pressing Space disconnects and returns to `Lobby`.

---

## Network Contract

### Client to Server

| Message | Sent by | Purpose |
|---|---|---|
| `"input"` | `RoomClient.sendInput()` | Movement, fire, and interact booleans. Sent only when changed. |
| `"attack"` | `RoomClient.sendAttack()` | Attack direction and target coordinates. |
| `"debugSetRound"` | Escape-menu debug controls | Development only: starts a later round (2–99) for the room. Round 1 is the initial wave; round N begins at elapsed minute N-1. |

The server treats client data as untrusted. `ShmupRoom.ts` coerces booleans, normalizes directions, and clamps target coordinates.

### Server to Client

| Message | Purpose |
|---|---|
| `"treeHit"` | One-shot tree impact presentation. |
| `"enemyHit"` | One-shot enemy impact presentation. |
| `"woodPickup"` | One-shot pickup sound/UI presentation. |
| `"reviveStarted"` | One-shot revive-start presentation. |
| `"playerHurt"` | One-shot player hurt presentation. |
| `"debugRoundResult"` | Development-only acceptance or validation feedback for a `"debugSetRound"` request. |

Durable game facts should usually be schema state, not transient messages.

---

## Synced State

`GameRoomState` is the root schema.

| Field | Type | Purpose |
|---|---|---|
| `players` | `MapSchema<PlayerState>` | Connected players and their renderable gameplay state. |
| `enemies` | `MapSchema<EnemyState>` | Active enemies and their renderable state. |
| `playerBullets` | `MapSchema<PlayerBulletState>` | Server-owned player bullet positions. |
| `enemyBullets` | `MapSchema<EnemyBulletState>` | Server-owned enemy bullet positions. |
| `trees` | `MapSchema<TreeState>` | Active harvestable trees. |
| `logs` | `MapSchema<LogState>` | Dropped wood pickups. |
| `worldWidth`, `worldHeight` | `int32` | Server-owned world bounds. |
| `elapsedSeconds` | `int32` | Shared round timer. |
| `teamScore` | `int32` | Shared score. |
| `gameStarted` | `boolean` | Whether simulation has started. |
| `gameOver` | `boolean` | Whether the room is in game-over state. |

### Player State

`PlayerState` includes position, health, kills, wood, death/revive state, facing direction, attack direction, and attack sequence.

### Enemy State

`EnemyState` includes position, enemy type, power, health, max health, facing direction, action, attack sequence, damage sequence, death state, and death sequence.

### Private Server State

Not every simulation detail is synced. `ShmupRoom.ts` keeps private server-only maps for things like player velocity, cooldowns, revive targets, enemy modes, bullet velocity, and tree health.

Use schema state only for data clients need to render or display.

---

## Gameplay Systems

Current server-owned systems include:

- Player join/leave and room reset after game over.
- World bounds and tree generation.
- Player movement, facing direction, attack lockout, attack cooldown, and interaction input.
- Tree damage, tree removal, and log spawning.
- Wood pickup.
- Enemy spawning, waves, target selection, movement, attacks, stun, death, and removal.
- Player bullets and enemy bullets.
- AABB/capsule/circle-style collision helpers for current gameplay interactions.
- Player health, death, revive progress, revive completion, and game-over checks.
- Team score, player kills, and elapsed round time.

---

## Development Map Editor

Development builds expose a `CREATE MAP` action in the lobby. It creates a `shmup_room` with `mode: "map-editor"`; production servers deliberately create normal game rooms instead.

Editor rooms use a 7680×4320 canvas (480×270 native 16px cells), generate no trees or enemies, and retain only player movement plus server-authoritative map-tile collision. A red 3840×2160 boundary marks the original game-world size; players and map tiles are authoritatively constrained inside it. The `mapChunks` schema field holds sparse 16×16 tile chunks as base64-encoded uint16 frame values. Clients send `placeMapTile` and `removeMapTile`; the room validates all coordinates, frame values, and size limits.

`Game.js` renders synced chunks as a tilemap and presents the complete 32×32 `Topdowntileset.png` palette. Castle, Tree, and Water source regions are solid. Floor, Grass, and Garden tiles are walkable. Explicit `saveMap`, `loadMap`, and `listMaps` messages operate on server-owned versioned JSON files in `server/maps/` by default (or `MAP_STORAGE_DIR`). Saves are atomic and only write after the editor's SAVE DRAFT action. `replaceMap` remains a bounded legacy browser-draft import path; it is not the normal persistence mechanism. Production hosting must mount persistent storage at `MAP_STORAGE_DIR` to preserve saved maps across deploys.

Development lobby builds also expose a normal-game map selector. Selecting a saved map such as `lvlone` sends a `mapName` room option; the server loads the saved chunks into a regular game room, crops editor-sized maps to the original 3840×2160 world, syncs `activeMapName`, keeps normal gameplay systems enabled, and uses solid map tiles for player collision while tree generation avoids those solid tiles. The client renders `mapChunks` in both editor and regular rooms; saved-map regular rooms skip procedural grass noise and show a small dev HUD map label.

Enemy navigation treats player-built wood blocks and solid saved-map tiles as blocked cells, so pathing routes around authored colliders instead of walking through them.

In saved-map regular rooms, wood drops relocate to nearby green/walkable authored tiles and are not spawned on non-green tiles. Player projectiles are removed when their movement segment crosses a solid authored tile.

## Deployment Architecture

### Client

The client is built with Vite. `vite.config.js` uses `base: './'` and writes the build output to `docs/`.

GitHub Pages deployment is handled by `.github/workflows/deploy.yml`:

1. Install root client dependencies.
2. Build with `npm run client:build`.
3. Pass `VITE_SERVER_URL` from repository secrets.
4. Upload `docs/` as a Pages artifact.
5. Deploy to GitHub Pages.

`docs/` is ignored because it is generated output.

### Server

The server is a Node.js service from the `server/` directory.

Production build/start:

```bash
npm run server:build
npm run server:start
```

The server listens on `process.env.PORT` or `2567`.

The Colyseus monitor is available only when `NODE_ENV !== "production"`.

---

## Architectural Invariants

- `RoomClient.js` is the only client-side module that imports `colyseus.js`.
- `Game.js` renders synced state but does not decide authoritative gameplay outcomes.
- `ShmupRoom.ts` is the source of truth for gameplay rules.
- `GameState.ts` contains only synced schema data.
- Private room maps contain server-only simulation details.
- Client asset loading flows through `src/assets.js` and `Preloader`.
- Production clients must use `wss://` for `VITE_SERVER_URL`.
