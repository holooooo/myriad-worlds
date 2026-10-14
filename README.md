# Myriad Worlds · 万境

[中文](README.zh-CN.md) · [Explore online](https://myriad-worlds.pages.dev/)

Living, seed-generated landscapes in your browser. Wander on foot, fly above the clouds, or experience the world through the eyes of a train, crane, fish, resident or boat.

[![Build and deploy](https://github.com/holooooo/myriad-worlds/actions/workflows/cloudflare-pages.yml/badge.svg)](https://github.com/holooooo/myriad-worlds/actions/workflows/cloudflare-pages.yml)
[![Cloudflare Pages](https://img.shields.io/badge/preview-Cloudflare%20Pages-f38020?logo=cloudflare&logoColor=white)](https://myriad-worlds.pages.dev/)

**[Explore the live world →](https://myriad-worlds.pages.dev/)** — real-time WebGL 2, no pre-rendered scenery, account or backend required. Chinese, Japanese and English interfaces are included.

[![Weather and scenery film](docs/media/scenery-tour-preview.gif)](https://github.com/holooooo/myriad-worlds/releases/download/v1.0.2/scenery-tour-4k.mp4)

**[Watch the 70-second 4K scenery film · MP4](https://github.com/holooooo/myriad-worlds/releases/download/v1.0.2/scenery-tour-4k.mp4)** — ten real browser recordings across both worlds: mineral lakes, palace gardens, bamboo, pavilions, lantern markets, temples, blossom forests, lakesides, shrines and castle towns, under morning mist, golden hour, rain, dusk and moonlight.

Re-record or customize the shot list with [scripts/record_scenery.py](scripts/record_scenery.py); the [recording guide](docs/recording.md) covers weather, destinations, seeds and portrait output. The film uses **native 3840 × 2160 high mode** with stable volumetric sampling and no animated cosmetic grain or per-shot black fades; the existing screenshot set is captured at 1920 × 1080. Chinese captures disable the cloud sea while retaining local mist and weather. Capture manifests record the actual canvas, quality and cloud-sea strength. Screenshots are exported from the running render canvas with [scripts/capture_screenshots.py](scripts/capture_screenshots.py).

![Shanshui palace and city](docs/screenshots/shanshui-palace.jpg)

## Two worlds, one engine

| Shanshui China | Hanami Japan |
| --- | --- |
| Granite needles, cliff pines and cloud seas | Blossom forests, bamboo groves and snow highlands |
| Contour rice terraces and descending mineral lakes | Rice paddies, coastal railway and lake shores |
| Chang’an wards, royal palaces and two-storey teahouses | Daimyo castles, shrines, mountain temples and tea houses |
| Cranes, buffalo, farmers, officials and merchants | Rice farmers, retainers, town merchants and ox carts |
| Horse carriages, sedan chairs, fishing boats and trading vessels | Kago palanquins, fishing boats and coastal traders |
| Dense sky lantern colonies after dusk | Lantern streets and quiet torii paths |

![Descending, separately coloured lakes](docs/screenshots/shanshui-lakes.jpg)
![Japanese castle town](docs/screenshots/hanami-castle.jpg)

| Two-storey teahouse | Fishing boats and shore vegetation |
| --- | --- |
| ![Teahouse](docs/screenshots/teahouse.jpg) | ![Boats](docs/screenshots/boats.jpg) |

Dawn, golden hour, dusk, night and rain change lighting, water, mist and weather together. The compact **Sky** button opens separate foldable cloud, sun, star, moon and giant-planet controls. Continuous sliders adjust solar redshift, sun size/brightness, star count/density/brightness, lunar phase, moon size/halo/brightness with a separate dawn/dusk sun–moon coexistence toggle. The interface supports Chinese, Japanese and English, initially chosen from your browser language. Optional giant-planet skies include an icy ringed world, a Jupiter-like storm and a close white ringed planet, with separate size, direction, brightness and ring tilt controls, detailed surfaces and automatic rotation. Giant planets start disabled on every page entry; the close white planet has a smooth, unspotted surface.

German towns, Swiss alpine villages and Norwegian fjords are planned as a separate western fantasy profile; they are not part of this release.

## Explore

- Drag to look; scroll or pinch to move.
- `W A S D`: move · `Space / E`: rise · `Q`: descend · `Shift`: accelerate.
- **Worlds** changes the theme; **Places** selects destinations and world seeds.
- Click a moving unit or open **Follow**: kinds are grouped and sorted by distance. Trains start at the locomotive; switch to the side view to see the whole convoy. `Esc` exits.
- `T`: cinematic tour · `H`: hide the interface · `P`: save a PNG. Tours score terrain and foreground visibility, then use inspected static, orbit or pan paths. Only the upper-left identity remains visible; `1–5` changes time/weather and `Esc` ends the tour.
- Ambient audio is synthesised locally and starts only when enabled.

Direct links: [Shanshui](https://myriad-worlds.pages.dev/?theme=shanshui&seed=sakura) · [Hanami](https://myriad-worlds.pages.dev/?theme=sakura&seed=sakura). `q=high` or `q=lite` selects rendering quality. Matching theme and seed reproduce the same terrain and asset layout.

## Run and build

Requires Node.js 22+, Python 3.10+ and a WebGL 2 browser.

```sh
npm ci
npm run dev
# http://127.0.0.1:8765/
```

```sh
npm test
npm run build
python3 -m http.server 8765 --directory dist --bind 127.0.0.1
```

`build.py` assembles modules in `world.manifest.json`. A release build writes `dist/` and includes pinned Three.js 0.171.0 locally, so deployment does not rely on a runtime CDN. The quick development entry point uses the same version via importmap.

## Architecture and performance

- Theme profiles own deterministic terrain, habitats, palettes, landmarks and assets.
- Web Workers build chunks; parent chunks remain visible until their complete child coverage is ready.
- Near and distant assets share seeded locations, species and landmark footprints.
- Dense instance pools submit only visible assets; conservative view culling retains nearby shadows and mirrored scenery.
- Vegetation uses shared geometry and root-weighted wind. Petals, lanterns, wildlife and settlement actors have bounded pools.
- Lakes have separate elevations, water IDs and mineral tints. Reflection uses one bounded target for the nearest water level, with sky reflection on other levels.
- Land animals avoid water and city spawns. Residents follow streets, vehicles stay on roads, and boats validate water levels, shores, buildings and rail corridors.
- Rail corridors physically cut terrain and reserve structure clearance at every LOD.
- Access, business and error events use leveled logs; the in-memory diagnostic history is bounded.

See [validation and performance notes](docs/validation.md) for measured conditions and limits. Frame rate depends on viewport, GPU, terrain density and quality; 60 FPS is a target rather than a hardware-independent guarantee.

## Cloudflare deployment

The [GitHub Actions workflow](.github/workflows/cloudflare-pages.yml) tests, builds and archives every branch and pull request before deployment:

- `main` publishes production at **https://myriad-worlds.pages.dev/**.
- Other branches publish isolated Cloudflare previews; the stable branch alias and immutable deployment URL appear in the Actions run summary and GitHub environment.
- Same-repository pull requests publish a `pr-<number>` preview, such as `https://pr-12.myriad-worlds.pages.dev/`. Fork PRs only test and build: deployment secrets are never provided.
- **Actions → Verify and publish Myriad Worlds → Run workflow** can redeploy the selected branch manually.

Repository secrets: `CLOUDFLARE_ACCOUNT_ID` and an account-scoped `CLOUDFLARE_API_TOKEN` with **Cloudflare Pages Edit** permission. Without these, tests and artifact uploads still run, but deployment is explicitly skipped.

The existing Pages project uses `main` as its production branch. For a new account, create it once with `npx wrangler pages project create myriad-worlds --production-branch main`. To deploy locally:

```sh
npm ci
npx wrangler login
npm run deploy          # Build, then publish production (main)
npm run deploy:preview  # Build, then publish preview.myriad-worlds.pages.dev
```

Both local commands rebuild first and set the branch explicitly, so a local `master` checkout cannot accidentally select the wrong environment. Preview URLs are public; do not publish private data in them. Tokens, local credentials, build output and browser test recordings are excluded from Git.

## License

[MIT](LICENSE) © 2026 holooooo. Three.js retains its own MIT notice, included in release builds as `vendor/THREE-LICENSE.txt`.

## Credits

Inspired by [宝玉 / @dotey's prompt](https://x.com/dotey/status/2102565403109085669). Opus 5.5 provided the initial foundation, and GLM 5.3F completed development of the demo. [X post draft](docs/x-post.txt) accompanies the real browser scenery film.

## Landscape references

Lake shapes and colour relationships were studied from real photographs of [Jiuzhaigou / Shuzheng Lakes](https://en.wikipedia.org/wiki/Jiuzhaigou) and [Daocheng Yading / Milk Lake](https://en.wikipedia.org/wiki/Yading). Their lessons inform procedural valley basins, wooded dams and pale shallows. No photographs were copied into world assets; screenshots and videos here come from this project.
