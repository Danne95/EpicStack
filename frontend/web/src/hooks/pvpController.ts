import type { RoomCredential, RoomView } from '../../../../shared/pvp/protocol';
import { getLegalPlacements } from '../../../../shared/game/index';
import { PvpError } from '../network/pvpProtocol';
import type { PvpApi } from '../network/pvpProtocol';

const SESSION_KEY = 'epicstack.pvp.v1';
const POLL_INTERVAL_MS = 1500;
export interface PvpSnapshot {
  room: RoomView | null;
  selected: number | null;
  pending: boolean;
  connected: boolean;
  error: string | null;
  storageAvailable: boolean;
}
const messages: Record<string, string> = {
  ROOM_FULL: 'That room already has two players. Ask your friend for a new room.',
  ROOM_NOT_FOUND: 'That room has ended or the server restarted. Create or join a new room.',
  UNAUTHORIZED: 'Your seat could not be restored. Create or join a new room.',
  STALE_REVISION: 'The board changed. Refreshing your turn…',
  NOT_CURRENT_PLAYER: 'It is your friend’s turn.',
  INVALID_TURN_PHASE: 'That move was already handled. Refreshing the board…',
  ROOM_LIMIT: 'The local server is full. Restart it when everyone has finished.',
};
export class PvpController {
  private state: PvpSnapshot = {
    room: null,
    selected: null,
    pending: false,
    connected: false,
    error: null,
    storageAvailable: true,
  };
  private seat: RoomCredential | null = null;
  private listeners = new Set<() => void>();
  private generation = 0;
  private reading = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(
    private readonly api: PvpApi,
    private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
  ) {
    try {
      if (!storage) throw Error();
      const saved: unknown = JSON.parse(storage.getItem(SESSION_KEY) ?? 'null');
      if (
        saved &&
        typeof saved === 'object' &&
        'code' in saved &&
        'token' in saved &&
        typeof saved.code === 'string' &&
        /^[A-F0-9]{10}$/.test(saved.code) &&
        typeof saved.token === 'string' &&
        /^[a-f0-9]{64}$/.test(saved.token)
      )
        this.seat = { code: saved.code, token: saved.token };
    } catch {
      this.state.storageAvailable = false;
    }
  }
  getSnapshot = (): PvpSnapshot => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  start = (): void => {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => {
      void this.refresh();
    }, POLL_INTERVAL_MS);
  };
  stop = (): void => {
    clearInterval(this.timer);
    this.timer = undefined;
    this.generation++;
    this.reading = false;
    this.update({ pending: false });
  };
  private update(change: Partial<PvpSnapshot>): void {
    this.state = { ...this.state, ...change };
    this.listeners.forEach((listener) => listener());
  }
  private save(): void {
    try {
      if (!this.storage) throw Error();
      if (this.seat) this.storage.setItem(SESSION_KEY, JSON.stringify(this.seat));
      else this.storage.removeItem(SESSION_KEY);
    } catch {
      this.update({ storageAvailable: false });
    }
  }
  private accept(room: RoomView): void {
    const previous = this.state.room;
    if (previous?.code === room.code && previous.revision > room.revision) return;
    this.update({
      room,
      connected: true,
      error: null,
      selected: previous?.revision === room.revision ? this.state.selected : null,
    });
  }
  private failure(error: unknown): void {
    const code = error instanceof PvpError ? error.code : 'UNAVAILABLE';
    if (code === 'UNAUTHORIZED' || code === 'ROOM_NOT_FOUND') {
      this.seat = null;
      this.save();
      this.update({ room: null, selected: null });
    }
    this.update({
      connected: false,
      error:
        messages[code] ??
        'Connection lost. Retrying automatically. Check that the local backend is running.',
    });
  }
  refresh = async (): Promise<void> => {
    if (!this.seat || this.reading || this.state.pending) return;
    const generation = this.generation;
    const seat = this.seat;
    this.reading = true;
    try {
      const room = await this.api.read(seat);
      if (generation === this.generation) this.accept(room);
    } catch (error) {
      if (generation === this.generation) this.failure(error);
    } finally {
      if (generation === this.generation) this.reading = false;
    }
  };
  open = async (code?: string): Promise<void> => {
    if (this.state.pending) return;
    if (code !== undefined && !/^[A-F0-9]{10}$/.test(code)) {
      this.update({ error: 'Enter the ten-character room code.' });
      return;
    }
    const generation = ++this.generation;
    this.reading = false;
    this.update({ pending: true, error: null });
    try {
      const result = code ? await this.api.join(code) : await this.api.create();
      if (generation !== this.generation) return;
      this.seat = { code: result.room.code, token: result.token };
      this.save();
      this.accept(result.room);
    } catch (error) {
      if (generation === this.generation)
        this.update({
          error:
            error instanceof PvpError
              ? (messages[error.code] ?? 'Unable to open that room.')
              : 'Unable to reach the backend. Start it and try again. If a room was created but its response was lost, create a new room.',
        });
    } finally {
      if (generation === this.generation) this.update({ pending: false });
    }
  };
  select = (position: number): void => {
    const room = this.state.room;
    if (!room?.game || !this.state.connected || this.state.pending) return;
    if (getLegalPlacements(room.game, room.playerId).includes(position))
      this.update({ selected: position });
  };
  move = async (type: 'draw' | 'replace'): Promise<void> => {
    const { room, selected, pending, connected } = this.state;
    if (!this.seat || !room || pending || !connected || (type === 'replace' && selected === null))
      return;
    // Invalidate any older poll; it must not overwrite an action's connection state.
    const generation = ++this.generation;
    this.reading = false;
    this.update({ pending: true, error: null });
    try {
      const move =
        type === 'draw'
          ? { type, revision: room.revision }
          : { type, revision: room.revision, position: selected! };
      const result = await this.api.move(this.seat, move);
      if (generation === this.generation) this.accept(result);
    } catch (error) {
      if (generation === this.generation) this.failure(error);
    } finally {
      if (generation === this.generation) {
        this.update({ pending: false });
        void this.refresh();
      }
    }
  };
  forget = (): void => {
    this.generation++;
    this.reading = false;
    this.seat = null;
    this.save();
    this.update({ room: null, selected: null, pending: false, connected: false, error: null });
  };
}
