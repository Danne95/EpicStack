import type { GameState } from '../../shared/types/index';

export const MAX_ROOMS = 500;
// User-selected retention: accepted joins/moves extend the room by one day.
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

export interface StoredRoom {
  code: string;
  revision: number;
  credentials: [string, string | null];
  game: GameState | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface RoomStore {
  /** Null means code collision; reaching capacity throws ROOM_LIMIT. */
  insert(code: string, hostHash: string): Promise<StoredRoom | null>;
  read(code: string): Promise<StoredRoom>;
  /** Run a synchronous change exclusively; commit only when it succeeds. */
  update(code: string, change: (room: StoredRoom) => void): Promise<StoredRoom>;
  cleanup(): Promise<void>;
  check(): Promise<void>;
  close(): Promise<void>;
}
