# TestTopDownGame

A server-authoritative co-op top-down multiplayer game built with Phaser 3 and Colyseus.

The browser client renders synchronized state and sends player intent. The Colyseus server owns gameplay truth, including movement, collision, spawning, combat, progression, resources, maps, persistence, readiness, and game-over rules.

## Production Providers

- **Render** hosts the production Node.js/Colyseus server and HTTP character API.
- **Neon Postgres** is the production SQL provider and durable store for character and map documents.
- **GitHub Pages** hosts the Vite-built browser client.

Production persistence should use `DATABASE_URL` or `NEON_DATABASE_URL` from Neon. Local development can fall back to JSON files under `server/characters/` and `server/maps/`.

## Start Here

- Read `AGENTS.md` for repository-wide contribution rules and verification.
- Read `src/AGENTS.md` for Phaser client work.
- Read `server/AGENTS.md` for Colyseus server, schema, storage, and simulation work.
- Read `ARCHITECTURE.md` for the current room flow, network contract, synchronized state, gameplay systems, map behavior, persistence, and deployment architecture.

## Local Development

Install dependencies from the repository root and server directory:

```bash
npm install
npm install --prefix server
```

Run the server and client in separate terminals:

```bash
npm run server:dev
```

```bash
npm run client:dev
```

Open `http://localhost:5173`, select or create a character, and create a room. Open a second browser tab, select a character there, and join from the active-room list.

The local defaults are `ws://localhost:2567` for Colyseus and `http://localhost:2567/colyseus` for the development-only Colyseus monitor.

## Environment

Copy `.env.example` to `.env` for local client settings. Do not commit `.env`.

The client supports two deployed Render servers through `VITE_SERVER_URL_1` and `VITE_SERVER_URL_2`, with `VITE_SERVER_URL` retained as the local and backward-compatible server-1 fallback. Optional `VITE_SERVER_API_URL*` variables override the HTTP API origin when it differs from the WebSocket origin.

The Render service uses Neon through `DATABASE_URL` or `NEON_DATABASE_URL`. See `.env.example` and `ARCHITECTURE.md` for all supported variables and deployment details.

## Verification

Run the complete local verification suite:

```bash
npm run verify
```

Individual checks are also available:

```bash
npm run docs:check
npm run server:typecheck
npm run server:test
npm run client:build
```

Gameplay, networking, persistence, and map changes should also be checked manually with at least two browser clients when possible. The current lobby does not expose map-editor room creation, so report map-editor verification as not run unless an editor room was actually reached through a valid development entry point.

## Deployment

The GitHub Pages workflow builds the client from `.github/workflows/deploy.yml` using the configured Render WebSocket/API secrets.

Deploy `server/` to Render with:

```text
Build command: npm install && npm run server:build
Start command: npm run server:start
```

Set `NODE_ENV=production` and a Neon connection string on Render. The server creates the required `game_characters` and `game_maps` tables automatically.
