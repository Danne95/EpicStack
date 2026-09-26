import type { RoomView, Move } from '../../shared/pvp/protocol';
import { createHash, randomBytes } from 'node:crypto';
import { createGame, drawBrick, endTurn, replaceBrick } from '../../shared/game/index';
import type { PlayerId, RandomSource } from '../../shared/types/index';
import { MemoryRoomStore } from '../database/memoryRoomStore';
import type { RoomStore, StoredRoom } from '../database/roomStore';
import { RoomError } from './roomError';
export { RoomError } from './roomError';

// Bound the retry loop even if the identifier source repeatedly collides.
const MAX_CODE_ATTEMPTS = 10;
const ROOM_CODE_BYTES = 5;
const TOKEN_BYTES = 32;
const RANDOM_BYTES = 6;
const RANDOM_RANGE = 2 ** (RANDOM_BYTES * 8);
const digest = (token: string): string => createHash('sha256').update(token).digest('hex');
const random = (): number => randomBytes(RANDOM_BYTES).readUIntBE(0, RANDOM_BYTES) / RANDOM_RANGE;

/** Both storage modes execute these same authoritative operations. */
export class RoomService {
  constructor(
    private readonly roll: RandomSource = random,
    private readonly store: RoomStore = new MemoryRoomStore(),
  ) {}

  async create(): Promise<{ token: string; room: RoomView }> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = randomBytes(ROOM_CODE_BYTES).toString('hex').toUpperCase();
      const room = await this.store.insert(code, digest(token));
      if (room) return { token, room: this.view(room, 0) };
    }
    throw new RoomError('ROOM_LIMIT', 503);
  }

  async join(code: string): Promise<{ token: string; room: RoomView }> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const room = await this.store.update(code, (room) => {
      if (room.credentials[1] !== null) throw new RoomError('ROOM_FULL', 409);
      room.game = createGame({ random: this.roll });
      room.credentials[1] = digest(token);
    });
    return { token, room: this.view(room, 1) };
  }

  async read(code: string, token: string): Promise<RoomView> {
    const room = await this.store.read(code);
    return this.view(room, this.identify(room, token));
  }

  async move(code: string, token: string, move: Move): Promise<RoomView> {
    const room = await this.store.update(code, (room) => {
      const player = this.identify(room, token);
      if (move.revision !== room.revision) throw new RoomError('STALE_REVISION', 409);
      if (room.game === null) throw new RoomError('WAITING_FOR_PLAYER', 409);
      const game =
        move.type === 'draw'
          ? drawBrick(room.game, player, this.roll)
          : replaceBrick(room.game, player, move.position);
      room.game =
        game.status === 'playing' && game.turn.phase === 'awaiting-end'
          ? endTurn(game, player)
          : game;
    });
    return this.view(room, this.identify(room, token));
  }

  async check(): Promise<void> {
    await this.store.check();
  }
  async cleanup(): Promise<void> {
    await this.store.cleanup();
  }
  async close(): Promise<void> {
    await this.store.close();
  }

  private identify(room: StoredRoom, token: string): PlayerId {
    const hash = digest(token);
    if (room.credentials[0] === hash) return 0;
    if (room.credentials[1] === hash) return 1;
    throw new RoomError('UNAUTHORIZED', 401);
  }
  private view(room: StoredRoom, playerId: PlayerId): RoomView {
    return {
      code: room.code,
      revision: room.revision,
      status: room.game?.status ?? 'waiting',
      playerId,
      playersJoined: room.credentials[1] === null ? 1 : 2,
      game: structuredClone(room.game),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }
}
