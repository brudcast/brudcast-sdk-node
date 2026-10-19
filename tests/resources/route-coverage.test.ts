import { describe, expect, it } from 'vitest';
import routes from '../fixtures/api-key-routes.json';
import type { Brudcast } from '../../src/index';
import { envelope, json, mockClient } from '../helpers';

/**
 * API key routes the SDK leaves out on purpose, with the reason
 */
const EXCLUDED: Record<string, string> = {
  'PATCH /sending-domains/:/verify-dns-records':
    'superseded by the POST alias, which sendingDomains.verifyDnsRecords uses',
  'POST /campaigns/ai/preview-text': 'dashboard authoring helper, out of 1.0 (plan decision 11.3)',
  'POST /campaigns/ai/generate': 'dashboard authoring helper, out of 1.0 (plan decision 11.3)',
  'POST /campaigns/ai/design': 'dashboard authoring helper, out of 1.0 (plan decision 11.3)',
  'POST /campaigns/ai/design-reference':
    'dashboard authoring helper, out of 1.0 (plan decision 11.3)',
  'GET /campaigns/ai/house-style': 'dashboard authoring helper, out of 1.0 (plan decision 11.3)',
  'POST /campaigns/ai/copy': 'dashboard authoring helper, out of 1.0 (plan decision 11.3)',
  'POST /campaigns/ai/block-design': 'dashboard authoring helper, out of 1.0 (plan decision 11.3)',
  'POST /campaigns/ai/name': 'dashboard authoring helper, out of 1.0 (plan decision 11.3)',
  'POST /campaigns/ai/sms': 'dashboard authoring helper, out of 1.0 (plan decision 11.3)',
};

const ID = 'id_1';
const body = {} as never;

/**
 * One call per SDK method, with placeholder ids
 */
