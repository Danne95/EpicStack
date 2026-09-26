import { createPvpServer } from './http';
import { RoomService } from './multiplayer/rooms';
import { MemoryRoomStore } from './database/memoryRoomStore';
import { PostgresRoomStore } from './database/postgresRoomStore';
import { createDatabasePool, databaseConfig } from './database/connection';

const DEFAULT_PORT = 8787;
const port = Number(process.env.PORT ?? DEFAULT_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error('PORT must be an integer from 1 to 65535.');
// Expired rooms become inaccessible immediately; sweep physical rows hourly and on creation.
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
async function start(): Promise<void> {
  const config = databaseConfig(process.env);
  const store = config ? new PostgresRoomStore(createDatabasePool(config)) : new MemoryRoomStore();
  const service = new RoomService(undefined, store);
  try {
    await service.check();
    await service.cleanup();
  } catch {
    await service.close();
    throw new Error('Database startup failed. Check connection settings and applied migrations.');
  }
  const server = createPvpServer(service);
  const cleanup = setInterval(() => {
    void service
      .cleanup()
      .catch(() => console.error('Room cleanup failed; it will retry on the next sweep.'));
  }, CLEANUP_INTERVAL_MS);
  cleanup.unref();
  server.listen(port, '127.0.0.1');
  let stopping = false;
  const stop = (): void => {
    if (stopping) return;
    stopping = true;
    clearInterval(cleanup);
    server.close(() => {
      void service.close().catch(() => {
        process.exitCode = 1;
      });
    });
    server.closeIdleConnections();
  };
  server.on('error', () => {
    console.error('The backend could not listen on its configured port.');
    process.exitCode = 1;
    stop();
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, stop);
}
void start().catch(() => {
  console.error(
    'Backend startup failed. Check PORT, DATABASE_URL, DATABASE_CA_FILE, and migrations.',
  );
  process.exitCode = 1;
});
