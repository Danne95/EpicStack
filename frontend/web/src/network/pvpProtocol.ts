import type { Move, RoomCredential, RoomView, SeatResponse } from '../../../../shared/pvp/protocol';

export class PvpError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
export interface PvpApi {
  create(): Promise<SeatResponse>;
  join(code: string): Promise<SeatResponse>;
  read(seat: RoomCredential): Promise<RoomView>;
  move(seat: RoomCredential, move: Move): Promise<RoomView>;
}
export function inviteCode(hash: string): string {
  const code = new URLSearchParams(hash.split('?')[1] ?? '').get('room')?.toUpperCase() ?? '';
  return /^[A-F0-9]{10}$/.test(code) ? code : '';
}
export function invitationUrl(pageUrl: string, code: string): string {
  const url = new URL(pageUrl);
  url.hash = '/multiplayer?room=' + code;
  return url.href;
}