const calls: ((client: Brudcast) => unknown)[] = [
  (c) => c.contacts.create(body),
  (c) => c.contacts.bulkCreate(body),
  (c) => c.contacts.retrieve(ID),
  (c) => c.contacts.update(ID, body),
  (c) => c.contacts.list(),
  (c) => c.contacts.delete(ID),
  (c) => c.contacts.bulkDelete(body),
  (c) => c.contacts.bulkArchive(body),
  (c) => c.contacts.bulkAddToList(body),
  (c) => c.contacts.statistics(),
  (c) => c.contacts.activity(ID),
  (c) => c.contacts.consentRecords.list(ID),
  (c) => c.contacts.inAppIdentities.list(ID),
  ...(['emails', 'sms', 'whatsapp', 'telegram', 'imessage', 'pushNotifications'] as const).flatMap(
    (channel) => [
      (c: Brudcast) => c.contacts[channel].create(ID, body),
      (c: Brudcast) => c.contacts[channel].update(ID, ID, body),
      (c: Brudcast) => c.contacts[channel].delete(ID, ID),
    ],
  ),
  (c) => c.contactLists.create(body),
  (c) => c.contactLists.retrieve(ID),
  (c) => c.contactLists.update(ID, body),
  (c) => c.contactLists.list(),
  (c) => c.contactLists.delete(ID),
  (c) => c.contactLists.statistics(),
  (c) => c.contactLists.bulkOperation(body),
  (c) => c.contactLists.contacts.list(ID),
  (c) => c.contactLists.contacts.add(ID, body),
  (c) => c.contactLists.contacts.remove(ID, body),
  (c) => c.contactTags.create(body),
  (c) => c.contactTags.update(ID, body),
  (c) => c.contactTags.list(),
  (c) => c.contactTags.listAll(),
  (c) => c.contactTags.delete(ID),
  (c) => c.contactCustomFields.create(body),
  (c) => c.contactCustomFields.update(ID, body),
  (c) => c.contactCustomFields.list(),
  (c) => c.contactCustomFields.listAll(),
  (c) => c.contactCustomFields.delete(ID),
  (c) => c.contactSegments.create(body),
  (c) => c.contactSegments.retrieve(ID),
  (c) => c.contactSegments.update(ID, body),
  (c) => c.contactSegments.list(),
  (c) => c.contactSegments.delete(ID),
  (c) => c.contactSegments.previewCount(body),
  (c) => c.contactSegments.statistics(),
  (c) => c.contactSegments.snapshot(ID),
  (c) => c.contactSegments.convert(ID),
  (c) => c.contactSegments.refresh(ID),
  (c) => c.contactSegments.refreshCount(ID),
  (c) => c.contactSegments.contacts.list(ID),
  (c) => c.contactSegments.contacts.add(ID, body),
  (c) => c.contactSegments.contacts.remove(ID, body),
  (c) => c.contactImports.upload(new Blob(['a'])),
  (c) => c.contactImports.preview(ID, body),
  (c) => c.contactImports.create(body),
  (c) => c.contactImports.retrieve(ID),
  (c) => c.contactImports.list(),
  (c) => c.contactImports.errors(ID),
  (c) => c.contactExports.create(body),
  (c) => c.contactExports.retrieve(ID),
  (c) => c.contactExports.list(),
  (c) => c.contactExports.download(ID),
  (c) => c.suppressions.create(body),
  (c) => c.suppressions.list(),
  (c) => c.suppressions.delete(ID),
  (c) => c.campaigns.create(body),
  (c) => c.campaigns.retrieve(ID),
  (c) => c.campaigns.update(ID, body),
  (c) => c.campaigns.list(),
  (c) => c.campaigns.delete(ID),
  (c) => c.campaigns.bulkDelete(body),
  (c) => c.campaigns.bulkArchive(body),
  (c) => c.campaigns.statistics(),
  (c) => c.campaigns.estimateRecipients(body),
  (c) => c.campaigns.recipients(ID),
  (c) => c.campaigns.readiness(ID),
  (c) => c.campaigns.creditEstimate(ID),
  (c) => c.campaigns.send(ID, { sendOption: 'now' }),
  (c) => c.campaigns.pause(ID),
  (c) => c.campaigns.resume(ID),
  (c) => c.campaigns.cancel(ID),
  (c) => c.campaigns.duplicate(ID),
  (c) => c.campaigns.preview(ID),
  (c) => c.campaigns.previewWhatsapp(ID),
  (c) => c.campaigns.testSend(ID, body),
  (c) => c.campaigns.reports.overview(),
  (c) => c.campaigns.reports.trends(),
  (c) => c.campaigns.reports.performance(),
  (c) => c.campaigns.reports.statistics(ID),
  (c) => c.campaigns.reports.recipients(ID),
  (c) => c.campaigns.reports.journey(ID),
  (c) => c.campaigns.reports.answers(ID),
  (c) => c.templates.create(body),
  (c) => c.templates.retrieve(ID),
  (c) => c.templates.update(ID, body),
  (c) => c.templates.list(),
  (c) => c.templates.delete(ID),
  (c) => c.templates.duplicate(ID),
  (c) => c.templates.resolve(ID),
  (c) => c.messages.list(),
  (c) => c.messages.retrieve(ID),
  (c) => c.inApp.messages.send(body),
  (c) => c.webhookEndpoints.create(body),
  (c) => c.webhookEndpoints.retrieve(ID),
  (c) => c.webhookEndpoints.update(ID, body),
  (c) => c.webhookEndpoints.list(),
  (c) => c.webhookEndpoints.delete(ID),
  (c) => c.webhookEndpoints.statistics(),
  (c) => c.webhookEndpoints.test(ID),
  (c) => c.webhookEndpoints.regenerateSecret(ID),
  (c) => c.webhookDeliveries.list(),
  (c) => c.webhookDeliveries.retrieve(ID),
  (c) => c.webhookDeliveries.retry(ID),
  (c) => c.reports.overview(),
  (c) => c.reports.engagement(),
  (c) => c.reports.deliverability(),
  (c) => c.reports.channelPerformance(),
  (c) => c.reports.revenueAttribution(),
  (c) => c.reports.bounceClassification(),
  (c) => c.reports.exports.create(body),
  (c) => c.reports.exports.retrieve(ID),
  (c) => c.reports.exports.list(),
  (c) => c.reports.exports.download(ID),
  (c) => c.dashboard.stats(),
  (c) => c.dashboard.overview(),
  (c) => c.sendingDomains.create(body),
  (c) => c.sendingDomains.retrieve(ID),
  (c) => c.sendingDomains.update(ID, body),
  (c) => c.sendingDomains.list(),
  (c) => c.sendingDomains.delete(ID),
  (c) => c.sendingDomains.verifyDnsRecords(ID),
  (c) => c.sendingDomains.clearQueue(ID),
  (c) => c.sendingDomains.dkims.list(ID),
  (c) => c.sendingDomains.dkims.active(ID),
  (c) => c.sendingDomains.dkims.verify(ID),
  (c) => c.ipPools.list(),
  (c) => c.ipPools.retrieve(ID),
  (c) => c.ipPools.update(ID, body),
  (c) => c.ipPools.assign(ID, ID),
  (c) => c.ipPools.unassign(ID, ID),
  (c) => c.ipPoolRequests.create(ID, body),
  (c) => c.ipPoolRequests.list(ID),
  (c) => c.ipPoolRequests.cancel(ID),
  (c) => c.senderIdentities.create(body),
  (c) => c.senderIdentities.retrieve(ID),
  (c) => c.senderIdentities.update(ID, body),
  (c) => c.senderIdentities.list(),
  (c) => c.senderIdentities.delete(ID),
  (c) => c.senderIdentities.setDefault(ID),
  (c) => c.senderIdentities.providerRegistrations(ID),
  (c) => c.pushApplications.create(body),
  (c) => c.pushApplications.retrieve(ID),
  (c) => c.pushApplications.update(ID, body),
  (c) => c.pushApplications.list(),
  (c) => c.pushApplications.delete(ID),
  (c) => c.pushApplications.setDefault(ID),
  (c) => c.pushApplications.validate(ID),
  (c) => c.pushApplications.rotateCredential(ID, body),
  (c) => c.pushApplications.testSend(ID, body),
  (c) => c.inAppApplications.create(body),
  (c) => c.inAppApplications.retrieve(ID),
  (c) => c.inAppApplications.update(ID, body),
  (c) => c.inAppApplications.list(),
  (c) => c.inAppApplications.delete(ID),
  (c) => c.inAppApplications.rotateSecret(ID),
  (c) => c.inAppApplications.rotateKey(ID),
  (c) => c.inAppApplications.revokePreviousKey(ID),
  (c) => c.inAppApplications.testSend(ID, body),
  (c) => c.whatsapp.businessAccounts.retrieve(ID),
  (c) => c.whatsapp.businessAccounts.update(ID, body),
  (c) => c.whatsapp.businessAccounts.list(),
  (c) => c.whatsapp.businessAccounts.delete(ID),
  (c) => c.whatsapp.businessAccounts.validate(ID),
  (c) => c.whatsapp.businessAccounts.sync(ID),
  (c) => c.whatsapp.phoneNumbers.list(),
  (c) => c.whatsapp.templates.list(),
  (c) => c.whatsapp.templates.retrieve(ID),
  (c) => c.mailboxDomains.create(body),
  (c) => c.mailboxDomains.retrieve(ID),
  (c) => c.mailboxDomains.list(),
  (c) => c.mailboxDomains.delete(ID),
  (c) => c.mailboxDomains.dnsRecords(ID),
  (c) => c.mailboxDomains.verifyDnsRecords(ID),
  (c) => c.mailboxDomains.mailboxes.create(ID, body),
  (c) => c.mailboxDomains.mailboxes.retrieve(ID, ID),
  (c) => c.mailboxDomains.mailboxes.update(ID, ID, body),
  (c) => c.mailboxDomains.mailboxes.list(ID),
  (c) => c.mailboxDomains.mailboxes.delete(ID, ID),
  (c) => c.mailboxDomains.mailboxes.resetPassword(ID, ID),
  (c) => c.mailboxDomains.mailboxes.suspend(ID, ID),
  (c) => c.mailboxDomains.mailboxes.unsuspend(ID, ID),
  (c) => c.mailboxDomains.aliases.create(ID, ID, body),
  (c) => c.mailboxDomains.aliases.list(ID, ID),
  (c) => c.mailboxDomains.aliases.delete(ID, ID, ID),
  (c) => c.mailboxes.list(),
  (c) => c.contactForms.create(body),
  (c) => c.contactForms.retrieve(ID),
  (c) => c.contactForms.update(ID, body),
  (c) => c.contactForms.list(),
  (c) => c.contactForms.delete(ID),
  (c) => c.contactForms.statistics(),
  (c) => c.contactForms.analytics(ID),
  (c) => c.contactForms.schema(ID),
  (c) => c.contactForms.readiness(ID),
  (c) => c.contactForms.publish(ID),
  (c) => c.contactForms.unpublish(ID),
  (c) => c.contactForms.duplicate(ID),
  (c) => c.contactForms.fields.list(ID),
  (c) => c.contactForms.fields.replace(ID, body),
  (c) => c.contactForms.submissions.create(ID, body),
  (c) => c.contactForms.submissions.list(ID),
  (c) => c.contactForms.submissions.resend(ID, ID),
  (c) => c.contactForms.submissions.delete(ID, ID),
  (c) => c.contactForms.uploads.downloadUrl(ID, ID),
  (c) => c.contactForms.placements.create(ID, body),
  (c) => c.contactForms.placements.retrieve(ID, ID),
  (c) => c.contactForms.placements.update(ID, ID, body),
  (c) => c.contactForms.placements.list(ID),
  (c) => c.contactForms.placements.delete(ID, ID),
  (c) => c.contactForms.placements.publish(ID, ID),
  (c) => c.contactForms.placements.pause(ID, ID),
  (c) => c.contactForms.placements.variant(ID, ID),
  (c) => c.contactForms.placements.analytics(ID, ID),
  (c) => c.websites.create(body),
  (c) => c.websites.retrieve(ID),
  (c) => c.websites.update(ID, body),
  (c) => c.websites.list(),
  (c) => c.websites.delete(ID),
  (c) => c.preferenceCenter.retrieve(),
  (c) => c.preferenceCenter.update(body),
];

