import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WebhookEvent } from './events';

export type * from './events';

/** The header that carries the signature. */
export const SIGNATURE_HEADER = 'x-webhook-signature-v1';

/** How old a signature may be, in seconds, before it is refused by default. */
export const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * A webhook delivery whose signature did not verify
 */
export class WebhookVerificationError extends Error {
  override name = 'WebhookVerificationError';
}

export interface VerifyWebhookParams {
  /** The request body exactly as received: a string, `Buffer` or `Uint8Array`, never parsed. */
  payload: string | Uint8Array;
  /** The `X-Webhook-Signature-V1` header, `t=<unix>,v1=<hex>`. */
  signature: string | string[] | null | undefined;
  /** The endpoint's signing secret. */
  secret: string;
  /**
   * The largest age, in seconds, of a signature to accept; `0` turns the check off. Defaults
   * to five minutes. Each retry is signed afresh, so a late retry still passes.
   */
  tolerance?: number;
  /** The current time in Unix seconds, for tests; defaults to now. */
  now?: number;
}

/**
 * Check a webhook delivery's signature
 *
 * Computes HMAC-SHA256 of `<t>.<raw body>` with the endpoint's secret and compares it with the
 * header's `v1` in constant time.
 *
 * @param params - The raw body, the signature header, the secret and the tolerance
 * @throws {WebhookVerificationError} When the header is missing or malformed, the signature does
 * not match, or the signature is older than the tolerance
 * @throws {TypeError} When the payload is not the raw body
 */
export function verifyWebhook(params: VerifyWebhookParams): void {
  const body = rawBody(params.payload);
  const header = Array.isArray(params.signature) ? params.signature[0] : params.signature;

  if (!params.secret) {
    throw new WebhookVerificationError('The webhook signing secret is empty.');
  }
  if (!header) {
    throw new WebhookVerificationError(
      'The X-Webhook-Signature-V1 header is missing; is this request from Brudcast?',
    );
  }

  const parts = new Map<string, string[]>();
  for (const part of header.split(',')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    const key = part.slice(0, separator).trim();
    parts.set(key, [...(parts.get(key) ?? []), part.slice(separator + 1).trim()]);
  }

  const timestamp = Number(parts.get('t')?.[0]);
  const signatures = parts.get('v1') ?? [];
  if (!Number.isInteger(timestamp) || signatures.length === 0) {
    throw new WebhookVerificationError(
      'The X-Webhook-Signature-V1 header is not in the form t=<unix>,v1=<hex>.',
    );
  }

  const expected = createHmac('sha256', params.secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest();
  const matches = signatures.some((candidate) => {
    const given = Buffer.from(candidate, 'hex');

    return given.length === expected.length && timingSafeEqual(given, expected);
  });

  if (!matches) {
    throw new WebhookVerificationError(
      'The webhook signature does not match. Check the secret, and that the body is the raw bytes received, not parsed and re-serialised JSON.',
    );
  }

  const tolerance = params.tolerance ?? DEFAULT_TOLERANCE_SECONDS;
  const now = params.now ?? Math.floor(Date.now() / 1000);
  if (tolerance > 0 && Math.abs(now - timestamp) > tolerance) {
    throw new WebhookVerificationError(
      `The webhook signature is ${Math.abs(now - timestamp)} seconds old, more than the ${tolerance} allowed.`,
    );
  }
}

/**
 * Verify a webhook delivery and parse its body
 *
 * @param params - The raw body, the signature header, the secret and the tolerance
 * @returns The event, typed by its `event` name
 * @throws {WebhookVerificationError} When the signature does not verify
 * @throws {TypeError} When the payload is not the raw body
 * @throws {SyntaxError} When the verified body is not JSON
 */
export function constructEvent(params: VerifyWebhookParams): WebhookEvent {
  verifyWebhook(params);

  return JSON.parse(rawBody(params.payload).toString('utf8')) as WebhookEvent;
}

/**
 * Read the raw body as bytes
 *
 * @param payload - The body as received
 * @returns Its bytes
 * @throws {TypeError} When the body is an object, which means a JSON parser already ran on it
 */
function rawBody(payload: unknown): Buffer {
  if (typeof payload === 'string') return Buffer.from(payload, 'utf8');
  if (payload instanceof Uint8Array)
    return Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);

  throw new TypeError(
    'The webhook payload must be the raw request body (a string or Buffer). It looks parsed: in Express, use express.raw({ type: "application/json" }) on the webhook route instead of express.json().',
  );
}
