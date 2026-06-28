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
- Owning player, enemy, bullet, tree, log, score, timer, wave counter, revive, and game-over state.
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
| `"dash"` | `RoomClient.sendDash()` | One-shot dash request; the server owns cooldown, facing direction, movement, and collision resolution. |
| `"bowChargeStart"`, `"bowAim"`, `"bowCancel"` | Bow input helpers | Starts, updates, or cancels a server-owned bow charge. |
| `"axeWhirlwind"` | `RoomClient.sendAxeWhirlwind()` | Starts or stops the server-owned axe whirlwind state; the server owns max duration and cooldown. |
| `"equipSlot"` | `RoomClient.sendEquipSlot()` | Requests active hotbar slot changes. |
| `"swapHotbarSlots"` | `RoomClient.sendSwapHotbarSlots()` | Requests a server-validated hotbar slot reorder. |
| `"buildWoodBlock"`, `"removeWoodBlock"`, `"repairWoodBlock"` | Building helpers | Requests server-authoritative wood block placement, removal, or repair. |
| `"placeCampfire"`, `"placeCaltrops"` | Placement helpers | Requests server-authoritative deployable placement. |
| `"craftItem"` | `RoomClient.sendCraftItem()` | Requests crafting by recipe ID. |
| `"selectUpgrade"` | `RoomClient.sendSelectUpgrade()` | Requests an enchantment-table skill spend with `{ upgradeId, item, slot }`; the server validates skill points, table range, item tree, hotbar slot contents, prerequisites, and max ranks. |
| `"setOutfitColor"` | `RoomClient.sendSetOutfitColor()` | Requests player presentation color changes. |
| `"placeMapTile"`, `"removeMapTile"` | Map-editor tools | Requests server-validated tile edits in `"map-editor"` rooms. |
| `"replaceMap"` | Legacy map import path | Bounded browser-draft import for map-editor rooms; not normal persistence. |
| `"saveMap"`, `"loadMap"`, `"listMaps"` | Map-editor storage controls | Saves, loads, or lists server-owned map drafts. |
| `"debugSetRound"` | Escape-menu debug controls | Development only: starts a later wave (2–99) for the room. Wave 1 is the initial wave. |

The server treats client data as untrusted. `ShmupRoom.ts` coerces booleans, normalizes directions, and clamps target coordinates.

### Server to Client

| Message | Purpose |
|---|---|
| `"treeHit"` | One-shot tree impact presentation. |
| `"enemyHit"` | One-shot enemy impact presentation. |
| `"woodPickup"` | One-shot pickup sound/UI presentation. |
| `"reviveStarted"` | One-shot revive-start presentation. |
| `"playerHurt"` | One-shot player hurt presentation. |
| `"craftResult"` | Acceptance or rejection feedback for a crafting request. |
| `"itemCrafted"` | One-shot presentation for successful crafting. |
| `"levelReset"` | One-shot presentation/state reset after a room-level reset. |
| `"playerLevelUp"` | One-shot level-up presentation; the synced pending upgrade count is displayed as available skill points. |
| `"enemyWaveStarted"` | One-shot wave-start presentation. |
| `"mapImported"` | Legacy map-import acceptance feedback. |
| `"mapList"` | Saved map names returned to the map editor. |
| `"mapStorageError"` | Map storage validation or persistence failure message. |
| `"mapSaveConflict"` | Save rejected because the map name already exists. |
| `"mapSaved"` | Save success confirmation. |
| `"mapLoaded"` | Load success confirmation, including whether data was trimmed. |
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
| `woodBlocks` | `MapSchema<WoodBlockState>` | Player-built barricades with server-owned health. |
| `campfires` | `MapSchema<CampfireState>` | Player-placed healing deployables. |
| `caltrops` | `MapSchema<CaltropState>` | Player-placed slowing/damage deployables. |
| `mapChunks` | `MapSchema<MapChunkState>` | Sparse server-owned map tile chunks rendered by editor and saved-map game rooms. |
| `worldWidth`, `worldHeight` | `int32` | Server-owned world bounds. |
| `elapsedSeconds` | `int32` | Shared round timer. |
| `waveNumber` | `int32` | Current 1-based enemy wave displayed by the client HUD. |
| `teamScore` | `int32` | Shared score. |
| `gameStarted` | `boolean` | Whether simulation has started. |
| `gameOver` | `boolean` | Whether the room is in game-over state. |
| `gameOverCountdown` | `int8` | Countdown value displayed during game-over flow. |
| `mode` | `string` | Room mode, usually `"game"` or development-only `"map-editor"`. |
| `activeMapName` | `string` | Saved map loaded into a normal game room, or empty when none is active. |

