import type { GameState, PlayerId } from '../types/index';

export interface RoomView {
  code: string;
  revision: number;
  status: 'waiting' | 'playing' | 'won';
  playerId: PlayerId;
  playersJoined: number;
  game: GameState | null;
  createdAt: string;
  updatedAt: string;
}
export type Move =
  { revision: number; type: 'draw' } | { revision: number; type: 'replace'; position: number };

export interface RoomCredential {
  code: string;
  token: string;
}
export interface SeatResponse {
  token: string;
  room: RoomView;
}
