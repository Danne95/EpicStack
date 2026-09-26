import { describe, expect, it } from 'vitest';
import { MemoryRoomStore } from '../database/memoryRoomStore';
import { MAX_ROOMS, ROOM_TTL_MS } from '../database/roomStore';
import { RoomService } from '../multiplayer/rooms';

describe('room persistence contract', () => {
  it('restores seats across service instances and accepts only one concurrent join/move', async () => {
    const store = new MemoryRoomStore();
    const first = new RoomService(undefined, store);
    const second = new RoomService(undefined, store);
    const host = await first.create();
    const joins = await Promise.allSettled([
      first.join(host.room.code),
      second.join(host.room.code),
    ]);
    expect(joins.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(joins.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'ROOM_FULL' },
    });
    const snapshot = await second.read(host.room.code, host.token);
    const guest = joins.find((result) => result.status === 'fulfilled')!;
    if (guest.status !== 'fulfilled') throw new Error('Missing guest');
    const token = snapshot.game!.turn.playerId === 0 ? host.token : guest.value.token;
    const moves = await Promise.allSettled([
      first.move(host.room.code, token, { type: 'draw', revision: 1 }),
      second.move(host.room.code, token, { type: 'draw', revision: 1 }),
    ]);
    expect(moves.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(moves.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'STALE_REVISION' },
    });
    const restored = new RoomService(undefined, store);
    expect((await restored.read(host.room.code, host.token)).revision).toBe(2);
  });

  it('renews on accepted actions only and expires exactly at 24 hours', async () => {
    let now = Date.UTC(2026, 8, 26);
    const store = new MemoryRoomStore(() => now);
    const rooms = new RoomService(undefined, store);
    const host = await rooms.create();
    now += ROOM_TTL_MS - 1;
    await rooms.read(host.room.code, host.token);
    const guest = await rooms.join(host.room.code);
    const joinedExpiry = (await store.read(host.room.code)).expiresAt;
    now += ROOM_TTL_MS - 1;
    const actor = guest.room.game!.turn.playerId === 0 ? host.token : guest.token;
    const drawn = await rooms.move(host.room.code, actor, { type: 'draw', revision: 1 });
    const moveExpiry = (await store.read(host.room.code)).expiresAt;
    expect(moveExpiry).not.toBe(joinedExpiry);
    now += ROOM_TTL_MS - 1;
    await rooms.read(host.room.code, actor);
    await expect(rooms.move(host.room.code, actor, { type: 'draw', revision: 1 })).rejects.toThrow(
      'STALE_REVISION',
    );
    await expect(
      rooms.move(host.room.code, 'wrong', { type: 'replace', revision: 2, position: 0 }),
    ).rejects.toThrow('UNAUTHORIZED');
    expect(await rooms.read(host.room.code, actor)).toEqual(drawn);
    expect((await store.read(host.room.code)).expiresAt).toBe(moveExpiry);
    now++;
    await expect(rooms.read(host.room.code, actor)).rejects.toThrow('ROOM_NOT_FOUND');
    await expect(rooms.join(host.room.code)).rejects.toThrow('ROOM_NOT_FOUND');
  });

  it('reclaims expired capacity and rolls back a failing update', async () => {
    let now = 0;
    const store = new MemoryRoomStore(() => now);
    const code = (index: number) => index.toString(16).toUpperCase().padStart(10, '0');
    for (let index = 0; index < MAX_ROOMS; index++) await store.insert(code(index), 'a'.repeat(64));
    await expect(store.insert(code(MAX_ROOMS), 'b'.repeat(64))).rejects.toThrow('ROOM_LIMIT');
    const before = await store.read(code(0));
    await expect(
      store.update(code(0), (room) => {
        room.credentials[1] = 'b'.repeat(64);
        throw new Error('failed');
      }),
    ).rejects.toThrow('failed');
    expect(await store.read(code(0))).toEqual(before);
    now = ROOM_TTL_MS;
    await expect(store.insert(code(MAX_ROOMS), 'b'.repeat(64))).resolves.not.toBeNull();
  });
});
