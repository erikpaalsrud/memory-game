// === Categories ===
// Each game uses cards from a single category. The set of categories
// is fixed; image assets live under server/public/cards/<id>/.

export type CategoryId =
  | 'magical'
  | 'mystical'
  | 'tropical'
  | 'jungle'
  | 'deep-sea';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  blurb: string;
}

export const CATEGORIES: readonly CategoryMeta[] = [
  {
    id: 'magical',
    label: 'Magical',
    blurb: 'Princes, princesses, and storybook wonders',
  },
  {
    id: 'mystical',
    label: 'Mystical',
    blurb: 'Unicorns, dragons, and mythical beasts',
  },
  {
    id: 'tropical',
    label: 'Tropical',
    blurb: 'Sun, surf, and island treasures',
  },
  {
    id: 'jungle',
    label: 'Jungle',
    blurb: 'Wild animals deep in the canopy',
  },
  {
    id: 'deep-sea',
    label: 'Deep Sea',
    blurb: 'Glowing creatures from the abyss',
  },
] as const;

export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id);

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value);
}
