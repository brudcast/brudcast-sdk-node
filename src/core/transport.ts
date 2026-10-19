import {
  APIConnectionError,
  APIError,
  APITimeoutError,
  APIUserAbortError,
  BrudcastError,
  parseRetryAfter,
  type ErrorBody,
} from './errors';
import type { RawReply } from './api-promise';
import { sleep, stringifyQuery, uuid4 } from '../internal/utils';

export type HTTPMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Options any API method accepts as its last argument
 */
export interface RequestOptions {
  /**
   * Sent as `Idempotency-Key` on a `POST`. A repeat with the same key and body within 24 hours
   * gets the first reply back instead of acting twice, which also makes the request safe to
   * retry after a timeout. When omitted, the SDK generates one per call so its own retries are
   * safe; pass your own to stay safe across process restarts.
   */
  idempotencyKey?: string | undefined;
  /** Milliseconds to wait for each attempt before it fails with `APITimeoutError`. */
  timeout?: number | undefined;
  /** How many times to retry a failed attempt that is safe to repeat. */
  maxRetries?: number | undefined;
  /** Cancels the request, including any retries still to come. */
  signal?: AbortSignal | undefined;
  /** Extra headers; a `null` value removes a header the SDK would send. */
  headers?: Record<string, string | null | undefined> | undefined;
}

/**
 * Which service a request goes to, and so which credential it carries
 */
export type Host = 'core' | 'mailing';

/**
 * A request as a resource method describes it
 */
export interface FinalRequest {
  method: HTTPMethod;
  host: Host;
  path: string;
  query?: Record<string, unknown> | undefined;
  body?: unknown;
  options?: RequestOptions | undefined;
}

/**
 * What the transport needs from the client
 */
export interface TransportConfig {
  baseURL: Record<Host, string>;
  credential: (host: Host) => string;
  timeout: number;
  maxRetries: number;
  defaultHeaders: Record<string, string | null | undefined>;
  userAgent: string;
  fetch: typeof fetch;
}

/**
 * The longest `Retry-After` the SDK waits out; a longer one is returned to the caller
 */
const MAX_RETRY_AFTER_SECONDS = 60;

/**
 * Connection failures raised before any byte of the request left, so repeating the request
 * cannot repeat its effect
 */
const NOT_SENT_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
]);

const RETRYABLE_STATUSES = new Set([408, 500, 502, 503, 504]);

/**
 * Sends requests to the Brudcast API: builds the URL and headers, applies the timeout, retries
 * what is safe to retry and turns failed replies into errors
 */
export class Transport {
  constructor(private readonly config: TransportConfig) {}

  /**
   * Send a request, retrying failed attempts that are safe to repeat
   *
   * A `POST` with an idempotency key, and every `GET`, `PUT` and `DELETE`, is retried on a
   * timeout, a dropped connection, a 408 or a 5xx. A `POST` or `PATCH` without one is retried
   * only when it cannot have reached the API: a connection that was never made, or a 429, which
   * the rate limiter answers before the handler runs.
   *
   * @param request - The request
   * @returns The successful reply
   * @throws {APIError} The last failed reply, as its status's subclass
   * @throws {APIConnectionError} When no reply arrived
   * @throws {APITimeoutError} When the last attempt timed out
   * @throws {APIUserAbortError} When the caller's signal aborted
   */
  async request(request: FinalRequest): Promise<RawReply> {
    const options = request.options ?? {};
    const maxRetries = options.maxRetries ?? this.config.maxRetries;
    const isMultipart = isFormData(request.body);
    const idempotencyKey =
      request.method === 'POST' && !isMultipart
        ? (options.idempotencyKey ??
          (maxRetries > 0 ? `brudcast-node-retry-${uuid4()}` : undefined))
        : options.idempotencyKey;
    const isRepeatable =
      ['GET', 'PUT', 'DELETE'].includes(request.method) ||
      (request.method === 'POST' && !isMultipart && idempotencyKey !== undefined);

    for (let attempt = 0; ; attempt++) {
      const retriesLeft = maxRetries - attempt;
      let outcome: AttemptOutcome;

      try {
        outcome = await this.attempt({ request, idempotencyKey, attempt });
      } catch (error) {
        if (!(error instanceof APIConnectionError)) throw error;

        if (retriesLeft > 0 && (isRepeatable || isNotSent(error))) {
          await this.backoff({ attempt, retryAfter: undefined, signal: options.signal });
          continue;
        }

        throw error;
      }

      if (outcome.response.ok) {
        return { response: outcome.response, body: outcome.body };
      }

      const error = APIError.from({
        status: outcome.response.status,
        headers: outcome.response.headers,
        body: outcome.body as ErrorBody | string | undefined,
      });
      const retryAfter = parseRetryAfter(outcome.response.headers.get('retry-after'));

      if (retriesLeft > 0 && this.shouldRetry({ error, isRepeatable, retryAfter })) {
        await this.backoff({ attempt, retryAfter, signal: options.signal });
        continue;
      }

      throw error;
    }
  }

