import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { createPvpServer } from '../http';
import { RoomService } from '../multiplayer/rooms';
import type { RoomView } from '../../shared/pvp/protocol';

function service(): RoomService {
  let seed = 42;
  return new RoomService(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
}
function setup() {
  const rooms = service();
  const host = rooms.create();
  const guest = rooms.join(host.room.code);
  const players = [host, guest] as const;
  const current = guest.room.game!.turn.playerId;
  return { rooms, code: host.room.code, players, current };
}

describe('authoritative rooms', () => {
  it('waits for a guest, admits only two players, and isolates public snapshots', () => {
    const rooms = service();
    const host = rooms.create();
    expect(host.room.status).toBe('waiting');
    expect(() => rooms.move(host.room.code, host.token, { type: 'draw', revision: 0 })).toThrow(
      'WAITING_FOR_PLAYER',
    );
    const guest = rooms.join(host.room.code);
    expect(guest.room).toMatchObject({ revision: 1, playersJoined: 2, status: 'playing' });
    expect(() => rooms.join(host.room.code)).toThrow('ROOM_FULL');
    expect(JSON.stringify(guest.room)).not.toContain(host.token);
    expect(guest.room).not.toHaveProperty('credentials');
    guest.room.game = null;
    expect(rooms.read(host.room.code, host.token).game).not.toBeNull();
  });

  it('authenticates players and rejects stale, out-of-turn, and illegal moves without changes', () => {
    const { rooms, code, players, current } = setup();
    const actor = players[current];
    expect(() => rooms.read(code, 'wrong')).toThrow('UNAUTHORIZED');
    expect(() =>
      rooms.move(code, players[1 - current]!.token, { type: 'draw', revision: 1 }),
    ).toThrowError(expect.objectContaining({ code: 'NOT_CURRENT_PLAYER' }));
    const drawn = rooms.move(code, actor.token, { type: 'draw', revision: 1 });
    expect(() => rooms.move(code, actor.token, { type: 'draw', revision: 1 })).toThrow(
      'STALE_REVISION',
    );
    expect(() =>
      rooms.move(code, actor.token, { type: 'replace', revision: 2, position: 10 }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_POSITION' }));
    expect(rooms.read(code, actor.token)).toEqual(drawn);
    const replaced = rooms.move(code, actor.token, { type: 'replace', revision: 2, position: 0 });
    expect(replaced.game!.turn).toMatchObject({
      playerId: 1 - current,
      phase: 'awaiting-draw',
      number: 2,
    });
    expect(replaced.revision).toBe(3);
  });
});

it('serves the room flow over HTTP and rejects client-controlled state and invalid bodies', async () => {
  const server = createPvpServer(service());
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  const post = (path: string, body: unknown, token?: string) =>
    fetch(base + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    const created = await post('/rooms', {});
    expect(created.status).toBe(201);
    const host = (await created.json()) as { token: string; room: RoomView };
    const path = '/rooms/' + host.room.code;
    const joined = await post(path + '/join', {});
    const guest = (await joined.json()) as typeof host;
    const actor = guest.room.game!.turn.playerId === 0 ? host : guest;
    expect((await fetch(base + path)).status).toBe(401);
    expect(
      (
        await post(
          path + '/moves',
          { type: 'draw', revision: 1, playerId: 0, brick: 99 },
          actor.token,
        )
      ).status,
    ).toBe(400);
    const drawn = await post(path + '/moves', { type: 'draw', revision: 1 }, actor.token);
    expect(drawn.status).toBe(200);
    const result = (await drawn.json()) as { room: RoomView };
    expect(result.room.game!.turn.phase).toBe('awaiting-placement');
    expect(
      (await post(path + '/moves', { type: 'replace', revision: 2, position: 0 }, actor.token))
        .status,
    ).toBe(200);
    expect((await post('/rooms', { extra: true })).status).toBe(400);
    expect((await post('/rooms', { extra: 'x'.repeat(1024) })).status).toBe(413);
    expect(
      (await fetch(base + '/health', { headers: { Origin: 'https://example.com' } })).status,
    ).toBe(403);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
