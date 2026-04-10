#!/usr/bin/env npx tsx
/**
 * Card Image Generator (Mememory) — uses Gemini 2.5 Flash Image to produce
 * the card art for each category. Three-stage workflow:
 *
 *   1. anchors <category|all>     Generate 3 candidate style references per category.
 *                                  You hand-pick the best and rename to _anchor.png.
 *   2. covers                      Generate one cover image per category for the picker UI.
 *   3. variations <category|all>   Use the chosen _anchor.png as image-conditioning input
 *                                  to produce 18 cards in matching style/background.
 *   4. card-back                   Generate the shared card back image.
 *
 * Image-conditioning is the key trick: by feeding _anchor.png back into the model
 * with "swap the subject" instructions, Gemini keeps style + background locked while
 * varying only the central subject. This is much more consistent than text-only prompts.
 *
 * All commands are idempotent — existing files are skipped. Re-run to fill gaps.
 *
 * Usage:
 *   npx tsx scripts/generate-cards.ts anchors all
 *   npx tsx scripts/generate-cards.ts anchors magical
 *   npx tsx scripts/generate-cards.ts covers
 *   npx tsx scripts/generate-cards.ts variations all
 *   npx tsx scripts/generate-cards.ts variations deep-sea
 *   npx tsx scripts/generate-cards.ts card-back
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { CATEGORIES_DATA, getCategory, type CategoryDef } from './subjects.js';
import type { CategoryId } from 'memory-game-shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
const CARDS_DIR = path.resolve(__dirname, '../server/public/cards');
const ANCHOR_CANDIDATE_COUNT = 3;
const RATE_LIMIT_MS = 2500;

const CARD_BACK_PROMPT =
  'Square 1:1 illustration. An ornate mystical card back design with swirling ' +
  'patterns and a central gem, deep purple and gold, painted storybook style. ' +
  'No text, no logos, no borders, no watermarks.';

// ─── Gemini API ────────────────────────────────────────────────────────────

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  inline_data?: { mime_type: string; data: string };
}

async function callGemini(parts: GeminiPart[]): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '1:1' },
    },
  };

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(`API finish reason: ${candidate.finishReason}`);
  }

  const responseParts: GeminiPart[] = candidate?.content?.parts ?? [];

  for (const part of responseParts) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, 'base64');
    if (part.inline_data?.data) return Buffer.from(part.inline_data.data, 'base64');
  }
  throw new Error('No image in API response');
}

async function generateFromText(prompt: string, outputPath: string): Promise<void> {
  const buf = await callGemini([{ text: prompt }]);
  fs.writeFileSync(outputPath, buf);
}

async function generateFromAnchor(
  anchorPath: string,
  subjectInstruction: string,
  outputPath: string,
): Promise<void> {
  const anchorBytes = fs.readFileSync(anchorPath).toString('base64');
  const ext = path.extname(anchorPath).toLowerCase().replace('.', '');
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

  const buf = await callGemini([
    { inlineData: { mimeType, data: anchorBytes } },
    { text: subjectInstruction },
  ]);
  fs.writeFileSync(outputPath, buf);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function categoryDir(id: CategoryId): string {
  return path.join(CARDS_DIR, id);
}

function resolveCategoryArg(arg: string | undefined): CategoryDef[] {
  if (!arg || arg === 'all') return CATEGORIES_DATA;
  const found = CATEGORIES_DATA.find((c) => c.id === arg);
  if (!found) {
    throw new Error(`Unknown category "${arg}". Valid: ${CATEGORIES_DATA.map((c) => c.id).join(', ')}, all`);
  }
  return [found];
}

async function rateLimit(isLast: boolean) {
  if (!isLast) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
}

// ─── Commands ──────────────────────────────────────────────────────────────

async function cmdAnchors(arg?: string) {
  const categories = resolveCategoryArg(arg);
  console.log(`\n=== ANCHORS: ${categories.map((c) => c.id).join(', ')} ===\n`);
  console.log(`Generating ${ANCHOR_CANDIDATE_COUNT} candidates per category.`);
  console.log(`Pick the best of each and rename to "_anchor.png" before running variations.\n`);

  let generated = 0;
  let skipped = 0;

  for (const cat of categories) {
    const dir = categoryDir(cat.id);
    ensureDir(dir);
    console.log(`[${cat.id}]`);

    for (let i = 1; i <= ANCHOR_CANDIDATE_COUNT; i++) {
      const filename = `_candidate-${i}.png`;
      const filePath = path.join(dir, filename);

      if (fs.existsSync(filePath)) {
        console.log(`  ${filename}: exists, skipping`);
        skipped++;
        continue;
      }

      console.log(`  Generating ${filename}...`);
      try {
        await generateFromText(cat.stylePrompt, filePath);
        console.log(`  ✓ Saved ${filename}`);
        generated++;
      } catch (err) {
        console.error(`  ✗ Failed ${filename}: ${(err as Error).message}`);
      }

      const isLastInCategory = i === ANCHOR_CANDIDATE_COUNT;
      const isLastCategory = cat === categories[categories.length - 1];
      await rateLimit(isLastInCategory && isLastCategory);
    }
    console.log();
  }

  console.log(`Done. Generated: ${generated}, Skipped: ${skipped}`);
  console.log(`\nNext step: review candidates in server/public/cards/<category>/`);
  console.log(`Pick the best one per category and rename it to _anchor.png:`);
  console.log(`  mv server/public/cards/magical/_candidate-2.png server/public/cards/magical/_anchor.png`);
  console.log(`Then run: npx tsx scripts/generate-cards.ts variations all`);
}

async function cmdCovers() {
  console.log(`\n=== COVERS ===\n`);
  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < CATEGORIES_DATA.length; i++) {
    const cat = CATEGORIES_DATA[i];
    const dir = categoryDir(cat.id);
    ensureDir(dir);
    const filePath = path.join(dir, '_cover.png');

    if (fs.existsSync(filePath)) {
      console.log(`[${cat.id}] _cover.png: exists, skipping`);
      skipped++;
      continue;
    }

    console.log(`[${cat.id}] generating _cover.png...`);
    try {
      await generateFromText(cat.coverPrompt, filePath);
      console.log(`  ✓ Saved`);
      generated++;
    } catch (err) {
      console.error(`  ✗ Failed: ${(err as Error).message}`);
    }

    await rateLimit(i === CATEGORIES_DATA.length - 1);
  }

  console.log(`\nDone. Generated: ${generated}, Skipped: ${skipped}`);
}

async function cmdVariations(arg?: string) {
  const categories = resolveCategoryArg(arg);
  console.log(`\n=== VARIATIONS: ${categories.map((c) => c.id).join(', ')} ===\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const cat of categories) {
    const dir = categoryDir(cat.id);
    ensureDir(dir);
    const anchorPath = path.join(dir, '_anchor.png');

    if (!fs.existsSync(anchorPath)) {
      console.error(`[${cat.id}] no _anchor.png — run "anchors ${cat.id}" first and pick a winner.\n`);
      continue;
    }

    console.log(`[${cat.id}] using ${path.basename(anchorPath)}`);

    const subjects = cat.subjects;
    for (let i = 0; i < subjects.length; i++) {
      const sub = subjects[i];
      const filename = `${sub.imageId}.png`;
      const filePath = path.join(dir, filename);

      if (fs.existsSync(filePath)) {
        skipped++;
        continue;
      }

      const instruction =
        `Use the provided reference image as a strict style and composition guide. ` +
        `Keep the background, lighting, color palette, framing, and painted illustration ` +
        `style EXACTLY identical. Replace ONLY the central subject with: ${sub.subject}. ` +
        `The new subject must be perfectly centered with the same generous margin as the reference. ` +
        `No text, no logos, no borders, no watermarks. Single subject only.`;

      console.log(`  ${filename}: ${sub.label}...`);
      try {
        await generateFromAnchor(anchorPath, instruction, filePath);
        console.log(`    ✓ Saved`);
        generated++;
      } catch (err) {
        console.error(`    ✗ Failed: ${(err as Error).message}`);
        failed++;
      }

      const isLastInCategory = i === subjects.length - 1;
      const isLastCategory = cat === categories[categories.length - 1];
      await rateLimit(isLastInCategory && isLastCategory);
    }

    // Write per-category manifest after each category completes
    writeManifest(cat);
    console.log();
  }

  console.log(`Done. Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`);
}

function writeManifest(cat: CategoryDef) {
  const dir = categoryDir(cat.id);
  const manifest = cat.subjects.map((s) => ({
    imageId: s.imageId,
    label: s.label,
  }));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`  manifest.json written (${manifest.length} entries)`);
}

async function cmdCardBack() {
  ensureDir(CARDS_DIR);
  const filePath = path.join(CARDS_DIR, 'card-back.png');
  if (fs.existsSync(filePath)) {
    console.log('card-back.png: exists, skipping');
    return;
  }
  console.log('Generating card-back.png...');
  await generateFromText(CARD_BACK_PROMPT, filePath);
  console.log('✓ Saved');
}

// ─── Main ──────────────────────────────────────────────────────────────────

function usage() {
  console.log(`Usage:
  npx tsx scripts/generate-cards.ts anchors <category|all>
  npx tsx scripts/generate-cards.ts covers
  npx tsx scripts/generate-cards.ts variations <category|all>
  npx tsx scripts/generate-cards.ts card-back

Categories: ${CATEGORIES_DATA.map((c) => c.id).join(', ')}`);
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (!cmd) {
    usage();
    process.exit(1);
  }

  switch (cmd) {
    case 'anchors':
      await cmdAnchors(arg);
      break;
    case 'covers':
      await cmdCovers();
      break;
    case 'variations':
      await cmdVariations(arg);
      break;
    case 'card-back':
      await cmdCardBack();
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      usage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nError:', (err as Error).message);
  process.exit(1);
});
