# Pirate Havoc Architecture

## Boundaries

React owns routes/screens, forms, dialogs, query state, and low-frequency HUD snapshots. PixiJS owns the arena display tree. `GameEngine` owns all continuous match state; React never stores entity positions and does not render every frame.

The game is split into configuration, lifecycle/core, input, simulation systems, entities, collision, rendering, assets, audio/effects, and a narrow UI event bridge. Dependencies point inward toward typed data and pure rules.

## React and PixiJS lifecycle

`GameScreen` creates one engine for a match configuration snapshot. Engine initialization is asynchronous and cancellation-aware. Disposal removes DOM listeners, visibility/focus handlers, resize observers, animation frames, input state, Pixi display objects, and the canvas. The pattern is safe when React Strict Mode intentionally mounts twice in development.

## Simulation loop

`requestAnimationFrame` feeds a clamped accumulator. The engine executes zero or more deterministic 1/60-second updates and renders once. A maximum 250 ms frame contribution prevents a hidden tab from producing a simulation burst. The active match clock, cooldowns, attacks, and spawn clock advance only during `PLAYING`.

## Entities and cleanup

Entities are plain, discriminated TypeScript records with stable IDs, circle collision bounds, health, and optional weapon/AI data. The simulation owns records; the renderer maps IDs to Pixi containers. Destruction marks entities first and cleanup occurs once at the end of a step, preventing duplicate collision damage and score increments.

## Physics and collision

The arena uses circles for ships/projectiles and circles or axis-aligned rectangles for islands. Movement proposes a position, resolves arena bounds, and rejects/adjusts island intersections. Projectiles are swept in small fixed steps, apply damage once, and are removed after the first target/obstacle hit, lifetime expiry, range exhaustion, or arena exit.

## Enemy AI

Chasers rotate toward the player and pursue, with alternate steering probes around islands. Their impact damages the player and destroys the Chaser without awarding points. Shooters approach outside attack range, hold distance inside it, aim toward the player, and fire through the same cooldown/combat system as the player.

## Rendering and assets

An asset catalog preloads immutable URLs once and exposes progress/failure/retry. Official assets are preferred; project-owned SVG fallbacks keep the runtime usable when optional files fail. Render objects reuse textures and are disposed separately from shared cached textures. Damage tint, muzzle bursts, hit flashes, wakes, and explosions provide feedback.

## Configuration

`GameConfig` is a deeply readonly object containing all balance values. Options validate at the UI/storage boundary. Starting a match creates a deep-frozen snapshot; live settings edits therefore affect only future matches.

## Persistence and REST contracts

Browser storage contains settings, stable player identity, confirmed records, pending submissions, scenario selection, and the last completed result. Match records include ID, player, timestamp, score, active duration, end reason, and configuration snapshot.

Axios is the only HTTP client. MSW exposes REST-like ranking/history endpoints in every build. Handlers share typed contracts and persistent fixture storage. Ranking filters matches by a canonical configuration compatibility key, sorts score descending, active duration ascending, timestamp ascending, then match ID.

## TanStack Query strategy

Ranking/history keys contain page and compatibility/player filters. Queries keep previous page data while fetching and reject stale responses through TanStack Query's request lifecycle. Successful submission invalidates both roots. Failures remain isolated from gameplay.

## Idempotent submission and recovery

The match UUID is also the idempotency key. Results are written to the pending queue before the request. The MSW store upserts by match ID before responding, so a simulated timeout-after-commit is safe. A successful mutation removes pending state and updates/invalidate caches. The results screen and menu can retry, while another match may start immediately.

## Testing

Playwright uses seeded RNG and a test-only clock controller that advances the same production simulation systems. Tests drive keyboard/touch inputs rather than mutating combat outcomes. Storage and MSW state reset per test. Visual tests use deterministic entities and disabled decorative randomness.

## Performance decisions

- Fixed arrays/maps owned by the engine, with deferred cleanup.
- Shared textures and object reuse for short-lived effects/projectiles where profiling justifies it.
- Circle broad-phase checks before precise obstacle tests.
- HUD notifications are throttled to meaningful integer/status changes.
- Renderer resolution is capped to balance retina clarity and fill rate.

Measured results will be added only after profiling on documented hardware and an optimized build.

