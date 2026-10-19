/**
 * Every `code` the Brudcast API documents, from the core service's `ErrorCode` and the mailing
 * service's own. Widened with `string` so a code added by a newer server still type-checks.
 */
export type BrudcastErrorCode =
  | 'E_VALIDATION_ERROR'
  | 'E_UNAUTHORIZED_ACCESS'
  | 'E_UNAUTHORIZED'
  | 'E_FORBIDDEN'
  | 'E_ORGANIZATION_HEADER_REQUIRED'
  | 'E_INSUFFICIENT_SCOPE'
  | 'E_ROW_NOT_FOUND'
  | 'E_ROUTE_NOT_FOUND'
  | 'E_INVALID_JSON'
  | 'E_REQUEST_ENTITY_TOO_LARGE'
  | 'E_ENCODING_UNSUPPORTED'
  | 'E_INVALID_MULTIPART_REQUEST'
  | 'E_REQUEST_ABORTED'
  | 'E_STREAM_VALIDATION_FAILURE'
  | 'E_TOO_MANY_REQUESTS'
  | 'E_BUSINESS_RULE_VIOLATION'
  | 'E_CAMPAIGN_NOT_SENDABLE'
  | 'E_INSUFFICIENT_CREDITS'
  | 'E_SUBSCRIPTION_REQUIRED'
  | 'E_PRODUCT_DISABLED'
  | 'E_QUOTA_EXCEEDED'
  | 'E_SMS_DELIVERY_FAILED'
  | 'E_PAYMENT_GATEWAY_UNAVAILABLE'
  | 'E_PAYMENT_GATEWAY_CAPABILITY_UNSUPPORTED'
  | 'E_PAYMENT_GATEWAY_REJECTED'
  | 'E_DKIM_KEY_STORAGE_FAILED'
  | 'E_FORM_NOT_PUBLISHED'
  | 'E_FORM_CLOSED'
  | 'E_FORM_RATE_LIMITED'
  | 'E_FORM_DUPLICATE_SUBMISSION'
  | 'E_FORM_EMAIL_SUPPRESSED'
  | 'E_FORM_SENDING_BLOCKED'
  | 'E_FORM_INVALID_VALUES'
  | 'E_WEBSITE_HAS_PLACEMENTS'
  | 'E_PLACEMENT_FORM_NOT_PUBLISHED'
  | 'E_PLACEMENT_TRIGGER_INCOMPLETE'
  | 'E_IDEMPOTENCY_KEY_INVALID'
  | 'E_IDEMPOTENCY_KEY_IN_USE'
  | 'E_IDEMPOTENCY_KEY_REUSED'
  | 'E_SENDING_BLOCKED'
  | 'E_NO_IP_ASSIGNED'
  | 'E_UPSTREAM_UNAVAILABLE'
  | 'E_SERVICE_UNAVAILABLE'
  | 'E_INTERNAL_ERROR'
  | (string & {});

/**
 * One field the core service's validator rejected
 */
export interface FieldError {
  field: string;
  rule: string;
  message: string;
  meta?: Record<string, unknown>;
}

/**
 * One issue the mailing service's validator raised, as its schema library reports it
 */
export interface SchemaIssue {
  path: (string | number)[];
  message: string;
  code?: string;
  [key: string]: unknown;
}

/**
 * The JSON body of a failed reply, as far as the SDK relies on it
 */
export interface ErrorBody {
  success?: false;
  status?: false;
  message?: string;
  code?: string;
  errors?: unknown;
  [key: string]: unknown;
}

/**
 * The root of every error the SDK throws
 */
export class BrudcastError extends Error {
  override name = 'BrudcastError';
}

/**
 * A reply from the API with a status outside 2xx
 *
 * `code` is the API's machine-readable code, undefined when the reply came from something in
 * front of the API (a gateway's 502, a proxy's 413). `requestId` is the reply's `X-Request-Id`,
 * which support can use to find the request in the logs.
 */
export class APIError extends BrudcastError {
  override name = 'APIError';
  readonly status: number;
  readonly code: BrudcastErrorCode | undefined;
  readonly errors: unknown;
  readonly requestId: string | undefined;
  readonly headers: Headers;
  readonly body: ErrorBody | string | undefined;
  /** The body when it is a JSON object, else an empty object. */
  protected readonly json: ErrorBody;

  constructor(params: {
    status: number;
    message: string;
    body: ErrorBody | string | undefined;
    headers: Headers;
  }) {
    super(params.message);
    this.status = params.status;
    this.headers = params.headers;
    this.body = params.body;
    this.requestId = params.headers.get('x-request-id') ?? undefined;

    this.json = asObject(params.body);
    this.code = typeof this.json.code === 'string' ? this.json.code : undefined;
    this.errors = this.json.errors;
  }

  /**
   * Build the error class that matches a failed reply's status and code
   *
   * @param params - The reply's status, headers and body
   * @returns The most specific error for the reply
   */
  static from(params: {
    status: number;
    headers: Headers;
    body: ErrorBody | string | undefined;
  }): APIError {
    const message = APIError.messageOf(params);
    const init = { ...params, message };
    const code = asObject(params.body).code;

    switch (params.status) {
      case 400:
        return new BadRequestError(init);
      case 401:
        return new AuthenticationError(init);
      case 402:
        return code === 'E_INSUFFICIENT_CREDITS'
          ? new InsufficientCreditsError(init)
          : new APIError(init);
      case 403:
        return code === 'E_INSUFFICIENT_SCOPE'
          ? new InsufficientScopeError(init)
          : new PermissionDeniedError(init);
      case 404:
        return new NotFoundError(init);
      case 409:
        return new ConflictError(init);
      case 422:
        return new UnprocessableEntityError(init);
      case 429:
        return new RateLimitError(init);
      default:
        return params.status >= 500 ? new InternalServerError(init) : new APIError(init);
    }
  }

