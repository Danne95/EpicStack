export const PLAYER_COUNT = 2;
export const TOWER_SIZE = 10;
export const MIN_BRICK_VALUE = 1;
export const MAX_BRICK_VALUE = 100;
export const BRICK_COUNT = MAX_BRICK_VALUE - MIN_BRICK_VALUE + 1;

// Fail explicitly if a pathological injected random source repeatedly deals winning towers.
export const MAX_INITIAL_DEAL_ATTEMPTS = 100;
