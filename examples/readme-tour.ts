/**
 * The README's tour, kept here so `npm run typecheck` proves every snippet against the library.
 * Each function is one README section.
 */
import { createReadStream } from 'node:fs';
import Brudcast from '@brudcast/node';

const brudcast = new Brudcast({
  apiKey: process.env.BRUDCAST_API_KEY,
  sendingKey: process.env.BRUDCAST_SENDING_KEY,
});

/**
 * Contacts and lists
 *
 * @param listId - The newsletter list
 */
export async function contactsAndLists(listId: string) {
  const contact = await brudcast.contacts.create({
    firstName: 'Ada',
    emails: [{ email: 'ada@example.com', isPrimary: true }],
    smsNumbers: [{ phoneNumber: '8031234567', countryCode: '234' }],
    tags: ['signup-2026'],
    customFields: { plan: 'pro' },
  });

  await brudcast.contactLists.contacts.add(listId, { contactIds: [contact.id] });
  await brudcast.contacts.update(contact.id, { language: 'en', timezone: 'Africa/Lagos' });

  for await (const event of brudcast.contacts.activity(contact.id)) {
    console.log(event.type, event.campaignName, event.occurredAt);
  }
}

/**
 * Segments
 */
export async function segments() {
  const rules = [
    { field: 'tag', operator: 'is', value: 'vip' },
    { field: 'last_activity', operator: 'in_last', value: 30 },
  ] as const;

  const { contactCount } = await brudcast.contactSegments.previewCount({
    matchMode: 'all',
    rules: [...rules],
  });

  const segment = await brudcast.contactSegments.create({
    name: 'Engaged VIPs',
    type: 'dynamic',
    matchMode: 'all',
    rules: [...rules],
  });

  for await (const contact of brudcast.contactSegments.contacts.list(segment.id)) {
    console.log(contact.id, contactCount);
  }
}

/**
 * Imports
 */
export async function imports() {
  const upload = await brudcast.contactImports.upload(createReadStream('customers.csv'));

  const preview = await brudcast.contactImports.preview(upload.id, {
    fieldMappings: upload.suggestedMappings,
    duplicateHandling: 'update',
  });
  console.log(`${preview.newCount} new, ${preview.duplicateCount} to update`);

  const run = await brudcast.contactImports.create({
    uploadId: upload.id,
    fieldMappings: upload.suggestedMappings,
    duplicateHandling: 'update',
    listName: 'Customers',
    consentConfirmed: true,
  });

  const status = (await brudcast.contactImports.retrieve(run.id)).status;
  console.log(status);
}

/**
 * Campaigns
 *
 * @param segmentId - The audience
 */
export async function campaigns(segmentId: string) {
  const campaign = await brudcast.campaigns.create({
    name: 'October newsletter',
    type: 'regular',
    channels: ['email', 'sms'],
    recipients: { segmentIds: [segmentId] },
    emailContent: {
      fromName: 'Acme',
      fromEmail: 'news@mail.acme.com',
      subject: 'What is new in October',
      htmlContent: '<h1>Hello {{first_name}}</h1>',
      editorMode: 'html',
    },
    smsContent: { body: 'Our October picks are live: acme.com/oct', senderId: 'ACME' },
  });

  const readiness = await brudcast.campaigns.readiness(campaign.id);
  if (!readiness.sendable) {
    console.log(readiness.requirements.map((requirement) => requirement.message));
    return;
  }

  const cost = await brudcast.campaigns.creditEstimate(campaign.id);
  if (cost.sufficient) {
    await brudcast.campaigns.send(campaign.id, {
      sendOption: 'schedule',
      scheduledAt: '2026-10-24T09:00:00Z',
    });
  }
}

/**
 * Reporting
 *
 * @param campaignId - A sent campaign
 */
export async function reporting(campaignId: string) {
  const stats = await brudcast.campaigns.reports.statistics(campaignId);
  console.log(stats.delivered, stats.openRate, stats.clickRate);

  for await (const row of brudcast.campaigns.reports.performance({ from: '2026-10-01' })) {
    console.log(row.name, row.openRate);
  }

  const deliverability = await brudcast.reports.deliverability({
    from: '2026-10-01',
    to: '2026-10-31',
  });
  console.log(deliverability.kpis.bounceRate, deliverability.kpis.blacklistStatus);
}

/**
 * Transactional messages
 *
 * @param orderId - Your order
 * @param applicationId - An in-app application
 * @param templateId - An in-app template
 */
export async function transactional(orderId: string, applicationId: string, templateId: string) {
  const { jobId } = await brudcast.emails.send(
    {
      from: { name: 'Acme', address: 'orders@mail.acme.com' },
      to: [{ address: 'ada@example.com' }],
      subject: `Order ${orderId} confirmed`,
      html: '<p>Thanks for your order.</p>',
    },
    { idempotencyKey: `order-confirmation-${orderId}` },
  );

  const message = await brudcast.messages.retrieve(jobId);
  console.log(message.deliveryAttempts.map((attempt) => attempt.status));

  for await (const sms of brudcast.messages.list({ channel: 'sms', status: 'failed' })) {
    console.log(sms.recipient.maskedNumber, sms.category);
  }

  await brudcast.inApp.messages.send({
    applicationId,
    externalId: 'user_123',
    templateId,
    mergeData: { firstName: 'Ada' },
  });
}

/**
 * Sending domains
 */
export async function sendingDomains() {
  const domain = await brudcast.sendingDomains.create({ domain: 'mail.acme.com' });

  for (const record of domain.domainDnsRecords ?? []) {
    console.log(record.type, record.name, record.value);
  }

  await brudcast.sendingDomains.verifyDnsRecords(domain.id);
  const dkim = await brudcast.sendingDomains.dkims.verify(domain.id);
  console.log((await brudcast.sendingDomains.retrieve(domain.id)).status, dkim.propagated);
}

/**
 * Forms
 *
 * @param formId - A published form
 */
export async function forms(formId: string) {
  const schema = await brudcast.contactForms.schema(formId);
  console.log(schema.fields.map((field) => field.key));

  await brudcast.contactForms.submissions.create(formId, {
    values: { email: 'ada@example.com', first_name: 'Ada', interests: ['product', 'events'] },
    context: { ipAddress: '203.0.113.7' },
  });
}

/**
 * Webhook endpoints
 */
export async function webhookEndpoints() {
  const endpoint = await brudcast.webhookEndpoints.create({
    url: 'https://acme.com/webhooks/brudcast',
    events: ['push.token_invalidated', 'voice.call.completed'],
  });
  console.log('store this secret:', endpoint.secret);

  for await (const delivery of brudcast.webhookDeliveries.list({ status: ['failed'] })) {
    await brudcast.webhookDeliveries.retry(delivery.id);
  }
}
