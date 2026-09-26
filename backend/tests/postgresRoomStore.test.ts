import { expect, it, vi } from 'vitest';
import { PostgresRoomStore } from '../database/postgresRoomStore';
import { RoomError } from '../multiplayer/roomError';
import { createGame } from '../../shared/game/index';

const row = () => ({
  code: 'ABCDEF1234',
  revision: '0',
  host_token_hash: 'a'.repeat(64),
  guest_token_hash: null,
  game_state: null,
  created_at: new Date(0),
  updated_at: new Date(0),
  expires_at: new Date(86400000),
});
function fixture() {
  const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  const release = vi.fn();
  const client = { query, release };
  const pool = {
    query,
    connect: vi.fn().mockResolvedValue(client),
    end: vi.fn().mockResolvedValue(undefined),
  };
  return { store: new PostgresRoomStore(pool), query, release, pool };
}

it('locks and updates on one connection, saving only after the change succeeds', async () => {
  const { store, query, release, pool } = fixture();
  const game = createGame({ random: () => 0.42 });
  query
    .mockResolvedValueOnce({ rows: [] }) // begin
    .mockResolvedValueOnce({ rows: [row()] })
    .mockResolvedValueOnce({
      rows: [
        {
          ...row(),
          revision: '1',
          guest_token_hash: 'b'.repeat(64),
          game_state: { version: 1, state: game },
        },
      ],
    });
  const result = await store.update('ABCDEF1234', (room) => {
    room.game = game;
    room.credentials[1] = 'b'.repeat(64);
  });
  expect(result.revision).toBe(1);
  expect(pool.connect).toHaveBeenCalledTimes(1);
  expect(query.mock.calls[1]![0]).toContain('for update');
  expect(query.mock.calls[2]![0]).toContain('revision = $5');
  expect(query.mock.calls[2]![1][4]).toBe(0);
  expect(query.mock.calls[3]![0]).toBe('commit');
  expect(release).toHaveBeenCalledWith(false);
});

it('rolls back rejected operations without writing and releases the connection', async () => {
  const { store, query, release } = fixture();
  query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [row()] });
  await expect(
    store.update('ABCDEF1234', () => {
      throw new RoomError('STALE_REVISION', 409);
    }),
  ).rejects.toThrow('STALE_REVISION');
  expect(
    query.mock.calls.map((call) => call[0]).some((sql: string) => sql.startsWith('update')),
  ).toBe(false);
  expect(query).toHaveBeenLastCalledWith('rollback');
  expect(release).toHaveBeenCalledWith(false);
});

it('destroys a broken transaction connection when rollback also fails', async () => {
  const { store, query, release } = fixture();
  query
    .mockResolvedValueOnce({ rows: [] })
    .mockRejectedValueOnce(new Error('disconnected'))
    .mockRejectedValueOnce(new Error('rollback failed'));
  await expect(store.update('ABCDEF1234', () => {})).rejects.toThrow('disconnected');
  expect(release).toHaveBeenCalledWith(true);
});

it('serializes capacity checks and rolls back a full-room rejection', async () => {
  const { store, query, release } = fixture();
  query
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ count: '500' }] });
  await expect(store.insert('ABCDEF1234', 'a'.repeat(64))).rejects.toThrow('ROOM_LIMIT');
  expect(query.mock.calls[1]![0]).toContain('pg_advisory_xact_lock');
  expect(query.mock.calls[2]![0]).toContain('delete from public.pvp_rooms');
  expect(query).toHaveBeenLastCalledWith('rollback');
  expect(release).toHaveBeenCalledWith(false);
});
