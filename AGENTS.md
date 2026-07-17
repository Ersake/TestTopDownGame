# AGENTS.md - Project Guide

This file is the durable entry point for agents and contributors. Keep it short, current, and focused on rules that apply across the repository. More-specific `AGENTS.md` files under `src/` and `server/` apply within those trees.

## Project and Providers

This is a server-authoritative co-op top-down multiplayer game built with Phaser 3 and Colyseus.

- The browser client renders synced state and sends player intent.
- The Colyseus server owns gameplay truth, simulation, collision, spawning, progression, persistence, and game-over rules.
- Render is the production Node.js/Colyseus server provider.
- Neon Postgres is the production SQL and durable persistence provider for characters and maps.
- GitHub Pages hosts the built browser client.

## Read Before Editing

1. Read the relevant sections of [ARCHITECTURE.md](ARCHITECTURE.md).
2. Inspect the existing implementation pattern before adding a new one.
3. Read the scoped guidance for files you may touch:
   - [src/AGENTS.md](src/AGENTS.md) for Phaser client work.
   - [server/AGENTS.md](server/AGENTS.md) for server, schema, storage, networking, or simulation work.

## Architectural Invariants

- The client never decides shared gameplay outcomes or mutates authoritative state.
- Put shared gameplay truth in `server/src/rooms/ShmupRoom.ts` and sync only client-visible state through `server/src/schema/GameState.ts`.
- Use room messages for validated client intent and one-shot presentation events, not as a parallel durable-state system.
- Treat every client message and room option as untrusted; validate, normalize, and clamp it on the server.
- Keep `src/network/RoomClient.js` as the only client-side import of `colyseus.js`.
- Keep server tick work bounded, cached, budgeted, spatially indexed, or rate-limited where appropriate.
- Do not expose development-only controls, editor entry points, diagnostics, or the Colyseus monitor in production unless the behavior is explicitly intentional and documented.

## Documentation Rule

Keep documentation up to date with every relevant change.

- Update `ARCHITECTURE.md` when changing room flow, schema fields, messages, persistence, deployment, map behavior, or major gameplay systems.
- Update `README.md` when setup, provider, environment, or contributor-facing behavior changes.
- Update `.env.example` whenever code begins reading a new environment variable.
- Update the applicable `AGENTS.md` when commands, invariants, file ownership, or required verification changes.
- Remove or correct obsolete statements in the same change; do not preserve historical behavior as if it were current.
- Run `npm run docs:check` after documentation, network-message, or environment-variable changes.

## Working Rules

- Keep changes scoped to the requested behavior and preserve unrelated user changes.
- Prefer extending existing helpers and message paths over adding parallel systems.
- Keep durable simulation details private to the room unless clients need them to render or display UI.
- Do not commit `.env`, runtime logs, generated character saves, `docs/`, or `server/dist/`.
- Treat `server/maps/*.json` as intentional authored game data unless a task explicitly says otherwise.
- Do not silently weaken validation, production guards, persistence durability, or multiplayer authority.

## Verification

Run the narrow checks while iterating and the unified check before finishing:

```bash
npm run docs:check
npm run server:typecheck
npm run server:test
npm run client:build
npm run verify
```

`npm run verify` runs documentation checks, server type checking, server tests, and the client production build.

For gameplay, networking, schema, collision, spawning, AI, pathfinding, map, or persistence changes:

- Test with at least two browser clients when the local environment permits it.
- Check saved-map behavior, not only the empty/default world.
- Include a lag-risk check for server tick changes and confirm expensive work remains bounded.
- Report manual multiplayer, Render, Neon, or map-editor checks that could not be run.

The current lobby does not expose a map-editor creation action. Do not claim the map-editor flow was manually verified unless an editor room was actually reached through a valid development entry point.

## Current User Flow

1. `Boot` starts `Preloader`; `Preloader` loads `src/assets.js` and starts `Lobby`.
2. The lobby loads or creates a server-owned character profile.
3. A player creates a room or joins one from the active-room list.
4. `RoomClient` creates or joins the Colyseus `"shmup_room"`.
5. `Game` renders synced state and sends intent.
6. Wave readiness and game-over retry readiness are server-owned multiplayer flows.
7. The game-over UI offers Retry and Quit; Quit disconnects and returns to `Lobby`.

Do not reintroduce automatic `joinOrCreate` on page load unless the lobby flow is intentionally being removed.

## Source Map

| Area | Source of truth |
|---|---|
| Architecture, state, network contract, gameplay, deployment | `ARCHITECTURE.md` |
| Human setup and provider overview | `README.md` |
| Client rendering and input conventions | `src/AGENTS.md` |
| Server authority, storage, performance, and validation | `server/AGENTS.md` |
| Client environment template | `.env.example` |
| Production client deployment | `.github/workflows/deploy.yml` |
| Authoritative simulation | `server/src/rooms/ShmupRoom.ts` |
| Synced schema | `server/src/schema/GameState.ts` |
