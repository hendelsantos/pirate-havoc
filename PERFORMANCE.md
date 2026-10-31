# Performance verification

Performance measurements are intentionally **not reported yet**. The current execution environment cannot install PixiJS or launch the real production bundle, so publishing FPS or memory numbers would be fabricated.

## Required measurement protocol

1. Run `npm ci && npm run build && npm run preview` on the documented reference machine.
2. Record OS, CPU/GPU, RAM, browser/version, viewport, DPR, and build commit.
3. Run the default 120-second match and a configured 180-second match.
4. Capture FPS, 95th-percentile frame interval, and maximum active entity count.
5. Run five start/play/abandon cycles and compare browser heap/resource snapshots after forced idle periods.
6. Investigate retained canvases, listeners, textures, entities, and animation callbacks before accepting any upward trend.

Target: 60 FPS with no continuously retained engine resources after five cycles. Results and limitations must be committed after a real measurement run.