/**
 * Reduce a request to the route it matched
 *
 * @param method - The HTTP method
 * @param pathname - The request path
 * @returns For example `GET /contacts/:`
 */
const routeOf = (method: string, pathname: string) =>
  `${method} ${pathname
    .replace(/^\/api\/v1\/user/, '')
    .split('/')
    .map((segment) => (segment === ID ? ':' : segment))
    .join('/')}`;

describe('API key route coverage', () => {
  it('has a method for every route an API key can reach, and none for any other', async () => {
    const { client, requests } = mockClient(() => json(envelope([])));

    for (const call of calls) {
      await call(client);
    }

    const called = requests.map((request) => routeOf(request.method, request.url.pathname));
    const expected = routes
      .map((route) => routeOf(route.method, route.path.replace(/:[^/]+/g, ID)))
      .filter((route) => !(route in EXCLUDED));

    expect(new Set(called).size).toBe(called.length);
    expect([...called].sort()).toEqual([...expected].sort());
  });

  it('excludes only routes that exist', () => {
    const all = new Set(
      routes.map((route) => routeOf(route.method, route.path.replace(/:[^/]+/g, ID))),
    );

    for (const route of Object.keys(EXCLUDED)) {
      expect(all.has(route), route).toBe(true);
    }
  });
});
