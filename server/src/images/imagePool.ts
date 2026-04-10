import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  CATEGORY_IDS,
  type CardDefinition,
  type CategoryId,
} from 'memory-game-shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARDS_DIR = path.join(__dirname, '../../public/cards');

export type CategoryPools = Record<CategoryId, CardDefinition[]>;

/**
 * Load every category's image pool from server/public/cards/<id>/manifest.json.
 * Each manifest entry must correspond to an existing PNG file in that subfolder.
 * Categories with no manifest or no valid cards return an empty array — the
 * server will refuse to start a game in an empty category.
 */
export function loadCategoryPools(): CategoryPools {
  const result = {} as CategoryPools;

  for (const id of CATEGORY_IDS) {
    const dir = path.join(CARDS_DIR, id);
    const manifestPath = path.join(dir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      console.warn(`[imagePool] no manifest for "${id}" — run: npm run generate-cards variations ${id}`);
      result[id] = [];
      continue;
    }

    try {
      const manifest: CardDefinition[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const valid = manifest.filter((card) => fs.existsSync(path.join(dir, `${card.imageId}.png`)));

      if (valid.length < manifest.length) {
        console.warn(
          `[imagePool] "${id}": ${manifest.length - valid.length} card(s) missing from disk`,
        );
      }
      result[id] = valid;
    } catch (err) {
      console.error(`[imagePool] failed to load "${id}":`, (err as Error).message);
      result[id] = [];
    }
  }

  return result;
}

/** All cards now use PNG. Kept as a constant so callers stay decoupled. */
export const CARD_IMAGE_EXTENSION = 'png';
