import { RoomError } from '../multiplayer/roomError';
import { MAX_ROOMS, ROOM_TTL_MS } from './roomStore';
import type { RoomStore, StoredRoom } from './roomStore';

export class MemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, StoredRoom>();
  constructor(private readonly now: () => number = Date.now) {}

  async insert(code: string, hostHash: string): Promise<StoredRoom | null> {
    this.removeExpired();
    if (this.rooms.has(code)) return null;
    if (this.rooms.size >= MAX_ROOMS) throw new RoomError('ROOM_LIMIT', 503);
    const now = this.now();
    const room: StoredRoom = {
      code,
      revision: 0,
      credentials: [hostHash, null],
      game: null,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ROOM_TTL_MS).toISOString(),
    };
    this.rooms.set(code, room);
    return structuredClone(room);
  }

  async read(code: string): Promise<StoredRoom> {
    return structuredClone(this.find(code));
  }

  async update(code: string, change: (room: StoredRoom) => void): Promise<StoredRoom> {
    const room = structuredClone(this.find(code));
    // There is no await between reading and committing the snapshot.
    change(room);
    const now = this.now();
    room.revision++;
    room.updatedAt = new Date(now).toISOString();
    room.expiresAt = new Date(now + ROOM_TTL_MS).toISOString();
    this.rooms.set(code, room);
    return structuredClone(room);
  }

  async cleanup(): Promise<void> {
    this.removeExpired();
  }
  async check(): Promise<void> {}
  async close(): Promise<void> {}

  private find(code: string): StoredRoom {
    const room = this.rooms.get(code);
    if (!room || Date.parse(room.expiresAt) <= this.now()) {
      this.rooms.delete(code);
      throw new RoomError('ROOM_NOT_FOUND', 404);
    }
    return room;
  }

  private removeExpired(): void {
    const now = this.now();
    for (const [code, room] of this.rooms) {
      if (Date.parse(room.expiresAt) <= now) this.rooms.delete(code);
    }
  }
}
