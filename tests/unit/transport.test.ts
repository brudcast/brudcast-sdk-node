import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APIConnectionError,
  APIError,
  APITimeoutError,
  APIUserAbortError,
  AuthenticationError,
  BadRequestError,
  BrudcastError,
  ConflictError,
  InsufficientCreditsError,
  InsufficientScopeError,
  InternalServerError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
  UnprocessableEntityError,
} from '../../src/index';
import { envelope, json, mockClient } from '../helpers';

const refused = () =>
  Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
const reset = () => Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('requests', () => {
  it('sends the API key, JSON headers and user agent to the core prefix', async () => {
    const { client, requests } = mockClient(() => json(envelope({ id: 'c1' })));

    const contact = await client.contacts.retrieve('c1');

    expect(contact).toEqual({ id: 'c1' });
    const [request] = requests;
    expect(request?.url.href).toBe('https://core.test/api/v1/user/contacts/c1');
    expect(request?.method).toBe('GET');
    expect(request?.headers.get('authorization')).toBe('Bearer bk_live_test');
    expect(request?.headers.get('accept')).toBe('application/json');
    expect(request?.headers.get('content-type')).toBeNull();
    expect(request?.headers.get('user-agent')).toMatch(/^brudcast-node\/\S+ node\//);
  });

  it('sends the sending key to the mailing service', async () => {
    const { client, requests } = mockClient(() =>
      json({ status: true, success: true, data: { jobId: 'j1' } }, { status: 202 }),
    );

    const result = await client.emails.send({
      from: { address: 'a@example.com' },
      to: [{ address: 'b@example.com' }],
      subject: 'Hi',
      text: 'Hello',
    });

    expect(result).toEqual({ jobId: 'j1' });
    expect(requests[0]?.url.href).toBe('https://mailing.test/api/v1/send');
    expect(requests[0]?.headers.get('authorization')).toBe('Bearer sk_test');
    expect(requests[0]?.headers.get('content-type')).toBe('application/json');
  });

  it('encodes arrays with empty brackets and drops undefined', async () => {
    const { client, requests } = mockClient(() =>
      json(envelope([], { currentPage: 1, lastPage: 1 })),
    );

    await client.contacts.list({
      status: ['active', 'archived'],
      limit: 5,
      ...({ search: undefined } as object),
    });

    expect(decodeURIComponent(requests[0]?.url.search ?? '')).toBe(
      '?status[]=active&status[]=archived&limit=5',
    );
  });

  it('percent-encodes path parameters and refuses empty ones', async () => {
    const { client, requests } = mockClient(() => json(envelope({})));

    await client.contacts.retrieve('a/b?c');
    expect(requests[0]?.url.pathname).toBe('/api/v1/user/contacts/a%2Fb%3Fc');
    expect(() => client.contacts.retrieve('')).toThrow(BrudcastError);
  });

  it('applies default and per-request headers, and removes null ones', async () => {
    const { client, requests } = mockClient(() => json(envelope({})), {
      defaultHeaders: { 'X-Team': 'growth', 'User-Agent': 'custom' },
    });

    await client.contacts.retrieve('c1', { headers: { 'X-Team': null, 'X-Trace': 't1' } });

    expect(requests[0]?.headers.get('x-team')).toBeNull();
    expect(requests[0]?.headers.get('x-trace')).toBe('t1');
    expect(requests[0]?.headers.get('user-agent')).toBe('custom');
  });

  it('gives the raw response through withResponse and asResponse', async () => {
    const { client } = mockClient(() =>
      json(envelope({ id: 'c1' }), { headers: { 'x-ratelimit-remaining': '41' } }),
    );

    const promise = client.contacts.retrieve('c1');
    const { data, response } = await promise.withResponse();
    const raw = await promise.asResponse();

    expect(data).toEqual({ id: 'c1' });
    expect(response.headers.get('x-ratelimit-remaining')).toBe('41');
    expect(raw).toBe(response);
    await expect(promise.catch(() => 'never')).resolves.toEqual({ id: 'c1' });
    await expect(promise.finally(() => undefined)).resolves.toEqual({ id: 'c1' });
    expect(String(promise)).toBe('[object APIPromise]');
  });

  it('resolves deletes to undefined', async () => {
    const { client } = mockClient(() =>
      json({ success: true, message: 'Contact deleted successfully' }),
    );

    await expect(client.contacts.delete('c1')).resolves.toBeUndefined();
  });

  it('reads an empty or non-JSON success body without failing', async () => {
    const { client } = mockClient((_, attempt) =>
      attempt === 0 ? new Response(null, { status: 204 }) : new Response('ok', { status: 200 }),
    );

    await expect(client.contacts.retrieve('c1')).resolves.toBeUndefined();
    await expect(client.contacts.retrieve('c1')).resolves.toBeUndefined();
  });

  it('does not report a rejection the caller awaits late as unhandled', async () => {
    const { client } = mockClient(() => json({ success: false, message: 'gone' }, { status: 404 }));

    const promise = client.contacts.retrieve('c1');
    await new Promise((resolve) => setTimeout(resolve, 10));

    await expect(promise).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('errors', () => {
  const cases: [number, Record<string, unknown>, new (...args: never[]) => APIError][] = [
    [400, { code: 'E_BUSINESS_RULE_VIOLATION' }, BadRequestError],
    [401, { code: 'E_UNAUTHORIZED_ACCESS' }, AuthenticationError],
    [402, { code: 'E_INSUFFICIENT_CREDITS' }, InsufficientCreditsError],
    [402, { code: 'E_OTHER' }, APIError],
    [403, { code: 'E_FORBIDDEN' }, PermissionDeniedError],
    [403, { code: 'E_INSUFFICIENT_SCOPE' }, InsufficientScopeError],
    [404, { code: 'E_ROW_NOT_FOUND' }, NotFoundError],
    [409, { code: 'E_IDEMPOTENCY_KEY_IN_USE' }, ConflictError],
    [422, { code: 'E_VALIDATION_ERROR' }, UnprocessableEntityError],
    [429, { code: 'E_TOO_MANY_REQUESTS' }, RateLimitError],
    [500, {}, InternalServerError],
    [503, {}, InternalServerError],
    [418, {}, APIError],
  ];

  it.each(cases)('maps %i %o to its class', async (status, body, ErrorClass) => {
    const { client } = mockClient(() =>
      json(
        { success: false, message: 'nope', ...body },
        { status, headers: { 'x-request-id': 'req_1' } },
      ),
    );

    const error = await client.contacts.retrieve('c1').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ErrorClass);
    expect(error).toMatchObject({ status, message: 'nope', requestId: 'req_1', code: body.code });
  });

  it('reads the validation errors of a 422', async () => {
    const errors = [
      { field: 'email', rule: 'email', message: 'The email field must be a valid email address' },
    ];
    const { client } = mockClient(() =>
      json(
        { success: false, message: 'The payload is invalid', code: 'E_VALIDATION_ERROR', errors },
        { status: 422 },
      ),
    );

    const error = (await client.contacts
      .create({})
      .catch((caught: unknown) => caught)) as UnprocessableEntityError;

    expect(error.errors).toEqual(errors);
  });

  it('reads the scope of an insufficient scope error', async () => {
    const { client } = mockClient(() =>
      json(
        {
          success: false,
          message: 'Missing scope',
          code: 'E_INSUFFICIENT_SCOPE',
          requiredScope: 'contacts:write',
          grantedScopes: ['contacts:read'],
        },
        { status: 403 },
      ),
    );

    const error = (await client.contacts
      .delete('c1')
      .catch((caught: unknown) => caught)) as InsufficientScopeError;

    expect(error.requiredScope).toBe('contacts:write');
    expect(error.grantedScopes).toEqual(['contacts:read']);
  });

  it('tolerates an insufficient scope error without its details', async () => {
    const { client } = mockClient(() => json({ code: 'E_INSUFFICIENT_SCOPE' }, { status: 403 }));

    const error = (await client.contacts
      .delete('c1')
      .catch((caught: unknown) => caught)) as InsufficientScopeError;

    expect(error.requiredScope).toBeUndefined();
    expect(error.grantedScopes).toEqual([]);
  });

  it('reads the shortfall of an insufficient credits error', async () => {
    const { client } = mockClient(() =>
      json(
        {
          success: false,
          message: 'Insufficient credits',
          code: 'E_INSUFFICIENT_CREDITS',
          required: 10,
          available: 4,
          bucket: 'main',
          shortfall: 6,
        },
        { status: 402 },
      ),
    );

    const error = (await client.contacts
      .delete('c1')
      .catch((caught: unknown) => caught)) as InsufficientCreditsError;

    expect(error).toMatchObject({ required: 10, available: 4, bucket: 'main', shortfall: 6 });
  });

  it('tolerates an insufficient credits error without its details', async () => {
    const { client } = mockClient(() =>
      json({ code: 'E_INSUFFICIENT_CREDITS', bucket: 'other' }, { status: 402 }),
    );

    const error = (await client.contacts
      .delete('c1')
      .catch((caught: unknown) => caught)) as InsufficientCreditsError;

    expect(error).toMatchObject({
      required: undefined,
      available: undefined,
      bucket: undefined,
      shortfall: undefined,
    });
  });

  it('reads retryAfter from the header, an HTTP-date, or the body', async () => {
    const replies = [
      json({ code: 'E_TOO_MANY_REQUESTS' }, { status: 429, headers: { 'retry-after': '7' } }),
      json({ code: 'E_TOO_MANY_REQUESTS', retryAfter: 9 }, { status: 429 }),
      json(
        { code: 'E_TOO_MANY_REQUESTS' },
        { status: 429, headers: { 'retry-after': new Date(Date.now() + 30_000).toUTCString() } },
      ),
      json({ code: 'E_TOO_MANY_REQUESTS' }, { status: 429, headers: { 'retry-after': 'soon' } }),
    ];
    const { client } = mockClient((_, attempt) => replies[attempt] as Response);
    const retryAfter = async () =>
      ((await client.contacts.retrieve('c1').catch((caught: unknown) => caught)) as RateLimitError)
        .retryAfter;

    expect(await retryAfter()).toBe(7);
    expect(await retryAfter()).toBe(9);
    expect(await retryAfter()).toBeGreaterThan(25);
    expect(await retryAfter()).toBeUndefined();
  });

  it('keeps the start of a body that is not JSON, and names the status when there is none', async () => {
    const { client } = mockClient((_, attempt) =>
      attempt === 0
        ? new Response('<html>Bad gateway</html>', { status: 502 })
        : new Response(null, { status: 502 }),
    );

    const first = (await client.contacts
      .retrieve('c1')
      .catch((caught: unknown) => caught)) as APIError;
    const second = (await client.contacts
      .retrieve('c1')
      .catch((caught: unknown) => caught)) as APIError;

    expect(first.message).toBe('502 <html>Bad gateway</html>');
    expect(first.code).toBeUndefined();
    expect(first.body).toBe('<html>Bad gateway</html>');
    expect(second.message).toBe('502 status code (no body)');
  });

  it('turns a redirect into an error that names the target', async () => {
    const { client } = mockClient(
      () => new Response(null, { status: 301, headers: { location: 'https://elsewhere.test/' } }),
    );

    const error = (await client.contacts
      .retrieve('c1')
      .catch((caught: unknown) => caught)) as APIError;

    expect(error.status).toBe(301);
    expect(error.message).toContain('https://elsewhere.test/');
  });

  it('names an empty redirect target', async () => {
    const { client } = mockClient(() => new Response(null, { status: 302 }));

    const error = (await client.contacts
      .retrieve('c1')
      .catch((caught: unknown) => caught)) as APIError;

    expect(error.message).toContain('redirected to ""');
  });

  it('wraps a failure before any reply as a connection error', async () => {
    const { client } = mockClient(() => {
      throw reset();
    });

    const error = await client.contacts.retrieve('c1').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(APIConnectionError);
    expect((error as APIConnectionError).message).toBe('Connection error.');
  });

  it('wraps a body that fails to arrive as a connection error', async () => {
    const { client } = mockClient(() => {
      const response = json(envelope({}));
      vi.spyOn(response, 'text').mockRejectedValue(reset());

      return response;
    });

    const error = await client.contacts.retrieve('c1').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(APIConnectionError);
    expect((error as Error).message).toMatch(/closed while reading/);
  });
});

describe('timeouts and cancellation', () => {
  it('fails an attempt that outlives its timeout', async () => {
    const { client } = mockClient(
      (request) =>
        new Promise<Response>((_, reject) => {
          void request;
          setTimeout(() => reject(new Error('aborted')), 50);
        }),
      { timeout: 5 },
    );

    await expect(client.contacts.retrieve('c1')).rejects.toBeInstanceOf(APITimeoutError);
  });

  it('cancels when the caller aborts', async () => {
    const controller = new AbortController();
    const { client } = mockClient(
      () =>
        new Promise<Response>((_, reject) => {
          controller.abort();
          reject(new Error('aborted'));
        }),
    );

    await expect(
      client.contacts.retrieve('c1', { signal: controller.signal }),
    ).rejects.toBeInstanceOf(APIUserAbortError);
  });

  it('does not send when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { client, requests } = mockClient();

    await expect(
      client.contacts.retrieve('c1', { signal: controller.signal }),
    ).rejects.toBeInstanceOf(APIUserAbortError);
    expect(requests).toHaveLength(0);
  });

  it('stops waiting between retries when the caller aborts', async () => {
    const controller = new AbortController();
    const { client, requests } = mockClient(
      () => {
        setTimeout(() => controller.abort(), 5);
        return json(
          { code: 'E_TOO_MANY_REQUESTS' },
          { status: 429, headers: { 'retry-after': '30' } },
        );
      },
      { maxRetries: 2 },
    );

    await expect(
      client.contacts.retrieve('c1', { signal: controller.signal }),
    ).rejects.toBeInstanceOf(APIUserAbortError);
    expect(requests).toHaveLength(1);
  });
});

describe('retries', () => {
  it('retries a GET on a 5xx and succeeds', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { client, requests } = mockClient(
      (_, attempt) => (attempt < 2 ? json({}, { status: 503 }) : json(envelope({ id: 'c1' }))),
      { maxRetries: 2 },
    );

    await expect(client.contacts.retrieve('c1')).resolves.toEqual({ id: 'c1' });
    expect(requests).toHaveLength(3);
    expect(requests[0]?.headers.get('x-brudcast-retry-count')).toBeNull();
    expect(requests[2]?.headers.get('x-brudcast-retry-count')).toBe('2');
  });

  it('gives up after maxRetries and throws the last error', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { client, requests } = mockClient(() => json({}, { status: 500 }), { maxRetries: 1 });

    await expect(client.contacts.retrieve('c1')).rejects.toBeInstanceOf(InternalServerError);
    expect(requests).toHaveLength(2);
  });

  it('honours a per-request maxRetries', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { client, requests } = mockClient(() => json({}, { status: 500 }), { maxRetries: 3 });

    await expect(client.contacts.retrieve('c1', { maxRetries: 0 })).rejects.toBeInstanceOf(
      InternalServerError,
    );
    expect(requests).toHaveLength(1);
  });

  it('does not retry a 4xx other than 408, 409 in use and 429', async () => {
    const { client, requests } = mockClient(
      () => json({ code: 'E_ROW_NOT_FOUND' }, { status: 404 }),
      { maxRetries: 2 },
    );

    await expect(client.contacts.retrieve('c1')).rejects.toBeInstanceOf(NotFoundError);
    expect(requests).toHaveLength(1);
  });

  it('waits out Retry-After on a 429, for any method', async () => {
    const { client, requests } = mockClient(
      (_, attempt) =>
        attempt === 0
          ? json({ code: 'E_TOO_MANY_REQUESTS' }, { status: 429, headers: { 'retry-after': '0' } })
          : json(envelope({ id: 'c1' })),
      { maxRetries: 1 },
    );

    await expect(client.contacts.update('c1', { firstName: 'Ada' })).resolves.toEqual({ id: 'c1' });
    expect(requests).toHaveLength(2);
  });

  it('does not wait out a Retry-After longer than a minute', async () => {
    const { client, requests } = mockClient(
      () =>
        json({ code: 'E_TOO_MANY_REQUESTS' }, { status: 429, headers: { 'retry-after': '120' } }),
      { maxRetries: 2 },
    );

    await expect(client.contacts.retrieve('c1')).rejects.toBeInstanceOf(RateLimitError);
    expect(requests).toHaveLength(1);
  });

  it('generates one idempotency key per POST and keeps it across retries', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { client, requests } = mockClient(
      (_, attempt) =>
        attempt === 0
          ? json({}, { status: 502 })
          : json(envelope({ contact: { id: 'c1' } }), { status: 201 }),
      { maxRetries: 1 },
    );

    await expect(client.contacts.create({ emails: [{ email: 'a@example.com' }] })).resolves.toEqual(
      { id: 'c1' },
    );

    const keys = requests.map((request) => request.headers.get('idempotency-key'));
    expect(keys[0]).toMatch(/^brudcast-node-retry-[0-9a-f-]{36}$/);
    expect(keys[1]).toBe(keys[0]);
  });

  it('sends the caller idempotency key and retries a timeout with it', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { client, requests } = mockClient(
      (_, attempt) => {
        if (attempt === 0) throw reset();
        return json(envelope({ jobId: 'j1' }), { status: 202 });
      },
      { maxRetries: 1 },
    );

    await client.emails.send(
      {
        from: { address: 'a@example.com' },
        to: [{ address: 'b@example.com' }],
        subject: 's',
        text: 't',
      },
      { idempotencyKey: 'order-42' },
    );

    expect(requests.map((request) => request.headers.get('idempotency-key'))).toEqual([
      'order-42',
      'order-42',
    ]);
  });

  it('sends no idempotency key on a POST when retries are off', async () => {
    const { client, requests } = mockClient(() => json(envelope({ contact: { id: 'c1' } })));

    await client.contacts.create({ emails: [{ email: 'a@example.com' }] });

    expect(requests[0]?.headers.get('idempotency-key')).toBeNull();
  });

  it('retries a keyed POST while the first attempt is still running', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { client, requests } = mockClient(
      (_, attempt) =>
        attempt === 0
          ? json({ code: 'E_IDEMPOTENCY_KEY_IN_USE' }, { status: 409 })
          : json(envelope({ contact: { id: 'c1' } })),
      { maxRetries: 1 },
    );

    await client.contacts.create({ emails: [{ email: 'a@example.com' }] });

    expect(requests).toHaveLength(2);
  });

  it('does not retry a 409 that is not an idempotency conflict', async () => {
    const { client, requests } = mockClient(() => json({ code: 'E_OTHER' }, { status: 409 }), {
      maxRetries: 2,
    });

    await expect(client.contacts.create({})).rejects.toBeInstanceOf(ConflictError);
    expect(requests).toHaveLength(1);
  });

  it('does not retry a PATCH that may have reached the API', async () => {
    const { client, requests } = mockClient(
      () => {
        throw reset();
      },
      { maxRetries: 2 },
    );

    await expect(client.contacts.update('c1', { firstName: 'Ada' })).rejects.toBeInstanceOf(
      APIConnectionError,
    );
    expect(requests).toHaveLength(1);
  });

  it('does not retry a PATCH on a 5xx', async () => {
    const { client, requests } = mockClient(() => json({}, { status: 503 }), { maxRetries: 2 });

    await expect(client.contacts.update('c1', { firstName: 'Ada' })).rejects.toBeInstanceOf(
      InternalServerError,
    );
    expect(requests).toHaveLength(1);
  });

  it('retries a PATCH whose connection was never made', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { client, requests } = mockClient(
      (_, attempt) => {
        if (attempt === 0) throw refused();
        return json(envelope({ id: 'c1' }));
      },
      { maxRetries: 1 },
    );

    await expect(client.contacts.update('c1', { firstName: 'Ada' })).resolves.toEqual({ id: 'c1' });
    expect(requests).toHaveLength(2);
  });

  it('finds a connection error code deep in the cause chain', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const nested = Object.assign(new TypeError('fetch failed'), {
      cause: { cause: new AggregateError([null, { code: 'ENOTFOUND' }]) },
    });
    const { client, requests } = mockClient(
      (_, attempt) => {
        if (attempt === 0) throw nested;
        return json(envelope({ id: 'c1' }));
      },
      { maxRetries: 1 },
    );

    await client.contacts.update('c1', {});
    expect(requests).toHaveLength(2);
  });

  it('does not retry a timed-out PATCH', async () => {
    const { client, requests } = mockClient(
      () =>
        new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('aborted')), 50)),
      { maxRetries: 2, timeout: 5 },
    );

    await expect(client.contacts.update('c1', {})).rejects.toBeInstanceOf(APITimeoutError);
    expect(requests).toHaveLength(1);
  });

  it('never retries a multipart upload after it may have arrived', async () => {
    const { client, requests } = mockClient(() => json({}, { status: 503 }), { maxRetries: 2 });

    await expect(client.contactImports.upload(new Uint8Array([97]))).rejects.toBeInstanceOf(
      InternalServerError,
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.get('idempotency-key')).toBeNull();
  });

  it('backs off with jitter capped at eight seconds', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const { client, requests } = mockClient(
      (_, attempt) => (attempt < 5 ? json({}, { status: 500 }) : json(envelope({}))),
      { maxRetries: 5 },
    );

    const promise = client.contacts.retrieve('c1');
    for (const delay of [500, 1000, 2000, 4000, 8000]) {
      await vi.advanceTimersByTimeAsync(delay);
    }
    await promise;

    expect(requests).toHaveLength(6);
  });
});