  /**
   * Decide whether a failed reply is worth another attempt
   *
   * @param params - The error, whether the request is safe to repeat, and its `Retry-After`
   * @returns True to retry
   */
  private shouldRetry(params: {
    error: APIError;
    isRepeatable: boolean;
    retryAfter: number | undefined;
  }): boolean {
    if (params.retryAfter !== undefined && params.retryAfter > MAX_RETRY_AFTER_SECONDS) {
      return false;
    }

    if (params.error.status === 429) return true;
    if (!params.isRepeatable) return false;
    if (params.error.status === 409) return params.error.code === 'E_IDEMPOTENCY_KEY_IN_USE';

    return RETRYABLE_STATUSES.has(params.error.status);
  }

  /**
   * Wait before the next attempt
   *
   * The wait is the reply's `Retry-After` when it has one, else exponential backoff with full
   * jitter: a random time up to `min(8 s, 0.5 s × 2^attempt)`.
   *
   * @param params - The attempt just made, the reply's `Retry-After` in seconds, and the signal
   * @throws {APIUserAbortError} When the signal aborts during the wait
   */
  private async backoff(params: {
    attempt: number;
    retryAfter: number | undefined;
    signal: AbortSignal | undefined;
  }): Promise<void> {
    const ceiling = Math.min(8_000, 500 * 2 ** params.attempt);
    const delay =
      params.retryAfter !== undefined ? params.retryAfter * 1000 : Math.random() * ceiling;

    await sleep(delay, params.signal);

    if (params.signal?.aborted) {
      throw new APIUserAbortError({ cause: params.signal.reason });
    }
  }

