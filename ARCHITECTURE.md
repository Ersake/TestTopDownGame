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
  server/src/characters/CharacterStorage.ts
```

The server is authoritative. Clients send player intent and render Colyseus schema patches. The server owns all durable game state and all gameplay decisions.

---

## Client Responsibilities

The Phaser client is responsible for:

- Booting scenes and loading assets.
- Presenting the image-backed main menu, character selector, create-room action, and active-room sidebar.
- Sending input and attack intent to the server.
- Mirroring Colyseus schema state with sprites, UI, camera, animations, and audio.
- Playing one-shot presentation effects from server messages.
- Cleaning up sprites and listeners when returning to the lobby or rejoining.

Important client files:

| File | Responsibility |
|---|---|
| `src/main.js` | Creates the Phaser game and registers scenes. |
| `src/scenes/Preloader.js` | Loads all assets registered in `src/assets.js`, then starts `Lobby`. |
| `src/scenes/Lobby.js` | Presents main/submenu art, lists/selects saved characters, creates rooms, and joins listed active rooms. |
| `src/scenes/Game.js` | Renders synced state, sends input, handles UI/audio presentation. |
| `src/network/RoomClient.js` | Owns the Colyseus client, current room reference, browser player key, selected character ID, and character API calls. |
| `src/assets.js` | Asset registry consumed by the preloader. |
| `src/animation.js` | Animation registry consumed by `Game.js`. |

---

## Server Responsibilities

The Colyseus server is responsible for:

- Creating and disposing game rooms.
- Creating, listing, loading, and saving server-owned character profiles.
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
| `server/src/characters/CharacterStorage.ts` | JSON character persistence keyed by a browser-owned player secret hash. |

---

## Scene and Room Flow

1. `src/main.js` launches Phaser with `Boot`, `Preloader`, `Lobby`, `Start`, `Game`, and `GameOver` registered.
2. `Boot` immediately starts `Preloader`.
3. `Preloader` loads assets from `src/assets.js` and starts `Lobby`.
4. `Lobby` first shows the `shmup2mainmenu.png` title screen with a Start action.
5. The submenu uses `shmup2submenu1.png`, lists the last-played character on the left, shows a `NEW CHARACTER` slot when no saved character is selected, and lists active rooms on the right.
6. Creating or joining a listed room first ensures a selected server-owned character exists. The browser stores only a `playerKey` secret and selected character ID in local storage.
7. The server assigns new rooms a 4-letter uppercase room ID.
8. After a room is created or joined, the client starts `Game`.
9. `Game` registers Colyseus state listeners, renders existing state, and starts sending input.
10. On game over, pressing Space disconnects and returns to `Lobby`.

---

## Network Contract

### HTTP Character API

The lobby uses Express endpoints before joining a Colyseus room:

| Endpoint | Purpose |
|---|---|
| `POST /characters/list` | Lists characters owned by the browser's `playerKey`. |
| `POST /characters/create` | Creates a new server-owned character for that `playerKey`, up to the five-character cap. |
| `POST /characters/delete` | Deletes a character owned by that `playerKey` after the lobby confirmation flow. |

The browser `playerKey` is a local secret stored in `localStorage`; the server stores only its SHA-256 hash in character JSON. Character files are saved under `server/characters/` by default, or `CHARACTER_STORAGE_DIR` when provided.

### Client to Server

| Message | Sent by | Purpose |
|---|---|---|
| `"input"` | `RoomClient.sendInput()` | Movement, fire, and interact booleans. Sent only when changed. |
| `"attack"` | `RoomClient.sendAttack()` | Attack direction and target coordinates. |
| `"dash"` | `RoomClient.sendDash()` | One-shot dash request; the server owns cooldown, facing direction, movement, and collision resolution. |
| `"bowChargeStart"`, `"bowAim"`, `"bowCancel"` | Bow input helpers | Starts, updates, or cancels a server-owned bow charge. |
| `"bowVolleyStart"`, `"bowVolleyAim"`, `"bowVolleyRelease"`, `"bowVolleyCancel"` | Bow Volley input helpers | Starts, updates, releases, or cancels server-owned bow secondary targeting. Volley reuses synced bow charge state and auto-releases after full charge. |
| `"axeWhirlwind"` | `RoomClient.sendAxeWhirlwind()` | Starts or stops the server-owned axe whirlwind state; the server owns max duration and cooldown. |
| `"shieldBlockStart"`, `"shieldBlockStop"` | Shield input helpers | Starts or stops held shield blocking for an equipped shield. The server validates shield item, slot HP, cooldown, death, and game-over state. |
| `"setPvpEnabled"` | PvP toggle | Sets the requesting player's private server-owned PvP flag. The server ignores any claimed player ID and only updates the sending client. |
| `"readyForNextWave"` | `RoomClient.sendReadyForNextWave()` | Marks the player ready when they press R during the server-owned wave countdown; if all connected players are ready, the next wave starts early. |
| `"retryGame"` | `RoomClient.sendRetryGame()` | Marks the player ready to retry during game over; one-player rooms restart immediately, multiplayer rooms restart when all connected players are ready. |
| `"equipSlot"` | `RoomClient.sendEquipSlot()` | Requests active hotbar slot changes. |
| `"swapHotbarSlots"` | `RoomClient.sendSwapHotbarSlots()` | Requests a server-validated hotbar slot reorder. |
| `"placeCampfire"`, `"placeCaltrops"`, `"removeDeployable"` | Placement helpers | Requests server-authoritative deployable placement or hammer removal. |
| `"craftItem"` | `RoomClient.sendCraftItem()` | Requests crafting by recipe ID. |
| `"selectUpgrade"` | `RoomClient.sendSelectUpgrade()` | Requests an enchantment-table skill spend with `{ upgradeId, item, slot }`; the server validates skill points, table range, item tree, hotbar slot contents, prerequisites, and max ranks. |
| `"refundUpgradeTree"` | `RoomClient.sendRefundUpgradeTree()` | Requests a refund for all points spent in the currently viewed item tree; the server validates table range and hotbar slot contents, then refunds only that tree. |
| `"setOutfitColor"` | `RoomClient.sendSetOutfitColor()` | Requests player presentation color changes. |
| `"placeMapTile"`, `"removeMapTile"` | Map-editor tools | Requests server-validated tile edits in `"map-editor"` rooms. |
| `"replaceMap"` | Legacy map import path | Bounded browser-draft import for map-editor rooms; not normal persistence. |
| `"saveMap"`, `"loadMap"`, `"listMaps"` | Map-editor storage controls | Saves, loads, or lists server-owned map drafts. |
| `"debugSetRound"` | Escape-menu debug controls | Temporarily enabled for live lag testing. Starts a later wave (2–99) for the room. Wave 1 is the initial wave. |
| `"debugSetLevel"` | Escape-menu debug controls | Temporarily enabled for live testing. Sets the requesting player's level (1–99), resets current XP progress, and adjusts pending skill points and max health from server state. |

The lobby sidebar uses `RoomClient.listPlayableRooms()`, which calls Colyseus `getAvailableRooms("shmup_room")` and filters room metadata to show only joinable normal game rooms with connected players. Room create/join options include the selected `characterId` and browser `playerKey`; `ShmupRoom.ts` loads the matching server-owned character before adding the player state. `ShmupRoom.ts` keeps listing metadata current during room create, join, leave, game-over, and reset events; the room tick does not update lobby listing metadata.

The server treats client data as untrusted. `ShmupRoom.ts` coerces booleans, normalizes directions, and clamps target coordinates.

### Server to Client

| Message | Purpose |
|---|---|
| `"treeHit"` | One-shot tree impact presentation. |
| `"enemyHit"` | One-shot enemy impact presentation. |
| `"woodPickup"` | One-shot pickup sound/UI presentation. |
| `"bonePickup"` | One-shot pickup sound/UI presentation. |
| `"reviveStarted"` | One-shot revive-start presentation. |
| `"playerHurt"` | One-shot player hurt presentation. |
| `"shieldBlock"` | One-shot shield absorption presentation. Clients throttle per-player block audio so rapid hits do not stack sounds. |
| `"shieldBreak"` | One-shot shield break presentation when shield HP reaches zero. |
| `"pvpStatus"` | Authoritative PvP toggle acknowledgement sent to the requesting client. |
| `"pvpStatusChanged"` | Lightweight broadcast that a player's private PvP flag changed; clients do not use it for gameplay authority. |
| `"bowVolleyTelegraph"` | One-shot shared red Volley warning circle presentation before impact. |
| `"bowVolleyImpact"` | One-shot Volley impact/removal presentation. |
| `"bossBombTelegraph"` | One-shot shared boss bomb warning circle presentation before impact. |
| `"bossBombImpact"` | One-shot boss bomb impact/removal presentation. |
| `"craftResult"` | Acceptance or rejection feedback for a crafting request. |
| `"itemCrafted"` | One-shot presentation for successful crafting. |
| `"upgradePicked"` | One-shot upgrade-spend sound sent only to the upgrading client. |
| `"upgradeTreeRefunded"` | One-shot upgrade-refund sound/UI refresh sent only to the refunding client after a successful tree refund. |
| `"levelReset"` | One-shot presentation/state reset after a room-level reset. |
| `"playerLevelUp"` | One-shot level-up presentation; the synced pending upgrade count is displayed as available skill points. |
| `"enemyWaveStarted"` | One-shot wave-start presentation, including shared radio track index and radio start time. |
| `"treesReplenished"` | One-shot wave-clear presentation when the server tops living trees back up after replenishment waves. |
| `"mapImported"` | Legacy map-import acceptance feedback. |
| `"mapList"` | Saved map names returned to the map editor. |
| `"mapStorageError"` | Map storage validation or persistence failure message. |
| `"mapSaveConflict"` | Save rejected because the map name already exists. |
| `"mapSaved"` | Save success confirmation. |
| `"mapLoaded"` | Load success confirmation, including whether data was trimmed. |
| `"debugRoundResult"` | Acceptance or validation feedback for a `"debugSetRound"` request. |
| `"debugLevelResult"` | Acceptance or validation feedback for a `"debugSetLevel"` request. |

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
| `boneDrops` | `MapSchema<BoneDropState>` | Dropped bone pickups. |
| `campfires` | `MapSchema<CampfireState>` | Player-placed healing deployables. |
| `caltrops` | `MapSchema<CaltropState>` | Player-placed slowing/damage deployables. |
| `mapChunks` | `MapSchema<MapChunkState>` | Sparse server-owned map tile chunks rendered by editor and saved-map game rooms. |
| `worldWidth`, `worldHeight` | `int32` | Server-owned world bounds. |
| `elapsedSeconds` | `int32` | Shared round timer. |
| `waveNumber` | `int32` | Current 1-based enemy wave displayed by the client HUD. |
| `currentRadioTrackIndex` | `int8` | Server-selected shared radio track from the current game's shuffled playlist, or `-1` when none is active. |
| `currentRadioStartUnixMs` | `float64` | Unix millisecond timestamp for the active wave radio start; late joiners seek from this. |
| `nextWaveCountdown` | `int8` | Visible pre-wave/inter-wave countdown in seconds; 0 means no ready-up countdown is active. |
| `nextWaveReadyPlayers`, `nextWaveTotalPlayers` | `int8` | Ready-up fraction displayed during the pre-wave/inter-wave countdown. |
| `teamScore` | `int32` | Shared score. |
| `gameStarted` | `boolean` | Whether simulation has started. |
| `gameOver` | `boolean` | Whether the room is in game-over state. |
| `gameOverCountdown` | `int8` | Countdown value displayed during game-over flow. |
| `gameOverRetryReadyPlayers`, `gameOverRetryTotalPlayers` | `int8` | Retry ready-up fraction displayed next to the game-over Retry button. |
| `mode` | `string` | Room mode, usually `"game"` or development-only `"map-editor"`. |
| `activeMapName` | `string` | Saved map loaded into a normal game room, or empty when none is active. |

### Player State

`PlayerState` includes identity, position, health, damage-flash presentation sequence/timing, kills, level/experience, wood, death/revive state, facing and attack direction, active hotbar item, attack state, dash active/cooldown progress, bow/axe state, bow Volley cooldown progress, axe whirlwind active/cooldown progress, shield blocking state, shield block cooldown progress, per-hotbar-slot shield HP/max HP arrays, pending upgrade choices displayed as skill points, upgrade counters, outfit color, and hotbar inventory. Axe upgrade counters include primary attack speed, primary damage, whirlwind cooldown, whirlwind AOE size, and whirlwind damage. Bow upgrade counters include charge speed, primary pierce, primary damage, Volley cooldown, Volley AOE size, and Volley damage. Shield upgrade counters include primary attack speed, primary damage, max HP, recharge speed, and block-circle size.

### Character Profiles

Character profiles are durable server-owned JSON documents, not Colyseus schema. `CharacterStorage.ts` saves display name, level, total XP, XP threshold, pending skill points, outfit color, and upgrade ranks. Each browser-owned player key can create up to five characters. `ShmupRoom.ts` copies those values into `PlayerState` on join and saves them back on level gain, upgrade spend/refund, outfit color change, death, leave, and room dispose. Level reset/retry refreshes combat state and health but preserves character progression.

### Enemy State

`EnemyState` includes position, enemy type, power, health, max health, facing direction, action, attack sequence, damage sequence, death state, and death sequence. Enemy type `5` is the first boss enemy.

### Map Chunk State

`MapChunkState` stores compact 16x16 tile chunks as base64-encoded uint16 frame values. The server owns chunk creation, mutation, persistence, and validation; clients render chunks and send bounded edit requests in map-editor rooms.

### Deployable State

`CampfireState` and `CaltropState` sync renderable deployables created by server-authoritative crafting and placement systems.

### Private Server State

Not every simulation detail is synced. `ShmupRoom.ts` keeps private server-only maps for things like player velocity, cooldowns, revive targets, player invulnerability timers, enemy modes, bullet velocity, tree health, and campfire ownership.

Use schema state only for data clients need to render or display.

---

## Gameplay Systems

Current server-owned systems include:

- Player join/leave and room reset after game over.
- World bounds and tree generation.
- Player movement uses a 200 px/s server-authoritative base speed, facing direction, smooth dash movement with a 2-second cooldown, attack lockout, attack cooldown, and interaction input. Dash cooldown progress is synced for the under-player cooldown bar.
- Axe left-click attacks and active axe whirlwind do not slow server-authoritative player movement. Axe whirlwind starts from a right-click press, runs without holding the button for up to 4 seconds, can be cancelled early by switching weapons or using left-click, and then enters a server-owned cooldown rendered on the hotbar. Axe upgrades split into two branches: primary attack speed up to 3 ranks followed by primary damage up to 10 ranks, and whirlwind cooldown reduction up to 3 ranks followed by AOE size up to 2 ranks and whirlwind damage up to 2 ranks. Whirlwind cooldown ranks reduce the 10-second base cooldown by 2 seconds each, and AOE ranks increase the 56px base radius by 50% each.
- Wood shield and bone shield are craftable server-owned hotbar items that share one shield upgrade tree. Wood shield costs 10 wood and has 10 base shield HP; bone shield costs 10 bones and has 20 base shield HP. Enemy kills have a 75% chance to spawn a synced bone pickup at the enemy death position; any living player who walks into pickup range automatically adds the bone to their hotbar if they have stack space. Left-click with either shield sends normal attack intent, and the server applies a circular bash in front of the player from the cursor aim direction. Shield bash has a 1300ms base cooldown and 1 base damage; shield primary attack speed ranks add +25% speed up to 3 ranks, and shield primary damage ranks add +1 damage up to 5 ranks. Right-click with an equipped shield sends held block start/stop intent. While server-validated blocking is active, incoming damage to the blocking player or any teammate inside the shield circle is applied to the active shield slot before health; damage beyond remaining shield HP spills over to the damaged player's health through the normal hurt/death path. Shield HP is stored per hotbar slot, moves with slot swaps, regenerates by 1 HP every `5000 / (1 + 0.10 * shieldRechargeUpgrades)` milliseconds in any slot, and breaking a shield starts a 5-second server-owned block cooldown rendered on shield hotbar slots. Shield max HP ranks add +3 max HP up to 5 ranks to both wood and bone shields, recharge ranks add +10% recharge up to 5 ranks, and shield size ranks increase the right-click block circle by +25% up to 3 ranks from its 90%-of-previous base size.
- Bow primary charge locks the player in place until fired or cancelled. Bow upgrades split into two branches: charge speed up to 4 ranks at +20% per rank followed by primary pierce up to 10 ranks and primary damage up to 10 ranks, and Volley cooldown reduction up to 3 ranks followed by Volley AOE size up to 5 ranks and Volley damage up to 3 ranks. Bow secondary Volley reuses the same synced `bowCharging`, `bowChargeProgress`, and `bowChargeSeq` presentation, including the charge bar and arrow-pull audio. Volley locks the player in place after right click starts it, newly pressed movement input cancels it just like primary bow charge, and the server auto-releases it at full charge using the latest aimed target clamped to 600px from the player. The release broadcasts a red warning circle for 0.5 seconds, then damages every enemy in the circle and starts a server-owned cooldown rendered on bow hotbar slots. Holding right click repeats Volley after cooldown, while a single right click still casts once. The base Volley is 96px radius, 1 damage, and 3 seconds cooldown; upgrades reduce cooldown by 25% of the base cooldown per rank, increase radius by 25% per rank, and add 1 damage per rank. The local white targeting circle is client-only presentation; Volley impact is server-authoritative.
- Level-ups add pending upgrade choices displayed as skill points. Skill points are spent only through the enchantment table UI by dragging a hotbar item into the panel, then selecting bottom-to-top item-tree nodes with satisfied prerequisites and server-enforced max ranks. The enchantment panel can refund all points spent in the currently viewed item tree; refunds are server-authoritative, restore only that tree's spent points, and wood/bone shield refunds reset their shared shield tree for both shield types.
- Player XP thresholds are total accumulated XP, not XP spent per level. Each level adds `ceil(10 * 1.8^(level - 1))` XP to the cumulative next-level threshold, so level 2 requires 10 total XP, level 3 requires 28 total XP, level 4 requires 61 total XP, and later thresholds grow with an easier-than-doubling curve.
- Tree damage, tree removal, and log spawning.
- Automatic wood pickup, including hammer wood gathering upgrade multipliers.
- Player-placed campfires with a per-player active cap of 1.
- Enemy spawning, waves, target selection, movement, attacks, stun, death, and removal. Enemy targeting resolves each player to the walkable navigation cell nearest to the player's actual foot position before range, line-of-sight, aim, flow-field, and rush decisions; enemy line-of-sight treats solid map cells and layer-3 tables as blockers, melee and caster line-of-sight also check the real player hitbox center and foot, and melee/Dark Knight impact damage is blocked if a solid map cell separates the attack from the player. Caster fireballs aim at the real player hitbox center after line-of-sight is confirmed, not at the resolved navigation target cell. Actual damage overlap still uses the real player hitbox. Dark Knight hit stun is 50% as effective as normal enemy hit stun; Dark Knight rush/charge and attack cooldown states take damage but are not interrupted by hit stun. Boss1 spawns in configured boss waves, has 25 base health plus 25 health per connected player at spawn time, drops 15 XP, chases the closest player with normal enemy flow-field movement at 144 px/s, and uses caster range without line-of-sight to place a fixed bomb circle at the target player's feet. Boss bomb damage is server-authoritative: after a 2.5-second fuse, the room damages living players whose hitbox overlaps the 1.25x Volley-radius circle for 5 damage and broadcasts impact presentation. Caltrops slowing is applied server-side through a private spatial index and short enemy slow timer. Before wave 1 and after each fully cleared wave, the server starts a 30-second ready-up countdown, syncs the ready fraction, starts early if all connected players press R and send `"readyForNextWave"`, then updates `waveNumber` and broadcasts `"enemyWaveStarted"` for horn audio plus deterministic shared radio playback from a server-shuffled playlist created when the game starts or retries. Clients store the wave radio track and start timestamp even while inactive, then seek to the elapsed offset when focus returns so all tabs hear the same track position. After clearing wave 9 and every 10 waves after that, the server tops living trees back up to 25 in valid random spots and broadcasts `"treesReplenished"` for the client toast.
- Waves 1-5 and 10 use explicit ordered spawn lists. Wave 1: 10 melee type 1, then 5 melee type 2. Wave 2: 12 melee type 2, 1 caster, then 13 melee type 2. Wave 3: 10 melee type 1, 2 casters, then 1 Dark Knight. Wave 4: 13 melee type 1, 13 melee type 2, then 13 casters. Wave 5: Boss1, 25 melee type 2, then 20 melee type 1. Wave 10: 2 Boss1, 20 melee type 1, 2 casters, 20 melee type 2, then 1 Dark Knight. Other waves use the default formula. Queued wave enemies spawn one every 2 seconds. Melee type 1 has 5 HP, melee type 2 has 3 HP, casters have 2 HP, Dark Knights have 10 base HP plus 10 HP per connected player, and Boss1 has 25 base HP plus 25 HP per connected player. Casters grant 2 XP to the killer; Dark Knight and Boss1 XP is granted to all players.
- Player bullets and enemy bullets.
- AABB/capsule/circle-style collision helpers for current gameplay interactions.
- Player health, a narrow/tall shifted player damage hitbox, 150ms server-owned post-hit invulnerability, 2-second join/revive invulnerability, death, revive progress, revive completion, and game-over checks. Game over stops client radio playback; the Retry button sends a server-owned retry ready signal, immediately resetting one-player rooms and resetting multiplayer rooms once all connected players are ready.
- Player-vs-player damage is opt-in per player. The client shows a local top-right PvP toggle, but the room owns the actual flag and only allows player-owned attacks to damage another player when both the attacker and target have PvP enabled. Enemy damage behavior is unchanged.
- Team score, player kills, and elapsed round time.

### Performance Sensitivity

The room tick runs on the server and directly affects every connected player. Changes to enemy AI, pathfinding, map collision, projectile collision, spawning, schema update frequency, and production logging must be treated as lag-sensitive. Per-entity and per-tile work should be bounded, cached, spatially indexed, rate-limited, or otherwise budgeted before it is added to the 50ms simulation loop.

Production games may load saved maps automatically, so performance checks should consider authored solid tiles and layer-3 objects, not only empty local rooms. Enemy pathfinding uses direct-path checks as a fast path, bounded A* as a fallback, and cache invalidation on map topology changes; changes in this area should preserve those limits.

---

## Development Map Editor

Map-editor room support still exists server-side through `mode: "map-editor"`, but the current image-backed lobby does not expose a `CREATE MAP` action. Production servers deliberately create normal game rooms instead.

Editor rooms use a 7680×4320 canvas (480×270 native 16px cells), generate no trees or enemies, and retain only player movement plus server-authoritative map-tile collision. A red 3840×2160 boundary marks the original game-world size; players and map tiles are authoritatively constrained inside it. The `mapChunks` schema field holds sparse 16×16 tile chunks as base64-encoded uint16 frame values. Clients send `placeMapTile` and `removeMapTile`; the room validates all coordinates, frame values, and size limits.

`Game.js` renders synced chunks as a tilemap and presents the complete 32×32 `Topdowntileset.png` palette. Castle, Tree, and Water source regions are solid. Selected Castle_1 upper vertical support frames use centered, 50%-wide top-half solid colliders, while the lower and corner supports use centered, 50%-wide full-height colliders. Other solid map frames use full-tile colliders. Floor, Grass, and Garden tiles are walkable. Explicit `saveMap`, `loadMap`, and `listMaps` messages operate on server-owned versioned JSON files in `server/maps/` by default (or `MAP_STORAGE_DIR`). Saves are atomic and only write after the editor's SAVE DRAFT action. `replaceMap` remains a bounded legacy browser-draft import path; it is not the normal persistence mechanism. Production hosting must mount persistent storage at `MAP_STORAGE_DIR` to preserve saved maps across deploys.

Development lobby builds default normal game room creation to the saved `lvlone` map. Sending a saved `mapName` room option loads the saved chunks into a regular game room, crops editor-sized maps to the original 3840×2160 world, syncs `activeMapName`, keeps normal gameplay systems enabled, and uses solid map tiles for player collision while tree generation avoids those solid tiles. The client renders `mapChunks` in both editor and regular rooms; saved-map regular rooms skip procedural grass noise and show a small dev HUD map label.

Enemy movement uses shared server-authoritative flow fields on the 40px build grid. For each alive player target, the room builds a reverse BFS direction field from the player's nearest walkable cell and reuses that field for all enemies targeting that player until the player changes grid cells or map topology changes. Flow-field rebuilds use numeric blocked-cell arrays, reuse build buffers, and are budgeted so at most one player field is rebuilt per tick; if the budget is spent, enemies can temporarily use a same-topology stale field or local fallback. Normal melee chase, caster repositioning, and Dark Knight walking read a direction from this shared field instead of running per-enemy direct-path checks or per-enemy A* paths. The navigation grid treats any solid map frame or layer-3 table cell as blocked, ignores partial visual collider shapes for routing, prevents diagonal corner cutting, and uses a cheap local fallback if an enemy is outside the field or temporarily blocked. Caster and Dark Knight line-of-sight checks are throttled per enemy for attack/rush decisions. Dark Knight rush remains direct collision-resolved movement. Caltrops are not route blockers; they only apply their server-side slow when enemies physically cross them. Map tile and layer-3 table topology changes invalidate enemy flow fields and collision caches.

In saved-map regular rooms, wood drops relocate to nearby green/walkable authored tiles and are not spawned on non-green tiles. Player projectiles are removed when their movement segment crosses a solid authored tile.

## Deployment Architecture

### Client

The client is built with Vite. `vite.config.js` uses `base: './'` and writes the build output to `docs/`.

GitHub Pages deployment is handled by `.github/workflows/deploy.yml`:

1. Install root client dependencies.
2. Build with `npm run client:build`.
3. Pass `VITE_SERVER_URL_1` and `VITE_SERVER_URL_2` from repository secrets for the lobby server selector. If the HTTP character API is not served from the same origin as the WebSocket URL, also pass `VITE_SERVER_API_URL_1` and `VITE_SERVER_API_URL_2`.
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

Saved characters are written to `server/characters/` by default. Production hosting should deploy the current server build so `/characters/list`, `/characters/create`, and `/characters/delete` exist, and should provide persistent storage through `CHARACTER_STORAGE_DIR`; saved maps still use `MAP_STORAGE_DIR`.

The Colyseus monitor is available only when `NODE_ENV !== "production"`.

Live lag testing currently exposes the Escape-menu round jump controls in production. Enemy simulation diagnostics default to off and can be enabled with `ENEMY_DIAGNOSTICS=1`. The map editor remains development-only.

---

## Architectural Invariants

- `RoomClient.js` is the only client-side module that imports `colyseus.js`.
- `Game.js` renders synced state but does not decide authoritative gameplay outcomes.
- `ShmupRoom.ts` is the source of truth for gameplay rules.
- `ShmupRoom.ts` tick work must stay bounded and production-safe; avoid unbounded scans or verbose production diagnostics in enemy, pathfinding, collision, map, projectile, and sync paths.
- `GameState.ts` contains only synced schema data.
- Private room maps contain server-only simulation details.
- Client asset loading flows through `src/assets.js` and `Preloader`.
- Production clients must use `wss://` for `VITE_SERVER_URL_1` and `VITE_SERVER_URL_2`; `VITE_SERVER_URL` remains a backward-compatible fallback for server 1. `RoomClient.js` derives the character API origin from the selected WebSocket URL origin by default, or from `VITE_SERVER_API_URL_1` / `VITE_SERVER_API_URL_2` when those are set.
