#!/usr/bin/env npx tsx
/**
 * Mascot Generator — creates pixel art variations of the Mememory mascot
 * using the Gemini API. The mascot is a small round creature called "Topsi"
 * who reacts to game events with different facial expressions.
 *
 * Usage: npx tsx scripts/generate-mascot.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
const OUTPUT_DIR = path.resolve(__dirname, '../server/public/mascot');

// Base character description — consistent across all moods
const BASE = `A cute cartoon dolphin in pixel art style, 64x64 pixels aesthetic.
The dolphin is soft blue/periwinkle colored, round and chibi-proportioned with a big head,
big expressive eyes, a small snout with a friendly beak, and tiny flippers.
TRANSPARENT BACKGROUND — no background color at all, fully transparent PNG.
The style is chunky pixel art with visible pixels, like a retro game character.
Keep it simple, cute, and consistent across variations.
IMPORTANT: Do NOT include any text, words, letters, or labels anywhere in the image.`;

// Mood variations
const MOODS: Record<string, string> = {
  idle: `${BASE} The dolphin has a calm, friendly smile with half-closed relaxed eyes. Floating peacefully.`,
  happy: `${BASE} The dolphin has a huge open smile showing joy, eyes squeezed shut with happiness, tiny sparkles and bubbles around it.`,
  sad: `${BASE} The dolphin looks disappointed with droopy eyes and a small frown, a single tear drop on one side.`,
  excited: `${BASE} The dolphin is leaping up with wide open eyes full of excitement, mouth open in delight, water splash motion lines around it.`,
  battle: `${BASE} The dolphin has a determined fierce expression with furrowed brows and a confident smirk, wearing a tiny headband.`,
  streak: `${BASE} The dolphin is glowing golden with star eyes and a triumphant grin, a fiery aura around it, riding a wave, looking unstoppable.`,
  nervous: `${BASE} The dolphin is sweating with wide worried eyes and a wobbly smile, tiny bubbles of anxiety around it.`,
  shocked: `${BASE} The dolphin has huge wide eyes with tiny pupils and its mouth is a perfect O of surprise, fins raised up.`,
  thinking: `${BASE} The dolphin has one eye squinted and the other looking up, with a flipper on its chin. A small thought bubble with "?" above.`,
  sleeping: `${BASE} The dolphin has closed eyes with a peaceful smile, a small "Zzz" floating above, gently bobbing in water.`,
  sudden_death: `${BASE} The dolphin has intense glowing red eyes with a serious battle-ready expression, electric sparks around it, dark dramatic lighting, riding a lightning bolt.`,
  victory: `${BASE} The dolphin is wearing a tiny golden crown, eyes closed in bliss with the biggest smile, confetti and bubbles falling around it, doing a backflip.`,
  defeat: `${BASE} The dolphin is sinking slightly with X shaped eyes and a flat line mouth, looking dramatically defeated but still cute, tiny bubbles rising.`,
};

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
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Mememory Mascot Generator');
  console.log('========================\n');
  console.log(`Generating ${Object.keys(MOODS).length} mood variations...\n`);

  let generated = 0;
  let skipped = 0;
  const entries = Object.entries(MOODS);

  for (let i = 0; i < entries.length; i++) {
    const [mood, prompt] = entries[i];
    const filename = `topsi_${mood}.png`;
    const filePath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(filePath)) {
      console.log(`  ${mood}: already exists, skipping`);
      skipped++;
      continue;
    }

    console.log(`  Generating: ${mood}...`);
    try {
      await generateImage(prompt, filePath);
      console.log(`  ✓ Saved: ${filename}`);
      generated++;
    } catch (err: any) {
      console.error(`  ✗ Failed: ${mood} — ${err.message}`);
    }

    // Rate limit
    if (i < entries.length - 1) {
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  console.log(`\nDone! Generated: ${generated}, Skipped: ${skipped}, Total: ${entries.length}`);
  console.log(`Output: server/public/mascot/`);
}

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
