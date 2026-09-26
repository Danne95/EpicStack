import { afterEach, beforeEach, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { databaseConfig, createDatabasePool } from '../database/connection';
import { PostgresRoomStore } from '../database/postgresRoomStore';
import { RoomService } from '../multiplayer/rooms';

// Explicit opt-in: use a disposable/test project with the migration already applied.
const url = process.env.EPICSTACK_TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'Set EPICSTACK_TEST_DATABASE_URL to a test database before running test:database.',
  );
const config = databaseConfig({ ...process.env, DATABASE_URL: url })!;
let pools: Pool[] = [];
let codes: string[] = [];
function service(): RoomService {
  const pool = createDatabasePool(config);
  pools.push(pool);
  return new RoomService(undefined, new PostgresRoomStore(pool));
}
async function host(rooms: RoomService) {
  const created = await rooms.create();
  codes.push(created.room.code);
  return created;
}
beforeEach(() => {
  pools = [];
  codes = [];
});
afterEach(async () => {
  try {
    if (pools[0] && codes.length)
      await pools[0].query('delete from public.pvp_rooms where code = any($1::text[])', [codes]);
  } finally {
    await Promise.all(pools.map((pool) => pool.end()));
  }
});

it('restores a saved game and both private seats through a new database connection', async () => {
  const original = service();
  await original.check();
  const created = await host(original);
  const joined = await original.join(created.room.code);
  const restored = service();
  expect(await restored.read(created.room.code, created.token)).toMatchObject({
    revision: 1,
    playerId: 0,
    game: joined.room.game,
  });
  expect(await restored.read(created.room.code, joined.token)).toEqual(joined.room);
});

it('allows one concurrent guest and one draw for a revision across independent connections', async () => {
  const first = service();
  const second = service();
  const created = await host(first);
  const joins = await Promise.allSettled([
    first.join(created.room.code),
    second.join(created.room.code),
  ]);
  expect(joins.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(joins.find((result) => result.status === 'rejected')).toMatchObject({
    reason: { code: 'ROOM_FULL' },
  });
  const guest = joins.find((result) => result.status === 'fulfilled')!;
  if (guest.status !== 'fulfilled') throw new Error('No guest');
  const actor = guest.value.room.game!.turn.playerId === 0 ? created.token : guest.value.token;
  const moves = await Promise.allSettled([
    first.move(created.room.code, actor, { type: 'draw', revision: 1 }),
    second.move(created.room.code, actor, { type: 'draw', revision: 1 }),
  ]);
  expect(moves.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(moves.find((result) => result.status === 'rejected')).toMatchObject({
    reason: { code: 'STALE_REVISION' },
  });
  const before = await first.read(created.room.code, actor);
  await expect(
    second.move(created.room.code, actor, { type: 'replace', position: 10, revision: 2 }),
  ).rejects.toThrow('INVALID_POSITION');
  expect(await first.read(created.room.code, actor)).toEqual(before);
});

it('hides expired rooms and cleans up their stored data', async () => {
  const rooms = service();
  const created = await host(rooms);
  await pools[0]!.query(
    "update public.pvp_rooms set expires_at = clock_timestamp() - interval '1 second' where code = $1",
    [created.room.code],
  );
  await expect(rooms.read(created.room.code, created.token)).rejects.toThrow('ROOM_NOT_FOUND');
  await rooms.cleanup();
  const result = await pools[0]!.query('select code from public.pvp_rooms where code = $1', [
    created.room.code,
  ]);
  expect(result.rows).toHaveLength(0);
});
