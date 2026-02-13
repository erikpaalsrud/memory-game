import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { CardDefinition } from 'memory-game-shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARDS_DIR = path.join(__dirname, '../../public/cards');

export function loadImagePool(): CardDefinition[] {
  const manifestPath = path.join(CARDS_DIR, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.warn('No manifest.json found. Run: npm run generate-cards (or generate-placeholders)');
    return [];
  }

  const manifest: CardDefinition[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Verify each image file actually exists (PNG or SVG)
  return manifest.filter((card) => {
    const pngPath = path.join(CARDS_DIR, `${card.imageId}.png`);
    const svgPath = path.join(CARDS_DIR, `${card.imageId}.svg`);
    return fs.existsSync(pngPath) || fs.existsSync(svgPath);
  });
}

/** Get the file extension for a card image (prefers PNG over SVG) */
export function getCardExtension(imageId: string): string {
  const pngPath = path.join(CARDS_DIR, `${imageId}.png`);
  return fs.existsSync(pngPath) ? 'png' : 'svg';
}
