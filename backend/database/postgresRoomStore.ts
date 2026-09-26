import { RoomError } from '../multiplayer/roomError';
import { decodeRoom, STATE_VERSION } from './decodeRoom';
import { MAX_ROOMS, ROOM_TTL_MS } from './roomStore';
import type { RoomStore, StoredRoom } from './roomStore';

interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number | null;
}
export interface DatabaseConnection {
  query(sql: string, values?: unknown[]): Promise<QueryResult>;
}
export interface DatabaseClient extends DatabaseConnection {
  release(destroy?: boolean): void;
}
export interface DatabasePool extends DatabaseConnection {
  connect(): Promise<DatabaseClient>;
  end(): Promise<void>;
}
const COLUMNS =
  'code, revision, host_token_hash, guest_token_hash, game_state, created_at, updated_at, expires_at';

export class PostgresRoomStore implements RoomStore {
  constructor(private readonly pool: DatabasePool) {}

  async insert(code: string, hostHash: string): Promise<StoredRoom | null> {
    return this.transaction(async (client) => {
      // All server instances serialize capacity checks; existing-room updates remain independent.
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended('epicstack:pvp_rooms:capacity', 0))",
      );
      await client.query('delete from public.pvp_rooms where expires_at <= clock_timestamp()');
      const count = await client.query('select count(*) as count from public.pvp_rooms');
      if (Number(count.rows[0]?.count) >= MAX_ROOMS) throw new RoomError('ROOM_LIMIT', 503);
      const result = await client.query(
        `insert into public.pvp_rooms (code, host_token_hash, expires_at)
         values ($1, $2, clock_timestamp() + $3 * interval '1 millisecond')
         on conflict (code) do nothing returning ${COLUMNS}`,
        [code, hostHash, ROOM_TTL_MS],
      );
      return result.rows[0] ? decodeRoom(result.rows[0]) : null;
    });
  }

  async read(code: string): Promise<StoredRoom> {
    const result = await this.pool.query(
      `select ${COLUMNS} from public.pvp_rooms where code = $1 and expires_at > clock_timestamp()`,
      [code],
    );
    if (!result.rows[0]) throw new RoomError('ROOM_NOT_FOUND', 404);
    return decodeRoom(result.rows[0]);
  }

  async update(code: string, change: (room: StoredRoom) => void): Promise<StoredRoom> {
    return this.transaction(async (client) => {
      const selected = await client.query(
        `select ${COLUMNS} from public.pvp_rooms where code = $1 and expires_at > clock_timestamp() for update`,
        [code],
      );
      if (!selected.rows[0]) throw new RoomError('ROOM_NOT_FOUND', 404);
      const room = decodeRoom(selected.rows[0]);
      const revision = room.revision;
      change(room);
      const game =
        room.game === null ? null : JSON.stringify({ version: STATE_VERSION, state: room.game });
      const result = await client.query(
        `update public.pvp_rooms set guest_token_hash = $2, game_state = $3::jsonb,
         revision = revision + 1, updated_at = clock_timestamp(),
         expires_at = clock_timestamp() + $4 * interval '1 millisecond'
         where code = $1 and revision = $5 and expires_at > clock_timestamp() returning ${COLUMNS}`,
        [code, room.credentials[1], game, ROOM_TTL_MS, revision],
      );
      if (!result.rows[0]) throw new RoomError('ROOM_NOT_FOUND', 404);
      return decodeRoom(result.rows[0]);
    });
  }

  async cleanup(): Promise<void> {
    await this.pool.query('delete from public.pvp_rooms where expires_at <= clock_timestamp()');
  }
  async check(): Promise<void> {
    // Also detect an unapplied migration before accepting traffic.
    await this.pool.query(`select ${COLUMNS} from public.pvp_rooms limit 0`);
  }
  async close(): Promise<void> {
    await this.pool.end();
  }

  private async transaction<T>(work: (client: DatabaseClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let destroy = false;
    try {
      await client.query('begin');
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (error) {
      try {
        await client.query('rollback');
      } catch {
        destroy = true;
      }
      throw error;
    } finally {
      client.release(destroy);
    }
  }
}
