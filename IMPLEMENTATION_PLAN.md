# Pirate Havoc — Implementation Plan

## Estimate

Estimated production implementation: **7 working days** (56 hours), excluding external review and deployment-account delays.

| Phase | Estimate | Deliverable |
| --- | ---: | --- |
| 1. Audit and foundation | 6h | Requirements, asset inventory, project tooling, app shell |
| 2. Playable gameplay | 12h | Player, arena, islands, collisions, three weapons |
| 3. Combat and match rules | 12h | Enemy AI, spawns, health, score, timer, pause, effects |
| 4. UI and persistence | 7h | Responsive screens, touch controls, options, results |
| 5. Ranking integration | 7h | Axios, Query, MSW, idempotency, network scenarios |
| 6. Tests and profiling | 8h | Playwright desktop/mobile/visual tests, measurements |
| 7. Delivery | 4h | Documentation, clean checks, public deployment |

## Defaults and constraints

- Arena logical size: 1,280 × 720; the renderer letterboxes responsively.
- Default match duration: 120 seconds (valid range 60–180, 10-second step).
- Enemy spawn interval: 4 seconds (valid range 2–15, 0.5-second step).
- Landscape is the primary mobile orientation; portrait remains usable with a compact HUD.
- Gameplay uses a 60 Hz fixed simulation step and clamps frame backlog to 250 ms.
- The player identity is a stable, browser-local UUID with display name `Captain`.
- Only active play time counts toward duration; paused time never advances simulation clocks.
- Ranking compatibility is defined by match duration and enemy spawn interval.
- The official repository and README were inspected at commit `315891441be81ca0bff75cf3c2b0cd2f27f119cd` on 2026-10-31.
- **Environment constraint:** the current terminal cannot download GitHub archive binaries and the browser host is unavailable. The official README confirms ships, ship parts, projectiles, effects, tiles, HUD/menu sprites, atlases, references, and WAV audio under `assets/`. Runtime asset loading is isolated behind an asset catalog and ships with original, project-owned SVG fallbacks so development remains executable. Official binaries must be copied unchanged to `public/assets/official/` before final visual acceptance; licensing files will be preserved verbatim.

## Requirement traceability

Status values: `Planned`, `In progress`, `Verified`, `Blocked`.

| Requirement | Implementation | Acceptance evidence | Status |
| --- | --- | --- | --- |
| React functional UI | `src/app`, screen components | Menu/options/results keyboard navigation | In progress |
| Strict TypeScript + Vite | root configuration | `npm run typecheck`, `npm run build` | In progress |
| PixiJS rendering | `src/game/rendering` | Arena, ships, projectiles, effects, health bars | In progress |
| Fixed-step simulation | `GameEngine` accumulator | Timer/movement stable across frame rates | In progress |
| Player controls | input system + touch overlay | Move, rotate, front/left/right fire together | In progress |
| Physics and combat | collision + combat systems | All collision pairs, one-hit projectiles, cleanup | Planned |
| Chaser and Shooter | AI systems | Both spawn and obey islands/rules | Planned |
| Match lifecycle | explicit state machine | menu/loading/play/pause/game-over/restart | Planned |
| Configuration | typed config + local storage | validated 60–180s / 2–15s options snapshot | Planned |
| Responsive accessible UI | React + CSS | desktop/mobile, focus, labels, semantic HUD | Planned |
| Official assets | asset catalog | progress, failure, retry, caching, cleanup | Blocked |
| Ranking/history | typed API + Query/Axios | pagination, states, compatible ranking | Planned |
| MSW in production | service worker + handlers | deterministic scenario selector/reset | Planned |
| Reliable submission | pending queue + idempotency | refresh/retry/timeout never duplicates | Planned |
| Playwright | `tests/e2e` | specified desktop/mobile/visual suite | Planned |
| Performance | diagnostics + report | FPS, p95, entities, 3-minute/5-cycle observations | Planned |
| Deployment | static provider config | public URL, refresh-safe | Planned |

## Phases and acceptance criteria

### Phase 1 — Foundation and vertical slice

- Tooling installs from a clean checkout.
- Menu, loading UI, arena, one island, player movement/rotation, front projectile, and HUD work.
- Strict-mode mount/unmount leaves no active listeners or ticker.

### Phase 2 — Complete gameplay

- Broadside weapons, boundaries, island/projectile/ship collisions, Chaser, Shooter, valid spawns, health, scoring, effects, audio, timer, pause, restart, and cleanup work through real systems.

### Phase 3 — UI and persistence

- Options validate and persist; configuration snapshots are immutable.
- Touch controls, results, abandonment semantics, accessibility, and responsive layout are verified.

### Phase 4 — Data and reliability

- MSW handles every documented network scenario in development and production.
- Ranking/history use Axios and TanStack Query with paging, invalidation, stale-response protection, and consistent records.
- Pending idempotent submissions survive refresh and never duplicate.

### Phase 5 — Automated quality and delivery

- Required Playwright flows and screenshot baselines pass on Chromium desktop/mobile.
- Typecheck, lint, production build, and resource-cycle checks pass.
- Honest performance observations and deployment URL are recorded.

## Verification commands

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:e2e
npm run test:e2e -- --project=mobile-chromium
```

## Technical risks

1. Official asset archive unavailable in the current execution environment; isolated by the asset catalog and tracked as a final acceptance blocker.
2. PixiJS asynchronous initialization under React Strict Mode; guarded by abortable ownership and idempotent disposal.
3. Duplicate submissions after server-side success + client timeout; solved with stable match IDs and server/client idempotency.
4. Browser throttling and focus changes; clamped accumulator, visibility pause, cleared held input, explicit resume.
5. Mobile multi-touch; pointer-ID ownership per control and CSS `touch-action: none`.

