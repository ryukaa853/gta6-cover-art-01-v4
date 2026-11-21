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

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const appDir = join(repoRoot, 'app');
if (!existsSync(appDir)) {
  throw new Error(`Neon Coast Cover Lab: app/ is missing at ${appDir}; nothing to export.`);
}
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(shotsDir)) {
  throw new Error(`Neon Coast Cover Lab: screenshots/ is missing at ${shotsDir}; refusing to export an entry with no cover images.`);
}
if (readdirSync(shotsDir).length === 0) {
  throw new Error(`Neon Coast Cover Lab: screenshots/ at ${shotsDir} is empty; refusing to export an entry with no cover images.`);
}

mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });

mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

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

// Validate what was actually exported, so a corrupt or oversized cover
// fails here with a clear message instead of failing later in the scorer:
// every exported screenshot must exist, be non-empty, stay within the
// 256 KiB gate cap, and start with a real JPEG (FF D8 FF) or PNG
// (89 50 4E 47) magic header.
const exportedShotsDir = join(outputDir, 'screenshots');
const exportedShots = readdirSync(exportedShotsDir).sort();
if (exportedShots.length === 0) {
  throw new Error(`Neon Coast Cover Lab: no screenshots were exported to ${exportedShotsDir}.`);
}
for (const name of exportedShots) {
  const file = join(exportedShotsDir, name);
  const size = statSync(file).size;
  if (size === 0) {
    throw new Error(`Neon Coast Cover Lab: exported screenshot ${name} is empty.`);
  }
  if (size > 262144) {
    throw new Error(`Neon Coast Cover Lab: exported screenshot ${name} is ${size} bytes, over the 256 KiB cap.`);
  }
  const header = readFileSync(file).subarray(0, 4);
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  if (!isJpeg && !isPng) {
    throw new Error(`Neon Coast Cover Lab: exported screenshot ${name} is not a JPEG or PNG file (bad magic bytes).`);
  }
}
const dossierStat = statSync(join(outputDir, 'dossier.json'));
if (dossierStat.size === 0) {
  throw new Error('Neon Coast Cover Lab: dossier.json was written empty.');
}
