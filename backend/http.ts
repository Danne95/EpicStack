import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse, Server } from 'node:http';
import { GameRuleError } from '../shared/game/index';
import { RoomError, RoomService } from './multiplayer/rooms';
import type { Move } from '../shared/pvp/protocol';

const MAX_BODY_BYTES = 1024; // Room commands contain only a few scalar fields.
const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_PATTERN = /^Bearer ([a-f0-9]{64})$/;
function respond(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}
function token(request: IncomingMessage): string {
  const match = TOKEN_PATTERN.exec(request.headers.authorization ?? '');
  if (!match) throw new RoomError('UNAUTHORIZED', 401);
  return match[1]!;
}
async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (request.headers['content-type']?.split(';')[0]?.trim() !== 'application/json')
    throw new RoomError('JSON_REQUIRED', 415);
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const bytes = Buffer.from(chunk as Uint8Array);
    size += bytes.length;
    if (size > MAX_BODY_BYTES) throw new RoomError('BODY_TOO_LARGE', 413);
    chunks.push(bytes);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') throw Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new RoomError('INVALID_JSON', 400);
  }
}
function empty(input: Record<string, unknown>): void {
  if (Object.keys(input).length) throw new RoomError('INVALID_BODY', 400);
}
function parseMove(input: Record<string, unknown>): Move {
  if (!Number.isSafeInteger(input.revision) || (input.revision as number) < 0)
    throw new RoomError('INVALID_MOVE', 400);
  const revision = input.revision as number;
  if (input.type === 'draw' && Object.keys(input).length === 2) return { type: 'draw', revision };
  if (
    input.type === 'replace' &&
    Object.keys(input).length === 3 &&
    Number.isInteger(input.position)
  )
    return { type: 'replace', revision, position: input.position as number };
  throw new RoomError('INVALID_MOVE', 400);
}

export function createPvpServer(service = new RoomService()): Server {
  return createServer(
    { requestTimeout: REQUEST_TIMEOUT_MS, headersTimeout: REQUEST_TIMEOUT_MS },
    (request, response) => {
      void (async () => {
        // Only the local Vite client can submit browser commands. No cross-origin CORS access.
        const allowedOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173'];
        if (request.headers.origin && !allowedOrigins.includes(request.headers.origin))
          throw new RoomError('ORIGIN_NOT_ALLOWED', 403);
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (request.method === 'GET' && path === '/health') {
          try {
            await service.check();
          } catch {
            respond(response, 503, { error: 'STORAGE_UNAVAILABLE' });
            return;
          }
          respond(response, 200, { status: 'ok' });
          return;
        }
        if (request.method === 'POST' && path === '/rooms') {
          empty(await body(request));
          respond(response, 201, await service.create());
          return;
        }
        const route = /^\/rooms\/([A-F0-9]{10})(?:\/(join|moves))?$/.exec(path);
        if (!route) throw new RoomError('NOT_FOUND', 404);
        const code = route[1]!;
        if (request.method === 'GET' && !route[2]) {
          respond(response, 200, { room: await service.read(code, token(request)) });
          return;
        }
        if (request.method === 'POST' && route[2] === 'join') {
          empty(await body(request));
          respond(response, 200, await service.join(code));
          return;
        }
        if (request.method === 'POST' && route[2] === 'moves') {
          const credential = token(request);
          respond(response, 200, {
            room: await service.move(code, credential, parseMove(await body(request))),
          });
          return;
        }
        throw new RoomError('METHOD_NOT_ALLOWED', 405);
      })().catch((error: unknown) => {
        if (error instanceof RoomError) respond(response, error.status, { error: error.code });
        else if (error instanceof GameRuleError) respond(response, 409, { error: error.code });
        else respond(response, 500, { error: 'INTERNAL_ERROR' });
      });
    },
  );
}
