import { describe, expect, it } from 'vitest';
import { createGame, drawBrick } from '../../shared/game/index';
import { decodeGame, decodeRoom, STATE_VERSION } from '../database/decodeRoom';

const state = () => createGame({ random: () => 0.42 });
const envelope = () => ({ version: STATE_VERSION, state: state() });

describe('saved game decoding', () => {
  it('restores canonical draw/placement/winning snapshots without aliases', () => {
    const original = envelope();
    expect(decodeGame(original)).toEqual(original.state);
    expect(decodeGame(original)).not.toBe(original.state);
    const drawn = drawBrick(original.state, original.state.turn.playerId, () => 0.2);
    expect(decodeGame({ version: STATE_VERSION, state: drawn })).toEqual(drawn);
    const won = {
      status: 'won',
      winner: 0,
      players: [
        { id: 0, tower: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { id: 1, tower: [20, 19, 18, 17, 16, 15, 14, 13, 12, 11] },
      ],
      turn: { phase: 'complete', number: 1, playerId: 0 },
      discardedBricks: [21],
    };
    expect(decodeGame({ version: STATE_VERSION, state: won })).toEqual(won);
  });

  it('rejects unknown versions, duplicate/out-of-range bricks, and inconsistent phases/history/winners', () => {
    expect(() => decodeGame({ version: 2, state: state() })).toThrow('unsupported');
    expect(() => decodeGame(state())).toThrow();
    for (const corrupt of [
      (game: Record<string, unknown>) => {
        game.winner = 0;
      },
      (game: Record<string, unknown>) => {
        game.turn = { phase: 'complete', number: 1, playerId: 0 };
      },
      (game: Record<string, unknown>) => {
        game.discardedBricks = [1];
      },
      (game: Record<string, unknown>) => {
        game.status = 'won';
        game.winner = 0;
      },
    ]) {
      const value = envelope();
      corrupt(value.state as unknown as Record<string, unknown>);
      expect(() => decodeGame(value)).toThrow();
    }
    const duplicate = JSON.parse(JSON.stringify(envelope()));
    duplicate.state.players[0].tower[0] = duplicate.state.players[1].tower[0];
    expect(() => decodeGame(duplicate)).toThrow();
    duplicate.state.players[0].tower[0] = 101;
    expect(() => decodeGame(duplicate)).toThrow();
    const game = state();
    expect(() =>
      decodeGame({
        version: 1,
        state: {
          ...game,
          turn: { ...game.turn, phase: 'awaiting-placement', drawnBrick: game.players[0].tower[0] },
        },
      }),
    ).toThrow();
  });

  it('rejects unsafe database revisions and seat/state mismatches', () => {
    const row = {
      code: 'ABCDEF1234',
      revision: '0',
      host_token_hash: 'a'.repeat(64),
      guest_token_hash: null,
      game_state: null,
      created_at: new Date(0),
      updated_at: new Date(0),
      expires_at: new Date(86400000),
    };
    expect(decodeRoom(row).revision).toBe(0);
    expect(() => decodeRoom({ ...row, revision: '9007199254740992' })).toThrow();
    expect(() => decodeRoom({ ...row, game_state: envelope() })).toThrow();
    expect(() => decodeRoom({ ...row, created_at: 'invalid' })).toThrow();
  });
});
