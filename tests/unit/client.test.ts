import { afterEach, describe, expect, it, vi } from 'vitest';
import Brudcast, { BrudcastError, VERSION } from '../../src/index';
import packageJson from '../../package.json';
import { envelope, json, mockClient } from '../helpers';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Brudcast', () => {
  it('reports the package version', () => {
    expect(VERSION).toBe(packageJson.version);
  });

  it('reads its keys and addresses from the environment', async () => {
    vi.stubEnv('BRUDCAST_API_KEY', ' bk_live_env\n');
    vi.stubEnv('BRUDCAST_SENDING_KEY', 'sk_env');
    vi.stubEnv('BRUDCAST_BASE_URL', 'https://core.env/');
    vi.stubEnv('BRUDCAST_MAILING_BASE_URL', 'https://mailing.env');
    const fetch = vi.fn(async () => json(envelope({ jobId: 'j1' })));

    const client = new Brudcast({ fetch, maxRetries: 0 });
    await client.contacts.statistics();
    await client.emails.send({
      from: { address: 'a@x.test' },
      to: [{ address: 'b@x.test' }],
      subject: 's',
      text: 't',
    });

    const calls = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]?.[0]).toBe('https://core.env/api/v1/user/contacts/statistics');
    expect(new Headers(calls[0]?.[1].headers).get('authorization')).toBe('Bearer bk_live_env');
    expect(calls[1]?.[0]).toBe('https://mailing.env/api/v1/send');
    expect(new Headers(calls[1]?.[1].headers).get('authorization')).toBe('Bearer sk_env');
  });

  it('defaults to production and the global fetch', async () => {
    vi.stubEnv('BRUDCAST_API_KEY', '');
    const fetch = vi.fn(async () => json(envelope({})));
    vi.stubGlobal('fetch', fetch);

    await new Brudcast({ apiKey: 'bk_live_x', maxRetries: 0 }).contacts.statistics();

    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://core-service.brudcast.com/api/v1/user/contacts/statistics',
    );
  });

  it('needs at least one key', () => {
    vi.stubEnv('BRUDCAST_API_KEY', '');
    vi.stubEnv('BRUDCAST_SENDING_KEY', '');

    expect(() => new Brudcast()).toThrow(/No API key/);
  });

  it('refuses an API key without the bk_ prefix and a sending key with control characters', () => {
    expect(() => new Brudcast({ apiKey: 'sk_123' })).toThrow(/starts with "bk_"/);
    expect(() => new Brudcast({ apiKey: 'bk_a b' })).toThrow(BrudcastError);
    expect(() => new Brudcast({ sendingKey: 'a\u0000b' })).toThrow(/cannot be sent/);
  });

  it('fails a call that needs the key it was not given, before sending', async () => {
    vi.stubEnv('BRUDCAST_API_KEY', '');
    vi.stubEnv('BRUDCAST_SENDING_KEY', '');
    const onlyApiKey = mockClient(undefined, { sendingKey: undefined });
    const onlySendingKey = new Brudcast({ sendingKey: 'sk_x', fetch: vi.fn() });

    await expect(
      onlyApiKey.client.emails.send({
        from: { address: 'a@x.test' },
        to: [],
        subject: 's',
        text: 't',
      }),
    ).rejects.toThrow(/needs a sending key/);
    await expect(onlySendingKey.contacts.statistics()).rejects.toThrow(/needs an API key/);
    expect(onlyApiKey.requests).toHaveLength(0);
  });

  it('refuses to run in a browser unless allowed', () => {
    vi.stubGlobal('window', { document: {} });

    expect(() => new Brudcast({ apiKey: 'bk_live_x' })).toThrow(/expose your API key/);
    expect(
      () => new Brudcast({ apiKey: 'bk_live_x', dangerouslyAllowBrowser: true }),
    ).not.toThrow();
  });

  it('exposes the error classes and toFile as statics', () => {
    expect(
      new Brudcast.NotFoundError({
        status: 404,
        message: 'x',
        body: undefined,
        headers: new Headers(),
      }),
    ).toBeInstanceOf(Brudcast.APIError);
    expect(typeof Brudcast.toFile).toBe('function');
  });
});
