#!/usr/bin/env npx tsx
/**
 * Creates placeholder manifest + simple SVG card images
 * for development without Gemini API access.
 *
 * Usage: npx tsx scripts/generate-placeholders.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../server/public/cards');

const CARDS = [
  { emoji: '\u{1F409}', label: 'crystal dragon', color: '#8B5CF6' },
  { emoji: '\u{1F511}', label: 'golden key', color: '#F59E0B' },
  { emoji: '\u{1F344}', label: 'mushroom house', color: '#10B981' },
  { emoji: '\u{1F319}', label: 'sleeping moon', color: '#6366F1' },
  { emoji: '\u{1F525}', label: 'baby phoenix', color: '#EF4444' },
  { emoji: '\u{1F47B}', label: 'friendly ghost', color: '#94A3B8' },
  { emoji: '\u{1FA84}', label: 'wizard hat', color: '#7C3AED' },
  { emoji: '\u{1F9EA}', label: 'potion bottle', color: '#EC4899' },
  { emoji: '\u{1FA94}', label: 'enchanted lantern', color: '#F97316' },
  { emoji: '\u{1F431}', label: 'winged cat', color: '#06B6D4' },
  { emoji: '\u{1F4E6}', label: 'treasure chest', color: '#D97706' },
  { emoji: '\u{1F9ED}', label: 'magical compass', color: '#0EA5E9' },
  { emoji: '\u{1FA9E}', label: 'enchanted mirror', color: '#A855F7' },
  { emoji: '\u{1F9DA}', label: 'fairy', color: '#22C55E' },
  { emoji: '\u{1F52E}', label: 'crystal ball', color: '#8B5CF6' },
  { emoji: '\u{1FAB6}', label: 'magical quill', color: '#3B82F6' },
  { emoji: '\u{1F432}', label: 'sleeping dragon', color: '#DC2626' },
  { emoji: '\u{1F570}', label: 'magical clock', color: '#14B8A6' },
  { emoji: '\u{1F984}', label: 'unicorn horn', color: '#E879F9' },
  { emoji: '\u{1F339}', label: 'enchanted rose', color: '#F43F5E' },
];

function makeSvg(emoji: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="16" fill="${color}22"/>
  <rect x="4" y="4" width="248" height="248" rx="14" fill="none" stroke="${color}" stroke-width="3"/>
  <text x="128" y="148" text-anchor="middle" font-size="100">${emoji}</text>
</svg>`;
}

function makeCardBack(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="100%" stop-color="#1E1B4B"/>
    </radialGradient>
  </defs>
  <rect width="256" height="256" rx="16" fill="url(#g)"/>
  <rect x="8" y="8" width="240" height="240" rx="12" fill="none" stroke="#A78BFA" stroke-width="2" stroke-dasharray="8 4"/>
  <text x="128" y="148" text-anchor="middle" font-size="80">\u{2728}</text>
</svg>`;
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Card back
  fs.writeFileSync(path.join(OUTPUT_DIR, 'card-back.svg'), makeCardBack());
  console.log('Created: card-back.svg');

  // Card faces
  for (let i = 0; i < CARDS.length; i++) {
    const card = CARDS[i];
    const filename = `card-${String(i + 1).padStart(3, '0')}.svg`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), makeSvg(card.emoji, card.color));
  }
  console.log(`Created: ${CARDS.length} card face SVGs`);

  // Manifest
  const manifest = CARDS.map((card, i) => ({
    imageId: `card-${String(i + 1).padStart(3, '0')}`,
    label: card.label,
  }));
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('Created: manifest.json');
  console.log('\nDone! Placeholder cards ready for development.');
}

main();
