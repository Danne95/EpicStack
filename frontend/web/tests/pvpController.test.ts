import { expect, it, vi } from 'vitest';
import { RoomService } from '../../../backend/multiplayer/rooms';
import { chooseMove } from '../../../shared/ai/evaluator';
import type { RoomView } from '../../../shared/pvp/protocol';
import { PvpController } from '../src/hooks/pvpController';
import { invitationUrl, inviteCode } from '../src/network/pvpProtocol';
import type { PvpApi } from '../src/network/pvpProtocol';

function setup() {
  let seed = 42;
  const rooms = new RoomService(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  const api: PvpApi = {
    create: async () => rooms.create(),
    join: async (code) => rooms.join(code),
    read: async (seat) => rooms.read(seat.code, seat.token),
    move: async (seat, move) => rooms.move(seat.code, seat.token, move),
  };
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  return {
    api,
    storage,
    host: new PvpController(api, storage),
    guest: new PvpController(api, null),
  };
}
async function pair() {
  const result = setup();
  await result.host.open();
  await result.guest.open(result.host.getSnapshot().room!.code);
  await result.host.refresh();
  const game = result.host.getSnapshot().room!.game!;
  const active = [result.host, result.guest][game.turn.playerId]!;
  expect(active.getSnapshot().room!.game!.turn.phase).toBe('awaiting-placement');
  return result;
}
it('restores a seat, recovers a connection, and shares only the invitation code', async () => {
  const { api, storage, host } = await pair();
  const restored = new PvpController(api, storage);
  await restored.refresh();
  expect(restored.getSnapshot().room).toEqual(host.getSnapshot().room);
  const read = vi.spyOn(api, 'read').mockRejectedValueOnce(Error('offline'));
  await restored.refresh();
  expect(restored.getSnapshot().connected).toBe(false);
  await restored.refresh();
  expect(restored.getSnapshot().connected).toBe(true);
  read.mockRestore();
  const code = restored.getSnapshot().room!.code;
  const url = invitationUrl('http://127.0.0.1:5173/#/multiplayer', code);
  expect(inviteCode(new URL(url).hash)).toBe(code);
  expect(url).not.toContain('token');
  restored.forget();
  const forgotten = new PvpController(api, storage);
  await forgotten.refresh();
  expect(forgotten.getSnapshot().room).toBeNull();
});
it('ignores old polls and repeated submissions while a move is pending', async () => {
  const { api, host, guest } = await pair();
  const actor = host.getSnapshot().room!.game!.turn.playerId === 0 ? host : guest;
  await actor.refresh();
  const old = actor.getSnapshot().room!;
  let resolveRead!: (room: RoomView) => void;
  vi.spyOn(api, 'read').mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
  );
  const poll = actor.refresh();
  actor.select(0);
  const originalMove = api.move.bind(api);
  let releaseMove!: () => void;
  const move = vi.spyOn(api, 'move').mockImplementationOnce(async (seat, command) => {
    await new Promise<void>((resolve) => {
      releaseMove = resolve;
    });
    return originalMove(seat, command);
  });
  const submission = actor.move('replace');
  await Promise.resolve();
  await actor.move('replace');
  releaseMove();
  await submission;
  resolveRead(old);
  await poll;
  expect(move).toHaveBeenCalledTimes(1);
  expect(actor.getSnapshot().room!.revision).toBe(old.revision + 1);
  expect(actor.getSnapshot().room!.game!.turn.phase).toBe('awaiting-draw');
});
it('synchronizes both players through a complete game and preserves the winning result', async () => {
  const { host, guest } = await pair();
  const players = [host, guest] as const;
  for (let turn = 0; turn < 300 && host.getSnapshot().room!.game!.status !== 'won'; turn++) {
    const actor = players[host.getSnapshot().room!.game!.turn.playerId];
    await actor.refresh();
    const room = actor.getSnapshot().room!;
    expect(room.game!.turn.phase).toBe('awaiting-placement');
    actor.select(chooseMove(room.game!, room.playerId)!.position);
    await actor.move('replace');
    await Promise.all(players.map((player) => player.refresh()));
  }
  const final = host.getSnapshot().room!.game!;
  expect(final.status).toBe('won');
  expect(guest.getSnapshot().room!.game).toEqual(final);
});
