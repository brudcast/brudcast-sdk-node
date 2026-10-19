import { Brudcast, type ClientOptions } from '../src/index';

export interface RecordedRequest {
  method: string;
  url: URL;
  headers: Headers;
  body: unknown;
}

export type Responder = (request: RecordedRequest, attempt: number) => Response | Promise<Response>;

/**
 * Build a JSON reply
 *
 * @param body - The JSON body
 * @param init - Status and headers
 * @returns The reply
 */
export function json(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
}

/**
 * Build a client whose fetch records each request and answers from a responder
 *
 * @param responder - Answers each attempt; defaults to an empty success envelope
 * @param options - Client options to override
 * @returns The client and the recorded requests
 */
export function mockClient(
  responder: Responder = () => json({ success: true, message: 'ok', data: {} }),
  options: ClientOptions = {},
) {
  const requests: RecordedRequest[] = [];
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    let body: unknown = init?.body ?? undefined;
    if (typeof body === 'string') body = JSON.parse(body);

    const request: RecordedRequest = {
      method: init?.method ?? 'GET',
      url: new URL(String(input)),
      headers,
      body,
    };
    requests.push(request);

    if (init?.signal?.aborted) throw init.signal.reason;

    return responder(request, requests.length - 1);
  }) as typeof globalThis.fetch;

  const client = new Brudcast({
    apiKey: 'bk_live_test',
    sendingKey: 'sk_test',
    baseURL: 'https://core.test',
    mailingBaseURL: 'https://mailing.test',
    maxRetries: 0,
    fetch,
    ...options,
  });

  return { client, requests };
}

/**
 * A success envelope
 *
 * @param data - The `data`
 * @param meta - The `meta`, for pages
 * @returns The envelope
 */
export function envelope(data: unknown, meta?: unknown) {
  return { success: true, message: 'ok', data, ...(meta !== undefined ? { meta } : {}) };
}
