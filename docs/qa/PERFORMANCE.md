# Performance evidence

Latest engagement measurement is `benchmark.json`: production 1080×1920, 40 disciples (visitors), gift bursts every 700ms (`mock-linh-thach`, `mock-tien-dan`, `mock-phi-kiem`) and a new audience milestone every 4.9 seconds for 60.048 seconds. The shared particle pool peaks at 180 (capped at pool limit). Raw `performance.now()` intervals between Phaser updates are measured, rather than the engine-smoothed timestep.

Result: mean **59.55 FPS**, slowest complete 60-frame window **46.75 FPS**, p95 frame time **17.6ms**, 3,569 frames rendered. Exceeds the 30 FPS acceptance target for both mean and minimum window. Hardware: Apple M1, 8 CPU cores, 16GiB RAM, macOS arm64; headed Chromium uses ANGLE Metal on Apple M1. Final sampled game-update CPU time was about 0.1ms. This measures local rendering with audio disabled; it does not establish narration cost, OBS encoding performance or a universal hardware guarantee.

This run includes persistent nameplates and the current scene. Earlier reports were collected on different hardware; they are not a controlled before/after comparison. `benchmark-before-livestream-improvements.json` preserves the report present before this run. No garbage-collection instrumentation was used.

Original v1 measurement is preserved as `benchmark-release-v1.json`: 116.91 mean FPS, 70.60 minimum window FPS and 9.4ms p95 under the older gift-only scenario.

Initial diagnostic `benchmark-headless-initial.json` used CPU SwiftShader, smoothed timestep data and overlapping screenshot work. It missed the target. No claim is made that software rendering meets the target. Native resolution, visitor count and pool budgets remain unchanged.

Run `npm run build` then `npm run benchmark` alone. Chromium opens with hardware acceleration; keep its window open during the measurement. `TEMPLE_BENCHMARK_HEADLESS=1 npm run benchmark` measures the distinct headless/software path. Do not run another Playwright suite concurrently. No real TikTok traffic, OBS capture or broadcasting is included.

