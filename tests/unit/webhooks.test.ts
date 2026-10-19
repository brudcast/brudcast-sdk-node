import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  constructEvent,
  DEFAULT_TOLERANCE_SECONDS,
  SIGNATURE_HEADER,
  verifyWebhook,
  WebhookVerificationError,
} from '../../src/webhooks/index';

const secret = 'whsec_test';
const now = 1_760_000_000;
const body = JSON.stringify({
  delivery_id: 'd1',
  event: 'test.event',
  data: { message: 'This is a test webhook delivery', timestamp: '2026-10-19T00:00:00.000Z' },
  timestamp: now - 10,
});
const sign = (payload: string, timestamp = now, key = secret) =>
  `t=${timestamp},v1=${createHmac('sha256', key).update(`${timestamp}.${payload}`).digest('hex')}`;

describe('verifyWebhook', () => {
  it('accepts a valid signature over the raw string or bytes', () => {
    expect(() =>
      verifyWebhook({ payload: body, signature: sign(body), secret, now }),
    ).not.toThrow();
    expect(() =>
      verifyWebhook({ payload: Buffer.from(body), signature: [sign(body)], secret, now }),
    ).not.toThrow();
    expect(() =>
      verifyWebhook({
        payload: new TextEncoder().encode(body),
        signature: sign(body),
        secret,
        now,
      }),
    ).not.toThrow();
  });

  it('accepts any of several v1 signatures and ignores parts it does not know', () => {
    const header = `t=${now},v1=deadbeef,junk,v0=abc,${sign(body).split(',')[1]}`;

    expect(() => verifyWebhook({ payload: body, signature: header, secret, now })).not.toThrow();
  });

  it('refuses a wrong secret, a changed body and a short signature', () => {
    const cases = [
      { payload: body, signature: sign(body, now, 'other') },
      { payload: `${body} `, signature: sign(body) },
      { payload: body, signature: `t=${now},v1=abcd` },
    ];

    for (const params of cases) {
      expect(() => verifyWebhook({ ...params, secret, now })).toThrow(/does not match/);
    }
  });

  it('refuses a missing or malformed header and an empty secret', () => {
    expect(() => verifyWebhook({ payload: body, signature: undefined, secret, now })).toThrow(
      /missing/,
    );
    expect(() => verifyWebhook({ payload: body, signature: 'v1=abc', secret, now })).toThrow(
      /form t=/,
    );
    expect(() => verifyWebhook({ payload: body, signature: `t=${now}`, secret, now })).toThrow(
      /form t=/,
    );
    expect(() => verifyWebhook({ payload: body, signature: sign(body), secret: '', now })).toThrow(
      /secret is empty/,
    );
  });

  it('refuses an old signature unless the tolerance allows it', () => {
    const old = sign(body, now - DEFAULT_TOLERANCE_SECONDS - 1);

    expect(() => verifyWebhook({ payload: body, signature: old, secret, now })).toThrow(
      WebhookVerificationError,
    );
    expect(() =>
      verifyWebhook({ payload: body, signature: old, secret, now, tolerance: 0 }),
    ).not.toThrow();
    expect(() =>
      verifyWebhook({ payload: body, signature: old, secret, now, tolerance: 600 }),
    ).not.toThrow();
  });

  it('uses the clock when no time is given', () => {
    const fresh = Math.floor(Date.now() / 1000);

    expect(() =>
      verifyWebhook({ payload: body, signature: sign(body, fresh), secret }),
    ).not.toThrow();
  });

  it('refuses a parsed body and says how to get the raw one', () => {
    expect(() =>
      verifyWebhook({ payload: JSON.parse(body) as never, signature: sign(body), secret, now }),
    ).toThrow(/express\.raw/);
  });

  it('names the header', () => {
    expect(SIGNATURE_HEADER).toBe('x-webhook-signature-v1');
  });
});

describe('constructEvent', () => {
  it('returns the parsed, typed event', () => {
    const event = constructEvent({ payload: body, signature: sign(body), secret, now });

    expect(event.event).toBe('test.event');
    if (event.event === 'test.event') {
      expect(event.data.message).toBe('This is a test webhook delivery');
    }
    expect(event.delivery_id).toBe('d1');
  });

  it('does not parse a body whose signature fails', () => {
    expect(() => constructEvent({ payload: body, signature: sign('{}'), secret, now })).toThrow(
      WebhookVerificationError,
    );
  });
});
