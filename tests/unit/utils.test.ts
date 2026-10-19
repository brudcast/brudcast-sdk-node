import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isBrowser,
  readEnv,
  runtimeDescription,
  sleep,
  stringifyQuery,
} from '../../src/internal/utils';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('stringifyQuery', () => {
  it('encodes dates, booleans, nested objects and arrays, and drops null and undefined', () => {
    const query = stringifyQuery({
      at: new Date('2026-10-19T00:00:00.000Z'),
      on: true,
      filter: { tag: ['a', 'b'], skip: null },
      none: undefined,
    });

    expect(decodeURIComponent(query)).toBe(
      'at=2026-10-19T00:00:00.000Z&on=true&filter[tag][]=a&filter[tag][]=b',
    );
    expect(stringifyQuery(undefined)).toBe('');
  });
});

describe('sleep', () => {
  it('waits, and returns early or at once when aborted', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const waiting = sleep(10_000, controller.signal);
    controller.abort();
    await waiting;

    const done = sleep(5);
    await vi.advanceTimersByTimeAsync(5);
    await done;

    await sleep(10_000, controller.signal);
  });
});

describe('runtime detection', () => {
  it('detects a browser window and a worker', () => {
    expect(isBrowser()).toBe(false);
    vi.stubGlobal('importScripts', () => undefined);
    expect(isBrowser()).toBe(true);
  });

  it('describes Node, Bun and Deno', () => {
    expect(runtimeDescription()).toMatch(/^node\/v\d+/);

    vi.stubGlobal('Bun', { version: '1.2.0' });
    expect(runtimeDescription()).toBe('bun/1.2.0');
    vi.unstubAllGlobals();

    vi.stubGlobal('Deno', { version: { deno: '2.1.0' }, build: { os: 'linux', arch: 'x86_64' } });
    expect(runtimeDescription()).toBe('deno/2.1.0 (linux; x86_64)');
    vi.stubGlobal('Deno', {});
    expect(runtimeDescription()).toBe('deno/unknown (unknown; unknown)');
  });

  it('falls back when the runtime is unknown or reports little', () => {
    vi.stubGlobal('process', { version: 'v22.0.0' });
    expect(runtimeDescription()).toBe('node/v22.0.0 (unknown; unknown)');
    vi.stubGlobal('process', undefined);
    expect(runtimeDescription()).toBe('unknown');
  });
});

describe('readEnv', () => {
  it('reads and trims Node and Deno variables', () => {
    vi.stubEnv('BRUDCAST_TEST', '  value \n');
    expect(readEnv('BRUDCAST_TEST')).toBe('value');
    expect(readEnv('BRUDCAST_UNSET')).toBeUndefined();

    vi.stubGlobal('process', undefined);
    vi.stubGlobal('Deno', { env: { get: (name: string) => (name === 'X' ? 'deno' : undefined) } });
    expect(readEnv('X')).toBe('deno');
  });

  it('treats a runtime that refuses access as unset', () => {
    vi.stubGlobal('process', undefined);
    vi.stubGlobal('Deno', {
      env: {
        get: () => {
          throw new Error('permission denied');
        },
      },
    });

    expect(readEnv('X')).toBeUndefined();
  });
});
