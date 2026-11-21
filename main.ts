// Neon Coast Cover Lab — the entrypoint (Node 22, standard library only).
//
// The app itself is plain static files under app/ (index.html plus its ES
// modules, styles, fonts and sample photos); nothing there needs a build
// step and nothing loads over the network. This program hands the entry in:
// it copies app/ and screenshots/ next to this file into the output
// directory and writes output/dossier.json with the vendored make.fun
// library (vendor/makefun-app.ts), which is the same library the scorer
// uses to rebuild the dossier and compare the two byte for byte.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader MAKEFUN_OUTPUT_DIR is unset and /output is used.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps below mirror the competition's gate (reference/gate.json), so
// this program refuses exactly where the scorer would: at most 4
// screenshots of at most 256 KiB each, app/ at most 993 entries and 48 MiB,
// paths at most 1000 bytes, and the dossier text at most 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
