# Pirate Havoc

Pirate Havoc is a browser-based, top-down naval shooter built for the Jungle Gaming Game Developer Challenge. React owns the application UI and PixiJS owns the fixed-timestep battle arena.

> Current milestone: foundation and first playable vertical slice. Enemy combat, mock REST persistence, the complete Playwright suite, official challenge binaries, and public deployment remain in progress and are tracked in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).

## Stack

- React 19 with functional components and hooks
- TypeScript in strict mode
- Vite
- PixiJS 8
- TanStack Query and Axios
- MSW
- Playwright
- CSS with project-wide design tokens and component-oriented class groups

## Local setup

Requirements: Node.js 20+ and npm 10+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. No private environment variables are required.

## Commands

```bash
npm run dev          # development server
npm run typecheck    # strict TypeScript check
npm run lint         # ESLint with zero warnings
npm run build        # production build
npm run preview      # preview the production build
npm run test:e2e     # Playwright suite
```

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Sail forward | `W` or `Arrow Up` | Up control |
| Turn | `A` / `D` or arrow keys | Left/right turn controls |
| Fire forward | `Space` | Center fire control |
| Fire left/right broadside | `Q` / `E` | L/R fire controls |
| Pause | `Escape` | HUD pause button |

Movement and attacks can be held simultaneously. Losing browser focus pauses the active clock and requires an explicit resume.

## Configuration

- Match duration: 60–180 seconds; default 120.
- Enemy spawn interval: 2–15 seconds; default 4.
- Options persist in `localStorage`.
- Every match receives an immutable configuration snapshot.

## Assets

The application currently includes original SVG fallback art under `public/assets/fallback`. These files were authored for this repository and may be used under the repository license.

The official challenge assets could not be downloaded in the current restricted execution environment. Copy their original `assets/` contents, including all license information, into `public/assets/official/`. The production asset catalog will prefer official files as they are mapped during the asset-integration milestone.

## Documentation

- [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) — requirements, estimates, phases, risks, acceptance checks
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — engine boundaries, lifecycle, persistence, API, and testing decisions

## Known limitations

- This checkpoint implements the vertical slice only; the complete challenge is not yet claimed.
- Dependency installation and production build could not be verified in the current sandbox because outbound npm/GitHub downloads are unavailable. TypeScript and ESLint were checked against compatible dependencies already present on the workstation; a clean `npm ci` remains mandatory before delivery.
- No performance numbers or deployment URL are reported until measured and verified.

