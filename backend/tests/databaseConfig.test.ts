import { expect, it } from 'vitest';
import { databaseConfig } from '../database/connection';

it('only permits memory mode when no database URL is configured outside production', () => {
  expect(databaseConfig({})).toBeNull();
  expect(() => databaseConfig({ DATABASE_URL: '' })).toThrow();
  expect(() => databaseConfig({ NODE_ENV: 'production' })).toThrow();
  expect(() => databaseConfig({ DATABASE_URL: 'https://example.com' })).toThrow();
});

it('requires verified TLS for remote hosts and disallows URL overrides', () => {
  expect(
    databaseConfig({ DATABASE_URL: 'postgresql://user:secret@example.com/postgres' })?.ssl,
  ).toEqual({ rejectUnauthorized: true });
  expect(databaseConfig({ DATABASE_URL: 'postgresql://localhost/test' })?.ssl).toBe(false);
  expect(
    databaseConfig({ DATABASE_URL: 'postgresql://localhost/test', NODE_ENV: 'production' })?.ssl,
  ).toEqual({ rejectUnauthorized: true });
  expect(() =>
    databaseConfig({
      DATABASE_URL: 'postgresql://user:secret@example.com/postgres?sslmode=no-verify',
    }),
  ).toThrow('Remove SSL query options');
});
