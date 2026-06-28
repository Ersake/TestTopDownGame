# AGENTS.md - Developer Guide

This document is the canonical quick-start and contribution guide for this project. Read it before making changes.

For a deeper system reference, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Project Overview

This is a server-authoritative co-op top-down multiplayer game built with Phaser 3 and Colyseus.

The browser client renders the game and sends player intent. The Colyseus server owns the game state, simulation, collision, spawning, score, resources, revives, and game-over rules.

### Key Principle: The Client Never Owns Game Logic

The Phaser client should stay a renderer and input collector. It may:

- Render sprites, UI, animations, audio, and camera movement from server state.
- Send raw player intent to the server, such as movement input, attack requests, and interaction input.
- Smooth or lerp visual positions for presentation.

It must not:

- Decide whether enemies, trees, players, or resources are hit.
- Mutate score, health, wood, kills, revives, enemy deaths, or game-over state.
- Spawn authoritative gameplay objects locally.

If a change affects shared gameplay truth, put it in `server/src/rooms/ShmupRoom.ts` and sync only the renderable result through `server/src/schema/GameState.ts`.

---

## Agent Workflow

Before editing:

1. Read this file.
2. Read the relevant section of `ARCHITECTURE.md`.
3. Inspect the existing implementation pattern before adding a new one.

While editing:

- Preserve server authority for gameplay and map truth.
- Keep changes scoped to the requested behavior.
- Update `ARCHITECTURE.md` when changing room flow, schema fields, room messages, deployment, map storage, or major gameplay systems.
- Prefer extending existing helpers and message paths over adding parallel systems.

When finishing:

- Run the verification commands that match the files touched.
- Report any manual multiplayer or map-editor checks that could not be run.

---

## Current Flow

1. `src/main.js` launches Phaser.
2. `Boot` starts `Preloader`.
3. `Preloader` loads everything from `src/assets.js`, then starts `Lobby`.
4. `Lobby` lets a player create a room or join a room by 4-letter room code.
5. `RoomClient` creates or joins the Colyseus `"shmup_room"`.
6. `Game` renders the synced room state and sends input/messages to the server.
7. Game over is handled in-scene; Space returns players to `Lobby`.

Do not reintroduce automatic `joinOrCreate` on load unless the lobby flow is intentionally being removed.

---

## Repository Layout

```text
/
+-- src/                       Phaser client (plain JavaScript, ES modules)
|   +-- main.js                Phaser entry point
|   +-- assets.js              Asset key/path registry loaded by Preloader
|   +-- animation.js           Animation config registry
|   +-- network/
|   |   +-- RoomClient.js      Singleton Colyseus client wrapper
|   +-- gameObjects/           Legacy/visual Phaser object classes
|   +-- scenes/
|       +-- Boot.js            Starts Preloader
|       +-- Preloader.js       Loads registered assets, then starts Lobby
|       +-- Lobby.js           Create/join room-code UI
|       +-- Game.js            Main rendering and input scene
|       +-- Start.js           Unused skeleton scene
|       +-- GameOver.js        Unused skeleton scene
+-- server/                    Colyseus server (TypeScript)
|   +-- src/
|   |   +-- index.ts           Express + Colyseus server entry point
|   |   +-- schema/
|   |   |   +-- GameState.ts   Synced Colyseus schema definitions
|   |   +-- rooms/
|   |       +-- ShmupRoom.ts   Authoritative game simulation
|   |   +-- maps/
|   |       +-- MapStorage.ts  Saved-map persistence helpers
|   +-- package.json
|   +-- tsconfig.json
+-- assets/                    Sprites, images, and audio
+-- index.html                 Single page mounting Phaser
+-- phaser.js                  Phaser global script loaded by index.html
+-- vite.config.js             Vite config; builds client to docs/
+-- ARCHITECTURE.md            Current architecture reference
+-- README.md                  Human-facing project entry point
+-- package.json               Client deps + convenience npm scripts
+-- AGENTS.md                  This file
```

---

## Running Locally

You need the server and client running at the same time.

### Terminal 1 - Game Server

```bash
cd server
npm install          # first time only
npm run server:dev   # ws://localhost:2567
```

In development, the Colyseus monitor is available at:

```text
http://localhost:2567/colyseus
```

The monitor is disabled when `NODE_ENV=production`.

### Terminal 2 - Client Dev Server

```bash
npm install          # first time only, from repo root
npm run client:dev   # http://localhost:5173
```

Open `http://localhost:5173`, create a room, then open a second tab and join with the displayed room code.

### Environment Variables

The client reads `VITE_SERVER_URL` to find the Colyseus server.

Local development:

```text
VITE_SERVER_URL=ws://localhost:2567
```

Production should use secure WebSockets:

```text
VITE_SERVER_URL=wss://your-server.example.com
```

Use `.env.example` as the committed template. Do not commit `.env`.

---

## Making Changes

### Adding a Synced State Field

1. Add the field to the relevant schema class in `server/src/schema/GameState.ts` with a `@type(...)` decorator.
2. Write the field from `server/src/rooms/ShmupRoom.ts`.
3. Render or listen to it in `src/scenes/Game.js`.

Only add fields to schema state when clients need them. Private simulation details belong in server-side `Map` objects or other room-private data structures.

### Adding a New Synced Object Type

1. Add a new `Schema` class in `GameState.ts`.
2. Add a `MapSchema<NewType>` field to `GameRoomState`.
3. Add authoritative spawn, update, collision, and cleanup logic in `ShmupRoom.ts`.
4. Register `state.newObjects.onAdd` and `onRemove` listeners in `Game.js`.
5. Destroy all related sprites in `clearAllSprites()`.

### Adding Server Messages

