# Client Guidance

This file applies to the Phaser client under `src/`. The root `AGENTS.md` still applies.

## Ownership Boundary

- The client is a renderer and input collector, never the owner of shared gameplay truth.
- It may render sprites, UI, animation, audio, camera behavior, and smoothed presentation from synced state.
- It may send raw player intent such as movement, attacks, aiming, interaction, equipment, crafting, and editor requests.
- It must not decide hits, damage, pickups, score, progression, deaths, spawns, collision truth, placement validity, retries, or game-over results.
- Client-only prediction or smoothing must never mutate authoritative state or become a second simulation.

## Existing Patterns

- `src/network/RoomClient.js` is the sole client import of `colyseus.js` and owns the selected server, room, character API calls, and outbound message helpers.
- Register durable state listeners and one-shot room-message listeners through the existing `Game.js` networking setup.
- Load assets through `src/assets.js` and `Preloader`; do not import `phaser.js` as an ES module because `index.html` exposes global `Phaser`.
- Send continuous input only when it changes. Preserve the existing `RoomClient.sendInput()` diff behavior.
- Clean up every sprite, bar, timer, input handler, and room listener created by a scene when leaving or re-entering it.
- Keep active-room joining, character selection, and server selection in `Lobby`; do not restore automatic `joinOrCreate` behavior.

## Synced Objects and Messages

When adding a synced object type:

1. Let the server own spawn, mutation, collision, and cleanup.
2. Register client `onAdd` and `onRemove` rendering listeners.
3. Render existing objects when joining late.
4. Destroy all related presentation objects during scene cleanup.

Use durable schema state for facts clients need to render over time. Use server messages only for discrete presentation such as sounds, impacts, toasts, and telegraphs.

## Verification

For client changes, run:

```bash
npm run client:build
```

For lobby, networking, or gameplay presentation changes, also run `npm run verify` and manually check two clients when possible. Report any browser or multiplayer checks that were not run.

