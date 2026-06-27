# TestTopDownGame

A server-authoritative co-op top-down multiplayer game built with Phaser 3 and Colyseus.

The browser client renders synced state and sends player intent. The Colyseus server owns gameplay truth, including simulation, collision, spawning, scoring, resources, revives, game-over rules, and map persistence.

## Start Here

- Read `AGENTS.md` before making changes. It is the quick-start and contribution guide for agents and developers.
- Read `ARCHITECTURE.md` for the deeper system contract, room flow, network messages, synced state, map editor, and deployment architecture.

## Local Development

Run the server and client in separate terminals.

```bash
cd server
npm install
npm run server:dev
```

```bash
npm install
npm run client:dev
```

Open `http://localhost:5173`, create a room, then open a second tab and join with the displayed room code.

## Verification

For server changes:

```bash
cd server
npx tsc --noEmit
```

For client changes:

```bash
npm run client:build
```

Gameplay, networking, and map-editor changes should also be checked manually with local server and client processes running.