describe('odd error bodies', () => {
  it.each([['null'], ['[1,2]'], ['42']])('handles a JSON %s body', async (text) => {
    const { client } = mockClient(() => new Response(text, { status: 403 }));

    const error = (await client.contacts
      .retrieve('c1')
      .catch((caught: unknown) => caught)) as APIError;

    expect(error).toBeInstanceOf(PermissionDeniedError);
    expect(error.code).toBeUndefined();
    expect(error.message).toBe('403 status code (no body)');
  });

  it('handles a rate limit and a credits error with a text body', async () => {
    const { client } = mockClient((_, attempt) =>
      attempt === 0
        ? new Response('slow down', { status: 429 })
        : new Response('pay', { status: 402 }),
    );

    expect(await client.contacts.retrieve('c1').catch((caught: unknown) => caught)).toMatchObject({
      retryAfter: undefined,
      message: '429 slow down',
    });
    expect(await client.contacts.retrieve('c1').catch((caught: unknown) => caught)).toBeInstanceOf(
      APIError,
    );
  });

  it('skips an undefined default header', async () => {
    const { client, requests } = mockClient(() => json(envelope({})), {
      defaultHeaders: { 'X-Unset': undefined },
    });

    await client.contacts.retrieve('c1');

    expect(requests[0]?.headers.has('x-unset')).toBe(false);
  });
});
