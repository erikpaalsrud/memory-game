// Initial grid size for a fresh classic game. Mega mode grows from here.
export const INITIAL_GRID_SIZE = 5;
// Convenience aliases for the initial 5×5 (still used in places that don't care about Mega)
export const GRID_COLS = INITIAL_GRID_SIZE;
export const GRID_ROWS = INITIAL_GRID_SIZE;
export const GRID_CELLS = GRID_COLS * GRID_ROWS; // 25
export const CENTER_CELL = Math.floor(GRID_CELLS / 2); // position 12 (center of 5x5)
export const TOTAL_CARDS = GRID_CELLS - 1; // 24 (center is empty)
export const TOTAL_PAIRS = TOTAL_CARDS / 2; // 12

export const SUDDEN_DEATH_PAIRS = 2; // 4 cards, 2 fresh images for the tiebreaker
export const CARD_FLIP_DELAY_MS = 800;
export const MIN_IMAGE_POOL_SIZE = 20;

// === Mega Mode tuning ===
// 3 consecutive matches by the same player triggers a Mega Wave.
export const MEGA_STREAK_THRESHOLD = 3;
// Maximum mega level — Wave III flips the game into Final Duel mode.
export const MAX_MEGA_LEVEL = 3;
// Score multipliers per mega level. Index = current megaLevel.
// Level 0 = no wave active, 1× scoring. Each successive wave doubles+ stakes.
export const MEGA_SCORE_MULTIPLIERS = [1, 2, 3, 5];
// How many matches benefit from the multiplier after a wave triggers.
// After this many, the wave's multiplier expires and we go back to 1×.
export const MEGA_MULTIPLIER_DURATION = 3;
// "Topsi's Favor" — the trailing player gets a peek/bonus when this far behind.
export const TOPSIS_FAVOR_DEFICIT = 3;

export const SERVER_PORT = 3001;
export const CLIENT_PORT = 5173;
