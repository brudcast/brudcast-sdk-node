import { BrudcastError } from '../core/errors';

export type QueryValue =
  string | number | boolean | null | undefined | QueryValue[] | { [key: string]: QueryValue };

/**
 * Encode a query object the way the API's query parser reads it
 *
 * Arrays take empty brackets on every item (`status[]=a&status[]=b`), so a one-item array still
 * parses as an array rather than a string; nested objects use named brackets (`filter[tag]=x`).
 * `undefined` and `null` are left out, so an omitted option and an absent one look the same.
 *
 * @param query - The query parameters
 * @returns The query string without its leading `?`, empty when nothing is set
 */
export function stringifyQuery(query: Record<string, unknown> | undefined): string {
  if (!query) return '';

  const params = new URLSearchParams();
  const append = (key: string, value: unknown): void => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((item) => append(`${key}[]`, item));
      return;
    }

    if (value instanceof Date) {
      params.append(key, value.toISOString());
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([child, item]) => append(`${key}[${child}]`, item));
      return;
    }

    params.append(key, String(value));
  };

  Object.entries(query).forEach(([key, value]) => append(key, value));

  return params.toString();
}

/**
 * Encode a value for one path segment
 *
 * @param value - An id or slug
 * @returns The value, percent-encoded
 * @throws {BrudcastError} When the value is not a non-empty string, which would otherwise build a
 * request for the parent collection
 */
export function pathSegment(value: unknown): string {
  if (typeof value !== 'string' || value === '') {
    throw new BrudcastError(`Expected a non-empty string path parameter, got ${String(value)}`);
  }

  return encodeURIComponent(value);
}

/**
 * Wait for a number of milliseconds, or until the signal aborts
 *
 * @param ms - The delay
 * @param signal - Cancels the wait early
 * @returns A promise that settles after the delay
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Generate a random UUID v4
 *
 * @returns The UUID
 */
export function uuid4(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Tell whether the code runs in a web browser, where an organization API key would be exposed
 *
 * @returns True in a browser main thread or worker, false in Node, Bun, Deno and edge runtimes
 */
export function isBrowser(): boolean {
  const scope = globalThis as { window?: { document?: unknown }; importScripts?: unknown };
  const isWindow = typeof scope.window === 'object' && typeof scope.window.document === 'object';
  const isWorker = typeof scope.importScripts === 'function';

  return isWindow || isWorker;
}

/**
 * Describe the runtime for the `User-Agent` header
 *
 * @returns For example `node/v22.11.0 (darwin; arm64)`, or `unknown` outside a known runtime
 */
export function runtimeDescription(): string {
  const scope = globalThis as {
    Bun?: { version: string };
    Deno?: { version?: { deno?: string }; build?: { os?: string; arch?: string } };
    process?: { version?: string; platform?: string; arch?: string };
  };

  if (scope.Bun) return `bun/${scope.Bun.version}`;
  if (scope.Deno) {
    return `deno/${scope.Deno.version?.deno ?? 'unknown'} (${scope.Deno.build?.os ?? 'unknown'}; ${scope.Deno.build?.arch ?? 'unknown'})`;
  }
  if (scope.process?.version) {
    return `node/${scope.process.version} (${scope.process.platform ?? 'unknown'}; ${scope.process.arch ?? 'unknown'})`;
  }

  return 'unknown';
}

/**
 * Read an environment variable where the runtime has them
 *
 * @param name - The variable
 * @returns The trimmed value, or undefined when unset, blank or unavailable
 */
export function readEnv(name: string): string | undefined {
  const scope = globalThis as {
    process?: { env?: Record<string, string | undefined> };
    Deno?: { env?: { get?: (key: string) => string | undefined } };
  };

  try {
    const value = scope.process?.env?.[name] ?? scope.Deno?.env?.get?.(name);

    return value?.trim() || undefined;
  } catch {
    return undefined;
  }
}
