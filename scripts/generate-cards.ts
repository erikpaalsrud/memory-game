#!/usr/bin/env npx tsx
/**
 * Card Image Generator — creates card images for the Memory Game
 * using the Gemini API (same pattern as ~/nanobanana/nanobanana.py).
 *
 * Usage: npm run generate-cards
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
const OUTPUT_DIR = path.resolve(__dirname, '../server/public/cards');

// Themed prompts — whimsical fantasy illustrations for card faces
const PROMPTS = [
  'A cute crystal dragon curled around a gem, simple flat illustration on solid dark background',
  'A magical golden key with butterfly wings, simple flat illustration on solid dark background',
  'A glowing mushroom house at night, simple flat illustration on solid dark background',
  'A sleeping moon wearing a nightcap, simple flat illustration on solid dark background',
  'A baby phoenix hatching from an egg, simple flat illustration on solid dark background',
  'A friendly ghost reading a book, simple flat illustration on solid dark background',
  'A tiny wizard hat with stars, simple flat illustration on solid dark background',
  'A magical potion bottle with swirling colors, simple flat illustration on solid dark background',
  'A floating enchanted lantern, simple flat illustration on solid dark background',
  'A winged cat sitting on clouds, simple flat illustration on solid dark background',
  'A treasure chest overflowing with gems, simple flat illustration on solid dark background',
  'A magical compass with glowing needle, simple flat illustration on solid dark background',
  'An enchanted mirror with sparkles, simple flat illustration on solid dark background',
  'A fairy riding a ladybug, simple flat illustration on solid dark background',
  'A crystal ball on an ornate stand, simple flat illustration on solid dark background',
  'A magical quill writing by itself, simple flat illustration on solid dark background',
  'A tiny dragon sleeping on a pile of coins, simple flat illustration on solid dark background',
  'A magical clock with zodiac symbols, simple flat illustration on solid dark background',
  'A unicorn horn with rainbow light, simple flat illustration on solid dark background',
  'An enchanted rose in a glass dome, simple flat illustration on solid dark background',
];

const CARD_BACK_PROMPT =
  'An ornate mystical card back design with swirling patterns and a central gem, dark purple and gold, simple flat illustration';

async function generateImage(prompt: string, outputPath: string): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '1:1' },
    },
  };

  console.log(`  Generating: ${prompt.slice(0, 60)}...`);

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];

  let imageData: string | null = null;
  for (const part of parts) {
    if (part.inlineData?.data) imageData = part.inlineData.data;
    else if (part.inline_data?.data) imageData = part.inline_data.data;
  }

  if (!imageData) throw new Error('No image in API response');

  fs.writeFileSync(outputPath, Buffer.from(imageData, 'base64'));
  console.log(`  Saved: ${path.basename(outputPath)}`);
}

function extractLabel(prompt: string): string {
  return prompt
    .split(',')[0]
    .replace(/^A |^An /, '')
    .trim();
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Memory Game Card Generator');
  console.log('==========================\n');

  // Generate card back
  const backPath = path.join(OUTPUT_DIR, 'card-back.png');
  if (fs.existsSync(backPath)) {
    console.log('Card back: already exists, skipping');
  } else {
    console.log('Generating card back...');
    await generateImage(CARD_BACK_PROMPT, backPath);
  }

  // Generate card face images
  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < PROMPTS.length; i++) {
    const filename = `card-${String(i + 1).padStart(3, '0')}.png`;
    const filePath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(filePath)) {
      skipped++;
      continue;
    }

    await generateImage(PROMPTS[i], filePath);
    generated++;

    // Rate limit: 2s between requests
    if (i < PROMPTS.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Write manifest
  const manifest = PROMPTS.map((prompt, i) => ({
    imageId: `card-${String(i + 1).padStart(3, '0')}`,
    label: extractLabel(prompt),
  }));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\nDone! Generated: ${generated}, Skipped: ${skipped}, Total: ${PROMPTS.length}`);
  console.log(`Manifest: server/public/cards/manifest.json`);
}

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
