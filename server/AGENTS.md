# Server Guidance

This file applies to the Colyseus server under `server/`. The root `AGENTS.md` still applies.

## Authority and State Ownership

- `src/rooms/ShmupRoom.ts` owns authoritative gameplay, room flow, validation, collision, AI, spawning, progression, readiness, and cleanup.
- `src/schema/GameState.ts` contains only durable state clients need to render or display.
- Private simulation state belongs in room-owned maps and helpers, not in schema merely for convenience.
- Clean up schema objects and their matching private server state together.
- Apply time-based behavior using delta time or explicit server timestamps as appropriate.

## Network Boundaries

- Treat client messages, room options, character identifiers, player keys, map names, coordinates, frames, directions, and target positions as untrusted.
- Coerce booleans, validate enums and identifiers, clamp numeric ranges and positions, and ignore client-claimed ownership.
- Prefer existing handlers and helpers over parallel message paths.
- Add durable render state to the schema; use server-to-client messages for one-shot presentation.
- Update the network contract in `ARCHITECTURE.md` whenever a message is added, removed, or materially changed.

## Performance

The room simulation loop is latency-sensitive for every connected player.

- Keep per-player, per-enemy, per-projectile, per-tile, and per-schema-update work bounded.
- Reuse caches, buffers, flow fields, spatial indexes, and existing budgets.
- Avoid broad nested scans inside tick paths.
- Invalidate caches deliberately when authored map topology changes.
- Gate verbose diagnostics behind explicit environment flags and keep them disabled by default.
- For AI, pathfinding, collision, spawning, map, projectile, or sync changes, document the lag-risk assessment and any realistic-wave test that could not be run.

## Persistence and Providers

- Neon Postgres is the production SQL provider and durable store for character and map documents.
- `DATABASE_URL` or `NEON_DATABASE_URL` selects the Postgres backends.
- Render is the production Node.js/Colyseus server provider.
- Local development may fall back to JSON under `server/characters/` and `server/maps/`.
- Generated character JSON is runtime data and must not be committed.
- Authored map JSON under `server/maps/` is repository-owned game data unless explicitly identified as temporary.
- Keep Postgres and file backends behaviorally compatible when changing storage contracts.

## Verification

For server changes, run:

```bash
npm run server:typecheck
npm run server:test
```

Run `npm run verify` before finishing. Persistence changes should exercise the local file backend in automated tests and report any Neon integration check that could not be run. Networking/gameplay changes should report any two-client or realistic-wave check that could not be run.
