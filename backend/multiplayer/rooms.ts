import type { RoomView, Move } from '../../shared/pvp/protocol';
import { createHash, randomBytes } from 'node:crypto';
import { createGame, drawBrick, endTurn, replaceBrick } from '../../shared/game/index';
import type { GameState, PlayerId, RandomSource } from '../../shared/types/index';

const MAX_ROOMS = 500;
const ROOM_CODE_BYTES = 5;
const TOKEN_BYTES = 32;
const RANDOM_BYTES = 6;
const RANDOM_RANGE = 2 ** (RANDOM_BYTES * 8);
const digest = (token: string): string => createHash('sha256').update(token).digest('hex');
const random = (): number => randomBytes(RANDOM_BYTES).readUIntBE(0, RANDOM_BYTES) / RANDOM_RANGE;

export class RoomError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}
interface Room {
  code: string;
  revision: number;
  credentials: [string, string | null];
  game: GameState | null;
  createdAt: string;
  updatedAt: string;
}
/** Single-process authority: synchronous validation and commit leave no interleaving gap. */
export class RoomService {
  private readonly rooms = new Map<string, Room>();
  constructor(private readonly roll: RandomSource = random) {}

  create(): { token: string; room: RoomView } {
    if (this.rooms.size >= MAX_ROOMS) throw new RoomError('ROOM_LIMIT', 503);
    let code: string;
    do {
      code = randomBytes(ROOM_CODE_BYTES).toString('hex').toUpperCase();
    } while (this.rooms.has(code));
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const now = new Date().toISOString();
    const room: Room = {
      code,
      revision: 0,
      credentials: [digest(token), null],
      game: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rooms.set(code, room);
    return { token, room: this.view(room, 0) };
  }

  join(code: string): { token: string; room: RoomView } {
    const room = this.find(code);
    if (room.credentials[1] !== null) throw new RoomError('ROOM_FULL', 409);
    // Initialize before committing the second seat, so failed initialization leaves it free.
    const game = createGame({ random: this.roll });
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    room.game = game;
    room.credentials[1] = digest(token);
    this.commit(room);
    return { token, room: this.view(room, 1) };
  }

  read(code: string, token: string): RoomView {
    const room = this.find(code);
    return this.view(room, this.identify(room, token));
  }

  move(code: string, token: string, move: Move): RoomView {
    const room = this.find(code);
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
    this.commit(room);
    return this.view(room, player);
  }

  private find(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new RoomError('ROOM_NOT_FOUND', 404);
    return room;
  }
  private identify(room: Room, token: string): PlayerId {
    const hash = digest(token);
    if (room.credentials[0] === hash) return 0;
    if (room.credentials[1] === hash) return 1;
    throw new RoomError('UNAUTHORIZED', 401);
  }
  private commit(room: Room): void {
    room.revision++;
    room.updatedAt = new Date().toISOString();
  }
  private view(room: Room, playerId: PlayerId): RoomView {
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