Use room messages for discrete events that are not naturally represented as durable state, such as one-shot sound or impact events.

Examples already in use:

- Client to server gameplay: `"input"`, `"attack"`, `"dash"`, `"bowChargeStart"`, `"bowAim"`, `"bowCancel"`, `"axeWhirlwind"`, `"equipSlot"`.
- Client to server building/crafting: `"placeCampfire"`, `"placeCaltrops"`, `"removeDeployable"`, `"craftItem"`, `"selectUpgrade"`, `"setOutfitColor"`.
- Map editor client to server: `"placeMapTile"`, `"removeMapTile"`, `"saveMap"`, `"loadMap"`, `"listMaps"`.
- Development client to server: `"debugSetRound"`.
- Server to client gameplay: `"treeHit"`, `"enemyHit"`, `"woodPickup"`, `"reviveStarted"`, `"playerHurt"`, `"craftResult"`, `"itemCrafted"`, `"levelReset"`, `"playerLevelUp"`, `"enemyWaveStarted"`.
- Server to client map editor: `"mapImported"`, `"mapList"`, `"mapStorageError"`, `"mapSaveConflict"`, `"mapSaved"`, `"mapLoaded"`.
- Development server to client: `"debugRoundResult"`.

Validate and clamp client-provided data on the server. Treat all client messages as untrusted.

### Changing Map Editor or Saved Maps

Development builds expose a map editor through `Lobby` using `mode: "map-editor"`. Production room creation deliberately falls back to normal game rooms.

- Keep map tile authority on the server. Clients may request tile placement/removal, but `ShmupRoom.ts` validates coordinates, frame values, layer values, and size limits.
- `mapChunks` is synced render state. Saved map persistence belongs to server-owned storage through `server/src/maps/MapStorage.ts`.
- Saved-map regular games use `mapName` room options, sync `activeMapName`, and keep normal gameplay enabled.
- `server/maps/` is the default local map storage path. Production hosting must provide persistent storage through `MAP_STORAGE_DIR` if saved maps must survive deploys.
- When changing map behavior, check both editor rooms and normal rooms that load a saved map.

### Adding Assets

1. Drop the file into `assets/`.
2. Register it in `src/assets.js` under the correct loader type (`image`, `spritesheet`, `audio`, etc.).
3. Use the registered asset key from scene code.

The Preloader automatically loads everything registered in `src/assets.js`.

---

## Verification

Run the checks that match your change:

### Server Changes

Run server type checking:

```bash
cd server
npx tsc --noEmit
```

### Client Changes

Run the client build:

```bash
npm run client:build
```

### Gameplay or Networking Changes

Run both processes and test at least two browser tabs:

```bash
npm run server:dev
```

```bash
npm run client:dev
```

Create a room in one tab, join with the displayed room code in a second tab, and verify remote rendering plus shared state changes.

### Map Editor Changes

In development, verify the map-editor path:

1. Create a map from the lobby.
2. Place and remove at least one tile.
3. Save, list, and load a map draft.
4. Start a normal game with a saved map selected.
5. Confirm players, enemies, wood drops, and player projectiles respect authored solid tiles.

---

## Deployment

### Client - GitHub Pages

The repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

Recommended flow:

1. Set repository secret `VITE_SERVER_URL` to the deployed secure WebSocket URL, for example `wss://your-server.onrender.com`.
2. Push to `main` or run the workflow manually.
3. The workflow builds the client with `npm run client:build`, uploads `docs/`, and deploys to GitHub Pages.

`docs/` is a build output and is ignored by git.

### Server - Render / Railway / Fly.io

Deploy the `server/` directory as a Node.js service.

Render-style settings:

```text
Root directory: server/
Build command: npm install && npm run server:build
Start command: npm run server:start
```

The server reads `process.env.PORT` and defaults to `2567` locally.

Use `NODE_ENV=production` in production so the Colyseus monitor is not exposed.

---

## Best Practices

### General

- Keep shared gameplay authority on the server.
- Keep dash movement server-authoritative; the client only sends a one-shot `"dash"` request, and the server owns cooldown and collision resolution.
- Keep `RoomClient.js` as the only client-side import of `colyseus.js`.
- Do not import `phaser.js` as an ES module. It is loaded by `index.html` and exposed as global `Phaser`.
- Keep `ARCHITECTURE.md` current when changing room flow, state shape, networking, deployment, or major gameplay systems.

### Server

- Use delta time (`dt`) in the tick for time-based simulation.
- Keep non-rendered simulation state private to the room.
- Use compact schema types where practical, such as `float32`, `int8`, and `int32`.
- Clamp positions, directions, and target coordinates received from clients.
- Clean up Colyseus schema objects and matching private server state together.

### Client

- Lerp or smooth visual positions when useful, but never use smoothing as authoritative state.
- Only send input on change; `RoomClient.sendInput()` already diffs movement/interact state.
- Register state listeners in `initNetworking()`.
- Make sure all sprites, bars, and event listeners created from room state are cleaned up when leaving or re-entering the game.
- Keep UI and audio presentation client-side, driven by synced state or server event messages.

---

## Known Limitations / Future Work

| Item | Notes |
|---|---|
| `Start.js` scene is unused | It is still in the scene list but has no active behavior. |
| `GameOver.js` scene is unused | In-scene game-over UI is used instead; `GameOver.js` still references an unloaded `background` asset. |
| No reconnection handling | If a client drops mid-game, their player is removed by `onLeave`. |
| Room code registry is process-local | Codes are unique only within the current server process. |
| IDs grow during process lifetime | Gameplay IDs increment globally and are not reused. |
| No ready-up flow | Rooms enter gameplay as soon as players create or join. |
