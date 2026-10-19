# Brudcast Node.js library

The official server-side library for the [Brudcast](https://brudcast.com) API:
contacts and audiences, campaigns on every channel, transactional email and
in-app messages, delivery logs and reports, sending infrastructure, forms, and
webhook verification.

- TypeScript types for every request and reply
- Automatic pagination with `for await`
- Safe automatic retries, with idempotency keys on every `POST`
- No runtime dependencies; Node.js 20 and later, Bun and Deno

## Install

```bash
npm install @brudcast/node
```

## Keys

The library takes two credentials, both from the Brudcast dashboard:

| Option       | Environment variable   | Used for                                   |
| ------------ | ---------------------- | ------------------------------------------ |
| `apiKey`     | `BRUDCAST_API_KEY`     | Everything except sending email (`bk_...`) |
| `sendingKey` | `BRUDCAST_SENDING_KEY` | `emails.send`, for one sending domain      |

An API key only reaches what its scopes allow; a call outside them fails with
`InsufficientScopeError`, which names the scope to add. Billing, wallet and API
key management stay in the dashboard and are not part of this library.

The client runs on your server only: it refuses to start in a browser, where it
would expose your key.

## Usage

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

const campaign = await brudcast.campaigns.retrieve(campaignId);
await brudcast.campaigns.send(campaign.id, { sendOption: 'now' });
```

### Sending email

```ts
const { jobId } = await brudcast.emails.send(
  {
    from: { name: 'Acme', address: 'orders@mail.acme.com' },
    to: [{ address: 'ada@example.com' }],
    subject: 'Your order is confirmed',
    html: '<p>Thanks for your order.</p>',
  },
  { idempotencyKey: `order-confirmation-${order.id}` },
);

const message = await brudcast.messages.retrieve(jobId);
```

Pass an `idempotencyKey` you store with the message: if your process crashes or
times out after sending, retrying with the same key returns the first result
instead of sending twice. Keys are honoured for 24 hours.

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

```ts
import { createReadStream } from 'node:fs';

const upload = await brudcast.contactImports.upload(
  createReadStream('people.csv'),
);
const preview = await brudcast.contactImports.preview(upload.id, {
  fieldMappings: upload.suggestedMappings,
  duplicateHandling: 'update',
});
```

Uploads take a `File`, `Blob`, `Buffer`, `Uint8Array` or stream. Export
downloads (`contactExports.download`, `reports.exports.download`) return a
short-lived signed `url` to fetch without an `Authorization` header.

## Webhooks

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

## Configuration

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

## Resources

`contacts` (with `emails`, `sms`, `whatsapp`, `telegram`, `imessage`,
`pushNotifications`, `consentRecords`, `inAppIdentities`), `contactLists`,
`contactTags`, `contactCustomFields`, `contactSegments`, `contactImports`,
`contactExports`, `suppressions`, `emails`, `campaigns` (with `reports`),
`templates`, `messages`, `inApp.messages`, `webhookEndpoints`,
`webhookDeliveries`, `reports` (with `exports`), `dashboard`, `sendingDomains`
(with `dkims`), `ipPools`, `ipPoolRequests`, `senderIdentities`,
`pushApplications`, `inAppApplications`, `whatsapp` (`businessAccounts`,
`phoneNumbers`, `templates`), `mailboxDomains` (with `mailboxes`, `aliases`),
`mailboxes`, `contactForms` (with `fields`, `submissions`, `uploads`,
`placements`), `websites` and `preferenceCenter`.

## Requirements

Node.js 20 or later. Bun and Deno work too; the `webhooks` entry point uses
`node:crypto`.

## License

MIT
