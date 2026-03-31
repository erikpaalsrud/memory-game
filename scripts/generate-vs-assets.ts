#!/usr/bin/env npx tsx
/**
 * VS Screen Asset Generator — creates coin and VS graphic
 * using the Gemini API.
 *
 * Usage: GEMINI_API_KEY=... npx tsx scripts/generate-vs-assets.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

const ASSETS: Record<string, { prompt: string; outputDir: string; filename: string }> = {
  coin_front: {
    prompt: `A single golden game coin seen from the front, pixel art style, 128x128 pixels aesthetic.
The coin has a shiny metallic gold surface with a raised star emblem in the center.
Subtle light reflections on the rim. Dark transparent background.
Chunky pixel art style, clean edges, retro game aesthetic. No text.`,
    outputDir: '../server/public/gfx/vs',
    filename: 'coin_front.png',
  },
  coin_back: {
    prompt: `A single golden game coin seen from the back, pixel art style, 128x128 pixels aesthetic.
The coin has a shiny metallic gold surface with a raised question mark "?" in the center.
Subtle light reflections on the rim. Dark transparent background.
Chunky pixel art style, clean edges, retro game aesthetic. No text except the "?".`,
    outputDir: '../server/public/gfx/vs',
    filename: 'coin_back.png',
  },
  vs_graphic: {
    prompt: `A dramatic stylized "VS" text graphic for a versus battle screen, pixel art style.
Large bold "VS" letters with fiery energy effects around them, glowing orange and red edges,
electric sparks. The letters are white/gold with a dark outline.
Dark transparent background. Chunky pixel art style, 256x256 aesthetic.
Dynamic, energetic, kid-friendly. Game battle screen style.`,
    outputDir: '../server/public/gfx/vs',
    filename: 'vs_graphic.png',
  },
};

async function generateImage(prompt: string, outputPath: string): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

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
  console.log('VS Screen Asset Generator\n');

  const entries = Object.entries(ASSETS);
  for (let i = 0; i < entries.length; i++) {
    const [name, { prompt, outputDir, filename }] = entries[i];
    const dir = path.resolve(__dirname, outputDir);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);

    if (fs.existsSync(filePath)) {
      console.log(`  ${name}: already exists, skipping`);
      continue;
    }

    console.log(`  Generating: ${name}...`);
    try {
      await generateImage(prompt, filePath);
      console.log(`  ✓ Saved: ${filename}`);
    } catch (err: any) {
      console.error(`  ✗ Failed: ${name} — ${err.message}`);
    }

    if (i < entries.length - 1) await new Promise((r) => setTimeout(r, 2500));
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