  /**
   * Choose the message for a failed reply
   *
   * @param params - The reply's status and body
   * @returns The API's own message, the start of a body that is not JSON, or the status alone
   */
  private static messageOf(params: { status: number; body: ErrorBody | string | undefined }) {
    const message = asObject(params.body).message;
    if (typeof message === 'string') return message;

    if (typeof params.body === 'string' && params.body.trim() !== '') {
      return `${params.status} ${params.body.trim().slice(0, 200)}`;
    }

    return `${params.status} status code (no body)`;
  }
}

export class BadRequestError extends APIError {
  override name = 'BadRequestError';
}

export class AuthenticationError extends APIError {
  override name = 'AuthenticationError';
}

export class PermissionDeniedError extends APIError {
  override name = 'PermissionDeniedError';
}

export class NotFoundError extends APIError {
  override name = 'NotFoundError';
}

export class ConflictError extends APIError {
  override name = 'ConflictError';
}

export class InternalServerError extends APIError {
  override name = 'InternalServerError';
}

/**
 * A 422: the request body or query failed validation
 *
 * `errors` holds one entry per rejected field, `{ field, rule, message }` from the core service
 * or `{ path, message }` from the mailing service.
 */
export class UnprocessableEntityError extends APIError {
  override name = 'UnprocessableEntityError';
  declare readonly errors: FieldError[] | SchemaIssue[] | undefined;
}

/**
 * A 403 `E_INSUFFICIENT_SCOPE`: the API key exists but was not issued the scope the route needs
 *
 * Re-issue the key with `requiredScope` to fix it, unlike a plain `PermissionDeniedError`, which
 * means the route is closed to API keys altogether.
 */
export class InsufficientScopeError extends PermissionDeniedError {
  override name = 'InsufficientScopeError';
  readonly requiredScope: string | undefined;
  readonly grantedScopes: string[];

  constructor(params: ConstructorParameters<typeof APIError>[0]) {
    super(params);
    const body = this.json;
    this.requiredScope = typeof body.requiredScope === 'string' ? body.requiredScope : undefined;
    this.grantedScopes = Array.isArray(body.grantedScopes) ? (body.grantedScopes as string[]) : [];
  }
}

/**
 * A 402 `E_INSUFFICIENT_CREDITS`: the wallet cannot pay for the send
 *
 * `bucket` is `main` when only purchased credits can pay (WhatsApp), else `any`.
 */
export class InsufficientCreditsError extends APIError {
  override name = 'InsufficientCreditsError';
  readonly required: number | undefined;
  readonly available: number | undefined;
  readonly shortfall: number | undefined;
  readonly bucket: 'main' | 'any' | undefined;

  constructor(params: ConstructorParameters<typeof APIError>[0]) {
    super(params);
    const body = this.json;
    this.required = typeof body.required === 'number' ? body.required : undefined;
    this.available = typeof body.available === 'number' ? body.available : undefined;
    this.shortfall = typeof body.shortfall === 'number' ? body.shortfall : undefined;
    this.bucket = body.bucket === 'main' || body.bucket === 'any' ? body.bucket : undefined;
  }
}

/**
 * A 429: a rate limit was reached
 *
 * `retryAfter` is the wait in seconds, from the `Retry-After` header or the body's `retryAfter`.
 */
export class RateLimitError extends APIError {
  override name = 'RateLimitError';
  readonly retryAfter: number | undefined;

  constructor(params: ConstructorParameters<typeof APIError>[0]) {
    super(params);
    const body = this.json;
    this.retryAfter =
      parseRetryAfter(params.headers.get('retry-after')) ??
      (typeof body.retryAfter === 'number' ? body.retryAfter : undefined);
  }
}

/**
 * The request failed before a reply arrived: DNS, a refused or reset connection, TLS
 */
export class APIConnectionError extends BrudcastError {
  override name = 'APIConnectionError';

  constructor(params: { message?: string; cause?: unknown } = {}) {
    super(params.message ?? 'Connection error.', { cause: params.cause });
  }
}

/**
 * The request's `timeout` elapsed before a reply arrived
 */
export class APITimeoutError extends APIConnectionError {
  override name = 'APITimeoutError';

  constructor(params: { cause?: unknown } = {}) {
    super({ message: 'Request timed out.', cause: params.cause });
  }
}

/**
 * The caller's `AbortSignal` cancelled the request
 */
export class APIUserAbortError extends BrudcastError {
  override name = 'APIUserAbortError';

  constructor(params: { cause?: unknown } = {}) {
    super('Request was aborted.', { cause: params.cause });
  }
}

/**
 * Read an error body as an object
 *
 * @param body - The parsed body, which may be any JSON value or text
 * @returns The body when it is a JSON object, else an empty object
 */
function asObject(body: unknown): ErrorBody {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as ErrorBody)
    : {};
}

/**
 * Read a `Retry-After` header as seconds
 *
 * @param value - The header, a number of seconds or an HTTP-date
 * @returns The seconds to wait, or undefined when the header is absent or not valid
 */
export function parseRetryAfter(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);

  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;

  return Math.max(0, (date - Date.now()) / 1000);
}
