# Validation · 验收记录

The release is a WebGL 2 browser application. Repository screenshots and the 70-second scenery film are captured from the running procedural world.

本版本为 WebGL 2 浏览器应用。仓库截图和 70 秒景色演示片来自实机运行中的世界。

## Regression coverage

`npm test` checks release module resolution and licenses, terrain topology and seams, shared deterministic asset positions, themed buildings and animals, roads and boats, elevated lake water/shore/mist, contour terraces, physical rail cuts, visible instance compaction, conservative frustum culling, sky controls, three-language UI, distant town silhouettes and follow cameras.

- 488,300 terrain triangles and 17,664 seam comparisons.
- 26,880 actual frustum-ray cases, near shadows and reflected scenery guards.
- 800 randomized instance-pool operations, preserving logical slots while removing hidden GPU instances.
- 15 descending lakes in three chains; 85 terrace bands; 2,709 rail samples and 107 terrain cuts.
- 11,173 shore-plant LOD invariants; elevated lake mist and banks use their actual water level.
- Residents, vehicles and boats in both cultures move along validated routes. Land animals avoid water and city spawning.
- 245 UI keys, three languages and 72 translated destinations; browser-language fallback and explicit preference persist correctly.
- Follow menu checks actual kinds before applying display limits; locomotive is the default train target, side camera preserves train phase and stays above uneven terrain.

Release builds package pinned Three.js 0.171.0 with its MIT license and the transitive closure of the ten required addons. A browser import audit with external requests blocked loaded all 12 local modules successfully, without failed requests or page errors.

## Performance measurement

Measured with real requestAnimationFrame intervals on Apple M3 Max / ANGLE Metal, seed `sakura`, golden hour, high quality, 1280 × 720 CSS pixels and a **1.6 pixel ratio** (2048 × 1152 render buffer). Each run lasts 20 seconds following an actually moving locomotive. Video capture, encoding, other GPU scenes and regression tests were stopped during these runs.

| World / 世界 | Camera / 视角 | Mean FPS | p95 frame time |
| --- | --- | ---: | ---: |
| China / 中国 | Locomotive / 车头 | 56.43 | 23.1 ms |
| China / 中国 | Side / 侧面 | 57.60 | 22.2 ms |
| Japan / 日本 | Locomotive / 车头 | 47.76 | 27.6 ms |
| Japan / 日本 | Side / 侧面 | 42.91 | 30.8 ms |

Each run covers a different live route segment; these are not controlled before/after comparisons. The Japanese runs include dense satoyama/coastal vegetation and water reflection. No shader quality, fog steps or reflection cadence was reduced for these measurements. At a 1.0 pixel ratio, separate Japanese runs reached 59.30 / 59.94 FPS, but those results must not be compared as equal-resolution performance.

Current improvements include dense instance submission, stable chunk scheduling, conservative visibility culling, distant subpixel facade pruning, exact point-light cutoff shading and fog noise work skipped outside its layer. **Stable 60 FPS throughout the world at a 1.6 pixel ratio is not achieved.** Water reflection still submits a large set of foliage instances; finer spatial batching per render pass is a future optimization.

同一高画质、1.6 像素比例下，本机实测约 43–58 FPS，尚未实现全路线稳定 60 FPS。没有为提高数字降低雾采样、反射更新频率或渲染比例。原始测量包含路线起止坐标、GPU、实例数量和错误计数，见 [performance](performance/)。

Recording frame rate is separate from rendering performance. The current [scenery film](media/scenery-tour.mp4) is H.264 at 1920 × 1080, encoded at 30 FPS for 70 seconds, using the current `high` setting. Its ten shots cover both themes and all five moods; each waits for local camera/target chunks before capture. Chinese shots disable the cloud sea while keeping local fog and weather; the recorder checks the actual cloud-sea uniform on every frame. The [capture manifest](media/scenery-tour.json) records canvas size, quality, pixel ratio, maximum cloud-sea strength, camera, seed, actual requestAnimationFrame rate and empty application error lists. The [screenshot manifest](screenshots/capture.json) records equivalent evidence for native canvas exports. These short recordings are not controlled performance benchmarks. Reproduction instructions are in the [recording guide](recording.md).

## Practical limits

The lake reflection target follows the nearest visible water level. Other lake levels use sky reflection; the implementation does not render one scene reflection per pond. Fog, wildlife and actors use bounded pools. Western fantasy is a planned profile rather than a completed world in this release.

彩湖反射目标跟随最近的可见水位，其余水体使用天空反射；每个湖没有独立的全场景反射。雾、动物和居民均有数量上限。西方奇幻主题保留扩展接口，本版本尚未加入。

## Publishing

GitHub Actions verifies the complete test chain and archives the locally vendored release before publishing. The repository has Cloudflare account/token secrets configured: `main` targets production, other branches and same-repository PRs target isolated previews. Deployment links appear in the run summary and GitHub environment. Fork PRs verify and archive without deployment credentials. Local publication can instead use the signed-in Wrangler OAuth session. If secrets are removed, CI explicitly skips deployment rather than failing verification.