### Player State

`PlayerState` includes identity, position, health, kills, level/experience, wood, death/revive state, facing and attack direction, active hotbar item, attack state, dash active/cooldown progress, bow/axe state, axe whirlwind active/cooldown progress, pending upgrade choices displayed as skill points, upgrade counters, outfit color, and hotbar inventory. Axe upgrade counters include wood gain, max campfires, whirlwind cooldown, and whirlwind AOE size.

### Enemy State

`EnemyState` includes position, enemy type, power, health, max health, facing direction, action, attack sequence, damage sequence, death state, and death sequence.

### Map Chunk State

`MapChunkState` stores compact 16x16 tile chunks as base64-encoded uint16 frame values. The server owns chunk creation, mutation, persistence, and validation; clients render chunks and send bounded edit requests in map-editor rooms.

### Deployable State

`WoodBlockState`, `CampfireState`, and `CaltropState` sync renderable deployables created by server-authoritative building and crafting systems.

### Private Server State

Not every simulation detail is synced. `ShmupRoom.ts` keeps private server-only maps for things like player velocity, cooldowns, revive targets, enemy modes, bullet velocity, tree health, and campfire ownership.

Use schema state only for data clients need to render or display.

---

## Gameplay Systems

Current server-owned systems include:

- Player join/leave and room reset after game over.
- World bounds and tree generation.
- Player movement, facing direction, smooth dash movement with a 2-second cooldown, attack lockout, attack cooldown, and interaction input. Dash cooldown progress is synced for the under-player cooldown bar.
- Axe left-click attacks and active axe whirlwind reduce server-authoritative player movement speed by 25%. Axe whirlwind right-click attacks last up to 4 seconds, can be cancelled early, and then enter a server-owned cooldown rendered on the hotbar. Axe upgrades can reduce the 10-second base cooldown by 1 second per rank and increase the 56px base AOE radius by 25% per rank, with server-enforced max rank 3.
- Level-ups add pending upgrade choices displayed as skill points. Skill points are spent only through the enchantment table UI by dragging a hotbar item into the panel, then selecting bottom-to-top item-tree nodes with satisfied prerequisites and server-enforced max ranks.
- Tree damage, tree removal, and log spawning.
- Wood pickup, including hammer wood gathering and axe wood gain upgrade multipliers.
- Player-placed campfires with a per-player active cap of 1 plus axe max-campfire upgrade ranks.
- Enemy spawning, waves, target selection, movement, attacks, stun, death, and removal. After a wave is fully cleared, the server waits 3 seconds before starting the next wave, updates `waveNumber`, and broadcasts `"enemyWaveStarted"` for horn audio.
- Player bullets and enemy bullets.
- AABB/capsule/circle-style collision helpers for current gameplay interactions.
- Player health, death, revive progress, revive completion, and game-over checks.
- Team score, player kills, and elapsed round time.

---

## Development Map Editor

Development builds expose a `CREATE MAP` action in the lobby. It creates a `shmup_room` with `mode: "map-editor"`; production servers deliberately create normal game rooms instead.

Editor rooms use a 7680×4320 canvas (480×270 native 16px cells), generate no trees or enemies, and retain only player movement plus server-authoritative map-tile collision. A red 3840×2160 boundary marks the original game-world size; players and map tiles are authoritatively constrained inside it. The `mapChunks` schema field holds sparse 16×16 tile chunks as base64-encoded uint16 frame values. Clients send `placeMapTile` and `removeMapTile`; the room validates all coordinates, frame values, and size limits.

`Game.js` renders synced chunks as a tilemap and presents the complete 32×32 `Topdowntileset.png` palette. Castle, Tree, and Water source regions are solid. Selected Castle_1 vertical support frames use centered, 50%-wide top-half solid colliders, while the lower right support uses a centered, 50%-wide full-height collider. Other solid map frames use full-tile colliders. Floor, Grass, and Garden tiles are walkable. Explicit `saveMap`, `loadMap`, and `listMaps` messages operate on server-owned versioned JSON files in `server/maps/` by default (or `MAP_STORAGE_DIR`). Saves are atomic and only write after the editor's SAVE DRAFT action. `replaceMap` remains a bounded legacy browser-draft import path; it is not the normal persistence mechanism. Production hosting must mount persistent storage at `MAP_STORAGE_DIR` to preserve saved maps across deploys.

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
