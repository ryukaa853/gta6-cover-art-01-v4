# gta6-cover-art-01-v4

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ryukaa853/gta6-cover-art-01-v4/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ryukaa853/gta6-cover-art-01-v4/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Coast Cover Lab — an offline browser web app that turns a person's
photos and a caption into GTA-style cover art: the multi-panel poster look
with bold caption lettering and a Vice City neon-sunset grade, exported as a
PNG to share. Everything is original: no Rockstar Games logo, wordmark,
official artwork, character or font.

## Run it

```sh
python3 -m http.server 8080 --directory app
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=8tc4hwe6&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

## What it does

- **Any photo:** load up to three photos from your machine (file input —
  photos are read locally and never uploaded), or use the two kit sample
  photos. Click a panel to select it, drag to move its photo, scroll to
  zoom, or use the sliders. One photo can fill every panel, or each panel
  can show a different one.
- **Six layouts:** Hero + Three, Four Panel, Full Bleed, Three Strips,
  Nine Panel, and Tilted Snapshots.
- **Six colour grades:** Neon Sunset, Neon Nights, Vice Teal, Golden Hour,
  Palm Dusk, and Noir — each a gradient-map style wash over the photos,
  plus seeded grain and a vignette.
- **Caption:** edit the title and subtitle; four title styles (Solid,
  Outline, Neon Glow, Sunset Gradient). Lettering is Anton for the title
  and Pacifico for the script subtitle, both SIL Open Font License files
  vendored under `app/fonts/`.
- **Extras:** a badge stamp or five-star heat meter on the cover, undo and
  redo for every edit, and a deterministic Surprise Me that cycles
  layout + grade + title style without any randomness.
- **Fast export:** one click exports a PNG in 1080 x 1080, 1080 x 1350 or
  1920 x 1080.

No network request is made at runtime: every script, font and image is a
file under `app/`.

## Entry plumbing

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with the vendored
`vendor/makefun-app.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots live in `screenshots/`: the first by name is an exported wide
cover, then the editor with photos loaded, then exported square and
portrait covers.
