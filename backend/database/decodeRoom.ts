import { checkWin } from '../../shared/game/index';
import { MIN_BRICK_VALUE, MAX_BRICK_VALUE, TOWER_SIZE } from '../../shared/game/constants';
import type { GameState, PlayerId } from '../../shared/types/index';
import type { StoredRoom } from './roomStore';

export const STATE_VERSION = 1;
function invalid(): never {
  throw new Error('Stored room data is invalid or unsupported.');
}
function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function integer(value: unknown, minimum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum)
    return invalid();
  return value;
}
function playerId(value: unknown): PlayerId {
  if (value !== 0 && value !== 1) return invalid();
  return value;
}
function bricks(value: unknown): number[] {
  if (!Array.isArray(value)) return invalid();
  return value.map((brick: unknown) => {
    const number = integer(brick, MIN_BRICK_VALUE);
    if (number > MAX_BRICK_VALUE) return invalid();
    return number;
  });
}

/** Decode only snapshots that the room service can persist, never arbitrary engine inputs. */
export function decodeGame(value: unknown): GameState | null {
  if (value === null) return null;
  const envelope = object(value);
  if (envelope.version !== STATE_VERSION) return invalid();
  const game = object(envelope.state);
  if (!Array.isArray(game.players) || game.players.length !== 2) return invalid();
  const players = game.players.map((value: unknown, index: number) => {
    const player = object(value);
    if (player.id !== index) return invalid();
    const tower = bricks(player.tower);
    if (tower.length !== TOWER_SIZE) return invalid();
    return { id: playerId(player.id), tower };
  }) as [{ id: PlayerId; tower: number[] }, { id: PlayerId; tower: number[] }];
  const occupied = players.flatMap((player) => player.tower);
  if (new Set(occupied).size !== 2 * TOWER_SIZE) return invalid();
  const discardedBricks = bricks(game.discardedBricks);
  const turn = object(game.turn);
  const number = integer(turn.number, 1);
  const actor = playerId(turn.playerId);
  const wins = players.map((player) => checkWin(player.tower));
  if (game.status === 'won') {
    const winner = playerId(game.winner);
    if (
      turn.phase !== 'complete' ||
      winner !== actor ||
      !wins[winner] ||
      wins[1 - winner] ||
      discardedBricks.length !== number ||
      'drawnBrick' in turn
    )
      return invalid();
    return {
      players,
      discardedBricks,
      status: 'won',
      winner,
      turn: { number, playerId: actor, phase: 'complete' },
    };
  }
  if (
    game.status !== 'playing' ||
    game.winner !== null ||
    wins.some(Boolean) ||
    discardedBricks.length !== number - 1
  )
    return invalid();
  if (turn.phase === 'awaiting-draw' && !('drawnBrick' in turn)) {
    return {
      players,
      discardedBricks,
      status: 'playing',
      winner: null,
      turn: { number, playerId: actor, phase: 'awaiting-draw' },
    };
  }
  if (turn.phase !== 'awaiting-placement') return invalid();
  const drawn = bricks([turn.drawnBrick])[0]!;
  if (occupied.includes(drawn)) return invalid();
  return {
    players,
    discardedBricks,
    status: 'playing',
    winner: null,
    turn: { number, playerId: actor, phase: 'awaiting-placement', drawnBrick: drawn },
  };
}

function timestamp(value: unknown): string {
  if (!(value instanceof Date) && typeof value !== 'string') return invalid();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return invalid();
  return date.toISOString();
}
function hash(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return invalid();
  return value;
}
export function decodeRoom(value: unknown): StoredRoom {
  const row = object(value);
  if (typeof row.code !== 'string' || !/^[A-F0-9]{10}$/.test(row.code)) return invalid();
  const revision = integer(
    typeof row.revision === 'string' ? Number(row.revision) : row.revision,
    0,
  );
  const guest = row.guest_token_hash === null ? null : hash(row.guest_token_hash);
  const game = decodeGame(row.game_state);
  if ((guest === null) !== (game === null) || (game === null ? revision !== 0 : revision === 0))
    return invalid();
  return {
    code: row.code,
    revision,
    credentials: [hash(row.host_token_hash), guest],
    game,
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
    expiresAt: timestamp(row.expires_at),
  };
}
