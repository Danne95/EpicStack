import { createPvpServer } from './http';

const DEFAULT_PORT = 8787;
const port = Number(process.env.PORT ?? DEFAULT_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error('PORT must be an integer from 1 to 65535.');
const server = createPvpServer();
server.listen(port, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close());
