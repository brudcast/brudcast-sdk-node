import { afterAll, describe, expect, it } from 'vitest';
import { Brudcast, NotFoundError, type Contact, type ContactCreateParams } from '../../src/index';

/**
 * The live contract suite: runs against a real core service and checks that replies carry
 * the fields the SDK's types promise.
 *
 * Needs `BRUDCAST_CONTRACT_API_KEY` (a key with every scope, in an organization kept for these
 * runs) and optionally `BRUDCAST_CONTRACT_BASE_URL`. Without the key the suite is skipped.
 */
const apiKey = process.env.BRUDCAST_CONTRACT_API_KEY;
const suite = apiKey ? describe : describe.skip;

/**
 * Check that a reply has every key a type requires
 *
 * @param value - The reply
 * @param keys - The keys
 */
function expectKeys(value: unknown, keys: string[]): void {
  expect(value).toBeTypeOf('object');
  for (const key of keys) {
    expect(value as Record<string, unknown>, `missing "${key}"`).toHaveProperty(key);
  }
}

suite('contract', () => {
  const client = new Brudcast({
    apiKey,
    baseURL: process.env.BRUDCAST_CONTRACT_BASE_URL,
    maxRetries: 1,
  });
  const run = `contract-${Date.now()}`;
  const cleanup: (() => Promise<unknown>)[] = [];
  let requiredFields: Record<string, unknown> | undefined;

  /**
   * Build a new contact that passes the organization's required custom fields
   *
   * @param email - The contact's address
   * @param extra - Other fields
   * @returns The create params
   */
  async function contactParams(
    email: string,
    extra: Omit<ContactCreateParams, 'emails'> = {},
  ): Promise<ContactCreateParams> {
    requiredFields ??= Object.fromEntries(
      (await client.contactCustomFields.listAll())
        .filter((field) => field.isRequired)
        .map((field) => [
          field.key,
          field.type === 'number'
            ? 1
            : field.type === 'boolean'
              ? true
              : field.type === 'date'
                ? '2026-01-01'
                : field.type === 'select'
                  ? (field.options?.[0] ?? 'contract')
                  : 'contract',
        ]),
    );

    return { ...extra, customFields: requiredFields, emails: [{ email }] };
  }

  afterAll(async () => {
    for (const step of cleanup.reverse()) {
      await step().catch(() => undefined);
    }
  });

  it('creates, reads, updates, lists and deletes a contact', async () => {
    const created = await client.contacts.create(
      await contactParams(`${run}@example.com`, { firstName: 'Contract', tags: [run] }),
    );
    cleanup.push(() => client.contacts.delete(created.id));
    cleanup.push(async () => {
      const tags = await client.contactTags.list({ search: run });
      await Promise.all(tags.data.map((tag) => client.contactTags.delete(tag.id)));
    });

    expectKeys(created, ['id', 'organizationId', 'externalId', 'tags', 'createdAt', 'emails']);

    const fetched = await client.contacts.retrieve(created.id);
    expect(fetched.emails?.[0]?.email).toBe(`${run}@example.com`);
    expectKeys(fetched.emails?.[0], ['id', 'status', 'isPrimary', 'bounceCount']);

    const updated = await client.contacts.update(created.id, { lastName: 'Suite' });
    expect(updated.lastName).toBe('Suite');

    const page = await client.contacts.list({ search: run, limit: 1 });
    expectKeys(page.meta, [
      'total',
      'perPage',
      'currentPage',
      'lastPage',
      'filters',
      'appliedFilters',
    ]);

    const found: Contact[] = [];
    for await (const contact of client.contacts.list({ tags: [run] })) found.push(contact);
    expect(found.map((contact) => contact.id)).toContain(created.id);

    const activity = await client.contacts.activity(created.id);
    expectKeys(activity.meta, ['nextCursor', 'hasMore', 'retentionDays']);
  });

  it('manages a list and its members', async () => {
    const list = await client.contactLists.create({ name: run });
    cleanup.push(() => client.contactLists.delete(list.id));
    expectKeys(list, ['id', 'cuid', 'status', 'preferredChannels', 'subscriberCount']);

    const contact = await client.contacts.create(await contactParams(`${run}-list@example.com`));
    cleanup.push(() => client.contacts.delete(contact.id));

    const added = await client.contactLists.contacts.add(list.id, { contactIds: [contact.id] });
    expectKeys(added, ['addedCount', 'totalSubscribers']);

    const members = await client.contactLists.contacts.list(list.id);
    expectKeys(members.data[0], ['id', 'contactId', 'status', 'contact']);

    expectKeys(await client.contactLists.statistics(), [
      'totalLists',
      'activeLists',
      'totalSubscribers',
    ]);
  });

  it('creates and deletes tags and custom fields', async () => {
    const tag = await client.contactTags.create({ name: `${run}-tag` });
    cleanup.push(() => client.contactTags.delete(tag.id));
    expectKeys(tag, ['id', 'name', 'organizationId']);

    const field = await client.contactCustomFields.create({
      name: run,
      key: `c_${Date.now()}`,
      type: 'text',
    });
    cleanup.push(() => client.contactCustomFields.delete(field.id));
    expectKeys(field, ['id', 'key', 'type', 'isRequired', 'options']);

    expect(Array.isArray(await client.contactTags.listAll())).toBe(true);
  });

  it('reads every list the key can reach', async () => {
    const lists = [
      client.contactSegments.list(),
      client.contactImports.list(),
      client.contactExports.list(),
      client.suppressions.list(),
      client.campaigns.list(),
      client.templates.list(),
      client.webhookEndpoints.list(),
      client.reports.exports.list(),
      client.sendingDomains.list(),
      client.ipPools.list(),
      client.senderIdentities.list(),
      client.pushApplications.list(),
      client.inAppApplications.list(),
      client.whatsapp.businessAccounts.list(),
      client.whatsapp.templates.list(),
      client.mailboxDomains.list(),
      client.mailboxes.list(),
      client.contactForms.list(),
      client.websites.list(),
    ];

    for (const page of await Promise.all(lists)) {
      expect(Array.isArray(page.data)).toBe(true);
      expectKeys(page.meta, ['total', 'perPage', 'currentPage', 'lastPage']);
    }

    for (const page of await Promise.all([
      client.messages.list(),
      client.webhookDeliveries.list(),
    ])) {
      expect(Array.isArray(page.data)).toBe(true);
      expectKeys(page.meta, ['nextCursor', 'hasMore']);
    }
  });

  it('reads the summaries and reports', async () => {
    expectKeys(await client.contacts.statistics(), ['statistics', 'quota']);
    expectKeys(await client.campaigns.statistics(), ['totalCampaigns', 'avgOpenRate']);
    expectKeys(await client.webhookEndpoints.statistics(), [
      'totalEndpoints',
      'overallSuccessRate',
    ]);
    expectKeys(await client.dashboard.stats(), ['messagesSent', 'sentByChannel']);
    expectKeys(await client.dashboard.overview(), ['sendVolume', 'recentCampaigns', 'insights']);
    expectKeys(await client.reports.overview(), ['kpis', 'emailKpis', 'channelReach', 'journey']);
    expectKeys(await client.campaigns.reports.overview(), ['totalSent', 'trends']);
    expectKeys(await client.preferenceCenter.retrieve(), ['listIds', 'editableFields', 'language']);
  });

  it('answers a missing row with a typed 404 and a request id', async () => {
    const error = await client.contacts
      .retrieve('00000000-0000-4000-8000-000000000000')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).code).toBe('E_ROW_NOT_FOUND');
    expect((error as NotFoundError).requestId).toBeTruthy();
  });

  it('replays a keyed create instead of creating twice', async () => {
    const key = `${run}-idempotent`;
    const params = await contactParams(`${run}-idem@example.com`);

    const first = await client.contacts.create(params, { idempotencyKey: key });
    cleanup.push(() => client.contacts.delete(first.id));
    const { data: second, response } = await client.contacts
      .create(params, { idempotencyKey: key })
      .withResponse();

    expect(second.id).toBe(first.id);
    expect(response.headers.get('idempotent-replayed')).toBe('true');
  });
});
