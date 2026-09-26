import { PvpError } from './pvpProtocol';
import type { PvpApi } from './pvpProtocol';
import type { RoomView, SeatResponse } from '../../../../shared/pvp/protocol';

// Local development only until an internet backend is deployed.
export const PVP_ENABLED = import.meta.env.DEV;
const REQUEST_TIMEOUT_MS = 8000;
async function request<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  token?: string,
): Promise<T> {
  const response = await fetch('/api' + path, {
    method,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new PvpError(error?.error ?? 'UNAVAILABLE');
  }
  return response.json() as Promise<T>;
}
export const pvpApi: PvpApi = {
  create: () => request<SeatResponse>('/rooms', 'POST', {}),
  join: (code) => request<SeatResponse>('/rooms/' + code + '/join', 'POST', {}),
  read: async (seat) =>
    (await request<{ room: RoomView }>('/rooms/' + seat.code, 'GET', undefined, seat.token)).room,
  move: async (seat, move) =>
    (await request<{ room: RoomView }>('/rooms/' + seat.code + '/moves', 'POST', move, seat.token))
      .room,
};
