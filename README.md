# Brudcast Node.js library

[![npm](https://img.shields.io/npm/v/@brudcast/node)](https://www.npmjs.com/package/@brudcast/node)

The official server-side library for the [Brudcast](https://brudcast.com) API.
Everything your organization does in the Brudcast dashboard, from your own code:

- **Audience**: contacts with every channel they can be reached on, lists,
  rule-based segments, tags, custom fields, CSV imports and exports, consent
  records and suppressions.
- **Campaigns**: email, SMS and push, with A/B tests, readiness checks, credit
  estimates, scheduling, previews and test sends.
- **Transactional messaging**: email through the send API, and the delivery log
  of every email and SMS.
- **Analytics**: campaign reports, engagement, deliverability, channel
  performance, bounce classification and report exports.
- **Sending setup**: sending domains with DNS and DKIM checks, dedicated IP
  pools, sender identities, push applications, WhatsApp business numbers and
  templates, and hosted mailboxes.
- **Forms**: signup forms and pages, their fields, submissions, popup
  placements, websites and the preference center.
- **Webhooks**: manage endpoints, retry deliveries, and verify signatures.

Built for production use:

- TypeScript types for every request and reply, taken from the API's own models
- Automatic pagination with `for await`
- Safe automatic retries, with an idempotency key on every `POST`
- Typed errors carrying the API's error code and request id
- No runtime dependencies; Node.js 20 and later, Bun and Deno

## Install

```bash
npm install @brudcast/node
```

## Quick start

```ts
import Brudcast from '@brudcast/node';

const brudcast = new Brudcast({
  apiKey: process.env.BRUDCAST_API_KEY,
  sendingKey: process.env.BRUDCAST_SENDING_KEY,
});

const contact = await brudcast.contacts.create({
  firstName: 'Ada',
  emails: [{ email: 'ada@example.com', isPrimary: true }],
});

await brudcast.contactLists.contacts.add(listId, { contactIds: [contact.id] });
```

The library takes two credentials, both from the Brudcast dashboard:

| Option       | Environment variable   | Used for                                   |
| ------------ | ---------------------- | ------------------------------------------ |
| `apiKey`     | `BRUDCAST_API_KEY`     | Everything except sending email (`bk_...`) |
| `sendingKey` | `BRUDCAST_SENDING_KEY` | `emails.send`, for one sending domain      |

An API key only reaches what its scopes allow (see
[What you can do](#what-you-can-do)); a call outside them fails with
`InsufficientScopeError`, which names the scope to add. Billing, the wallet and
API key management stay in the dashboard.

The client runs on your server only: it refuses to start in a browser, where it
would expose your key.

## What you can do

Every endpoint an organization API key can reach has a method. Each area needs
its `read` scope to read and its `write` scope to change.

| Area                | Client properties                                                       | Highlights                                                                                                                                                                                            | Scopes             |
| ------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Contacts            | `contacts`                                                              | create, update, bulk create, delete, archive and add to list; activity timeline; statistics; `emails`, `sms`, `whatsapp`, `telegram`, `imessage` and `pushNotifications` channels; `consentRecords`   | `contacts`         |
| Audiences           | `contactLists`, `contactSegments`, `contactTags`, `contactCustomFields` | list membership and bulk operations; dynamic and static segments with preview counts, snapshots and refresh                                                                                           | `contacts`         |
| Imports and exports | `contactImports`, `contactExports`                                      | CSV upload with suggested mappings, dry-run preview, error report; exports with a download link                                                                                                       | `contacts`         |
| Suppressions        | `suppressions`                                                          | add, list and lift suppressed addresses                                                                                                                                                               | `contacts`         |
| Campaigns           | `campaigns`, `campaigns.reports`                                        | email, SMS and push; A/B tests, recipient estimates, readiness, credit estimate, send or schedule, pause, resume, cancel, duplicate, preview, test send; statistics, journeys, trends and performance | `campaigns`        |
| Templates           | `templates`, `whatsapp.templates`                                       | reusable content with placeholders, resolve, duplicate; approved WhatsApp templates                                                                                                                   | `templates`        |
| Transactional       | `emails`, `messages`                                                    | send email (sending key); delivery logs for email and SMS                                                                                                                                             | `messages`         |
| Analytics           | `reports`, `reports.exports`, `dashboard`                               | overview, engagement, deliverability, channel performance, bounce classification; CSV and PDF exports                                                                                                 | `analytics`        |
| Webhooks            | `webhookEndpoints`, `webhookDeliveries`                                 | endpoints, test events, secret rotation, delivery log and retry                                                                                                                                       | `webhooks`         |
| Sending domains     | `sendingDomains`, `ipPools`, `ipPoolRequests`                           | DNS records and verification, DKIM, tracking settings; dedicated IP pools and requests                                                                                                                | `domains`          |
| Senders and apps    | `senderIdentities`, `pushApplications`, `whatsapp`                      | sender addresses, SMS sender IDs and their coverage; push apps with credential rotation and test sends; WhatsApp business numbers and templates                                                       | `senders`          |
| Mailboxes           | `mailboxDomains`, `mailboxes`                                           | mail domains, mailboxes, aliases, password resets, suspension                                                                                                                                         | `mailboxes`        |
| Forms               | `contactForms`, `websites`, `preferenceCenter`                          | forms and pages, fields, publish, analytics, popup placements, websites, preference center settings                                                                                                   | `forms`            |
| Form submissions    | `contactForms.submissions`, `contactForms.uploads`                      | submit from your server, list, resend confirmation, download uploads                                                                                                                                  | `form_submissions` |

## A tour

Each example is checked against the library's types in
[`examples/readme-tour.ts`](examples/readme-tour.ts).

### Contacts and lists

```ts
const contact = await brudcast.contacts.create({
  firstName: 'Ada',
  emails: [{ email: 'ada@example.com', isPrimary: true }],
  smsNumbers: [{ phoneNumber: '8031234567', countryCode: '234' }],
  tags: ['signup-2026'],
  customFields: { plan: 'pro' },
});

await brudcast.contactLists.contacts.add(listId, { contactIds: [contact.id] });
await brudcast.contacts.update(contact.id, {
  language: 'en',
  timezone: 'Africa/Lagos',
});

for await (const event of brudcast.contacts.activity(contact.id)) {
  console.log(event.type, event.campaignName, event.occurredAt);
}
```

### Segments

```ts
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

for await (const member of brudcast.contactSegments.contacts.list(segment.id)) {
  console.log(member.id);
}
```

### Importing a CSV

```ts
import { createReadStream } from 'node:fs';

const upload = await brudcast.contactImports.upload(
  createReadStream('customers.csv'),
);

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

const { status } = await brudcast.contactImports.retrieve(run.id);
```

### Campaigns

```ts
const campaign = await brudcast.campaigns.create({
  name: 'October newsletter',
  type: 'regular',
  channels: ['email', 'sms'],
  recipients: { segmentIds: [segment.id] },
  emailContent: {
    fromName: 'Acme',
    fromEmail: 'news@mail.acme.com',
    subject: 'What is new in October',
    htmlContent: '<h1>Hello {{first_name}}</h1>',
    editorMode: 'html',
  },
  smsContent: {
    body: 'Our October picks are live: acme.com/oct',
    senderId: 'ACME',
  },
});

const readiness = await brudcast.campaigns.readiness(campaign.id);
if (!readiness.sendable) {
  console.log(readiness.requirements.map((requirement) => requirement.message));
}

const cost = await brudcast.campaigns.creditEstimate(campaign.id);
if (readiness.sendable && cost.sufficient) {
  await brudcast.campaigns.send(campaign.id, {
    sendOption: 'schedule',
    scheduledAt: '2026-10-24T09:00:00Z',
  });
}
```

### Reporting

```ts
const stats = await brudcast.campaigns.reports.statistics(campaign.id);
console.log(stats.delivered, stats.openRate, stats.clickRate);

for await (const row of brudcast.campaigns.reports.performance({
  from: '2026-10-01',
})) {
  console.log(row.name, row.openRate);
}

const deliverability = await brudcast.reports.deliverability({
  from: '2026-10-01',
  to: '2026-10-31',
});
console.log(
  deliverability.kpis.bounceRate,
  deliverability.kpis.blacklistStatus,
);
```

### Transactional email and delivery logs

```ts
const { jobId } = await brudcast.emails.send(
  {
    from: { name: 'Acme', address: 'orders@mail.acme.com' },
    to: [{ address: 'ada@example.com' }],
    subject: `Order ${order.id} confirmed`,
    html: '<p>Thanks for your order.</p>',
  },
  { idempotencyKey: `order-confirmation-${order.id}` },
);

const message = await brudcast.messages.retrieve(jobId);
console.log(message.deliveryAttempts.map((attempt) => attempt.status));

for await (const sms of brudcast.messages.list({
  channel: 'sms',
  status: 'failed',
})) {
  console.log(sms.recipient.maskedNumber, sms.category);
}
```

Pass an `idempotencyKey` you store with the message: if your process crashes or
times out after sending, retrying with the same key returns the first result
instead of sending twice. Keys are honoured for 24 hours.

### Sending domains

```ts
const domain = await brudcast.sendingDomains.create({
  domain: 'mail.acme.com',
});

for (const record of domain.domainDnsRecords ?? []) {
  console.log(record.type, record.name, record.value); // publish these at your DNS host
}

await brudcast.sendingDomains.verifyDnsRecords(domain.id);
const dkim = await brudcast.sendingDomains.dkims.verify(domain.id);
```

### Form submissions from your server

```ts
const schema = await brudcast.contactForms.schema(formId);
console.log(schema.fields.map((field) => field.key));

await brudcast.contactForms.submissions.create(formId, {
  values: {
    email: 'ada@example.com',
    first_name: 'Ada',
    interests: ['product', 'events'],
  },
  context: { ipAddress: '203.0.113.7' },
});
```

### Webhook endpoints

```ts
const endpoint = await brudcast.webhookEndpoints.create({
  url: 'https://acme.com/webhooks/brudcast',
  events: ['push.token_invalidated'],
});
console.log('store this secret:', endpoint.secret);

for await (const delivery of brudcast.webhookDeliveries.list({
  status: ['failed'],
})) {
  await brudcast.webhookDeliveries.retry(delivery.id);
}
```

## Library behaviour

### Pagination

List methods return a page you can await, or iterate across every page:

```ts
const page = await brudcast.contacts.list({ status: ['active'], limit: 50 });
page.data;
page.meta.total;

for await (const contact of brudcast.contacts.list({ tags: ['vip'] })) {
  // fetches the next page as needed
}
```

Logs that only grow (messages, webhook deliveries, contact activity) page by
cursor the same way. Offset pages shift when rows are added or removed during
iteration; pin `createdAtTo` to the start of a long run to avoid skipping rows.

### Errors

Every failure is a `BrudcastError`. A reply from the API is an `APIError` with
its `status`, the API's `code`, the field `errors` of a validation failure, and
the `requestId` to quote to support:

```ts
import {
  APIError,
  InsufficientScopeError,
  RateLimitError,
} from '@brudcast/node';

try {
  await brudcast.campaigns.send(id, { sendOption: 'now' });
} catch (error) {
  if (error instanceof APIError && error.code === 'E_CAMPAIGN_NOT_SENDABLE') {
    console.log(error.errors); // what the campaign is missing
  } else if (error instanceof InsufficientScopeError) {
    console.log(`the key needs ${error.requiredScope}`);
  } else {
    throw error;
  }
}
```

| Status | Class                      |
| ------ | -------------------------- |
| 400    | `BadRequestError`          |
| 401    | `AuthenticationError`      |
| 402    | `InsufficientCreditsError` |
| 403    | `PermissionDeniedError`    |
| 403    | `InsufficientScopeError`   |
| 404    | `NotFoundError`            |
| 409    | `ConflictError`            |
| 422    | `UnprocessableEntityError` |
| 429    | `RateLimitError`           |
| 5xx    | `InternalServerError`      |
| -      | `APIConnectionError`       |
| -      | `APITimeoutError`          |
| -      | `APIUserAbortError`        |

Most domain failures share status 400; tell them apart by `error.code`.

### Retries and timeouts

Failed attempts are retried twice by default, with exponential backoff, or after
the reply's `Retry-After` when it has one:

- `GET`, `PUT` and `DELETE`: on a timeout, a dropped connection, a 408, a 429 or
  a 5xx.
- `POST`: the same, because every `POST` carries an `Idempotency-Key` (your own,
  or one the library generates per call), so a retry cannot act twice.
- `PATCH` and file uploads: only when the request cannot have reached the API (a
  refused connection, or a 429).

```ts
const brudcast = new Brudcast({ maxRetries: 3, timeout: 20_000 });

await brudcast.contacts.retrieve(id, { maxRetries: 0, timeout: 5_000 });
await brudcast.contacts.list({}, { signal: AbortSignal.timeout(10_000) });
```

The timeout applies to each attempt; `signal` cancels across all of them.

### Raw responses

```ts
const { data, response } = await brudcast.contacts.retrieve(id).withResponse();
response.headers.get('x-ratelimit-remaining');
response.headers.get('x-request-id');
```

### Uploads and downloads

Uploads take a `File`, `Blob`, `Buffer`, `Uint8Array` or stream. Export
downloads (`contactExports.download`, `reports.exports.download`) return a
short-lived signed `url` to fetch without an `Authorization` header.

### Verifying webhooks

Verify deliveries with the `webhooks` entry point, against the raw request body:

```ts
import express from 'express';
import { constructEvent } from '@brudcast/node/webhooks';

app.post(
  '/webhooks/brudcast',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const event = constructEvent({
      payload: req.body,
      signature: req.header('x-webhook-signature-v1'),
      secret: process.env.BRUDCAST_WEBHOOK_SECRET!,
    });

    if (event.event === 'push.token_invalidated') {
      event.data.tokenId;
    }

    res.sendStatus(204);
  },
);
```

`constructEvent` checks the HMAC-SHA256 signature over `<t>.<raw body>` in
constant time and refuses signatures older than five minutes (`tolerance`
changes it). A body parsed by `express.json()` can never match its signature;
the library says so when it is given one. Use `event.delivery_id` to drop
duplicate deliveries.

### Configuration

| Option                    | Default                                 |
| ------------------------- | --------------------------------------- |
| `apiKey`                  | `BRUDCAST_API_KEY`                      |
| `sendingKey`              | `BRUDCAST_SENDING_KEY`                  |
| `baseURL`                 | `BRUDCAST_BASE_URL`, then production    |
| `mailingBaseURL`          | `BRUDCAST_MAILING_BASE_URL`, then prod. |
| `timeout`                 | 60 seconds per attempt                  |
| `maxRetries`              | 2                                       |
| `defaultHeaders`          | none                                    |
| `fetch`                   | the global `fetch`                      |
| `dangerouslyAllowBrowser` | `false`                                 |

## Requirements

Node.js 20 or later. Bun and Deno work too; the `webhooks` entry point uses
`node:crypto`.

## Documentation

The guide at [docs.brudcast.com/developers/nodejs-library][guide] walks through
setup, and the [API reference][reference] documents every endpoint the library
calls.

[guide]: https://docs.brudcast.com/developers/nodejs-library
[reference]: https://docs.brudcast.com/api-reference/introduction

## License

MIT