  /**
   * Make one attempt
   *
   * @param params - The request, its idempotency key and the attempt number
   * @returns The reply, with its body read and parsed when it is JSON
   * @throws {APITimeoutError} When the attempt's timeout elapses
   * @throws {APIUserAbortError} When the caller's signal aborts
   * @throws {APIConnectionError} When the request fails before a reply
   */
  private async attempt(params: {
    request: FinalRequest;
    idempotencyKey: string | undefined;
    attempt: number;
  }): Promise<AttemptOutcome> {
    const { request } = params;
    const options = request.options ?? {};
    const timeout = options.timeout ?? this.config.timeout;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new TimeoutSignal()), timeout);
    const onAbort = (): void => controller.abort(options.signal?.reason);

    if (options.signal?.aborted) {
      clearTimeout(timer);
      throw new APIUserAbortError({ cause: options.signal.reason });
    }
    options.signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const response = await this.config.fetch(this.buildURL(request), {
        method: request.method,
        headers: this.buildHeaders({ ...params, hasBody: request.body !== undefined }),
        body: encodeBody(request.body),
        signal: controller.signal,
        redirect: 'manual',
      });

      if (response.status >= 300 && response.status < 400) {
        return {
          response,
          body: {
            message: `The API redirected to "${response.headers.get('location') ?? ''}"; set the base URL to the final address`,
          },
        };
      }

      return { response, body: await readBody(response) };
    } catch (error) {
      if (options.signal?.aborted) throw new APIUserAbortError({ cause: options.signal.reason });
      if (controller.signal.reason instanceof TimeoutSignal) throw new APITimeoutError();
      if (error instanceof BrudcastError) throw error;

      throw new APIConnectionError({ cause: error });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
    }
  }

  /**
   * Build the full URL of a request
   *
   * Core paths sit under `/api/v1/user`; mailing paths are given in full.
   *
   * @param request - The request
   * @returns The URL with its query string
   */
  buildURL(request: Pick<FinalRequest, 'host' | 'path' | 'query'>): string {
    const base = this.config.baseURL[request.host].replace(/\/+$/, '');
    const prefix = request.host === 'core' ? '/api/v1/user' : '';
    const query = stringifyQuery(request.query);

    return `${base}${prefix}${request.path}${query ? `?${query}` : ''}`;
  }

  /**
   * Build the headers of one attempt
   *
   * @param params - The request, its idempotency key, the attempt number and whether it has a body
   * @returns The headers, with per-request ones applied last and `null` ones removed
   */
  private buildHeaders(params: {
    request: FinalRequest;
    idempotencyKey: string | undefined;
    attempt: number;
    hasBody: boolean;
  }): Headers {
    const headers = new Headers({
      Accept: 'application/json',
      Authorization: `Bearer ${this.config.credential(params.request.host)}`,
      'User-Agent': this.config.userAgent,
    });

    if (params.hasBody && !isFormData(params.request.body)) {
      headers.set('Content-Type', 'application/json');
    }
    if (params.idempotencyKey !== undefined) {
      headers.set('Idempotency-Key', params.idempotencyKey);
    }
    if (params.attempt > 0) {
      headers.set('X-Brudcast-Retry-Count', String(params.attempt));
    }

    for (const source of [this.config.defaultHeaders, params.request.options?.headers ?? {}]) {
      for (const [name, value] of Object.entries(source)) {
        if (value === null) headers.delete(name);
        else if (value !== undefined) headers.set(name, value);
      }
    }

    return headers;
  }
}

interface AttemptOutcome {
  response: Response;
  body: unknown;
}

/**
 * The reason the SDK gives its own abort controller when an attempt times out, so a timeout is
 * told apart from the caller's abort
 */
class TimeoutSignal extends Error {}

/**
 * Tell whether a value is a multipart body
 *
 * @param body - The request body
 * @returns True for a `FormData`
 */
function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

/**
 * Encode a request body for fetch
 *
 * @param body - JSON-serialisable data or a `FormData`
 * @returns The body fetch sends, or null for none
 */
function encodeBody(body: unknown): BodyInit | null {
  if (body === undefined) return null;
  if (isFormData(body)) return body;

  return JSON.stringify(body);
}

/**
 * Read a reply's body
 *
 * @param response - The reply
 * @returns The parsed JSON, the text when it is not JSON, or undefined when the body is empty
 * @throws {APIConnectionError} When the connection drops while the body is read
 */
async function readBody(response: Response): Promise<unknown> {
  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    throw new APIConnectionError({
      message: 'The connection closed while reading the reply.',
      cause: error,
    });
  }

  if (text === '') return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Tell whether a connection error happened before the request left
 *
 * Fetch implementations wrap the system error one or more levels down, sometimes inside an
 * `AggregateError` when several addresses were tried, so the whole cause chain is searched.
 *
 * @param error - The connection error
 * @returns True when the cause is a DNS failure or a refused or unreachable connection
 */
function isNotSent(error: APIConnectionError): boolean {
  if (error instanceof APITimeoutError) return false;

  const pending: unknown[] = [error.cause];
  for (let depth = 0; pending.length > 0 && depth < 10; depth++) {
    const current = pending.shift() as { code?: unknown; cause?: unknown; errors?: unknown } | null;
    if (typeof current !== 'object' || current === null) continue;
    if (typeof current.code === 'string' && NOT_SENT_CODES.has(current.code)) return true;

    pending.push(current.cause, ...(Array.isArray(current.errors) ? current.errors : []));
  }

  return false;
}
