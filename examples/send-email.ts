import { randomUUID } from 'node:crypto';
import Brudcast from '@brudcast/node';

const brudcast = new Brudcast({
  apiKey: process.env.BRUDCAST_API_KEY,
  sendingKey: process.env.BRUDCAST_SENDING_KEY,
});

const orderId = process.argv[2] ?? randomUUID();

const { jobId } = await brudcast.emails.send(
  {
    from: { name: 'Acme', address: 'orders@mail.acme.test' },
    to: [{ address: 'ada@example.com' }],
    subject: `Order ${orderId} confirmed`,
    html: '<p>Thanks for your order.</p>',
  },
  { idempotencyKey: `order-confirmation-${orderId}` },
);

console.log('queued', jobId);
