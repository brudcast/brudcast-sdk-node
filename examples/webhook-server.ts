import { createServer } from 'node:http';
import { constructEvent, WebhookVerificationError } from '@brudcast/node/webhooks';

const secret = process.env.BRUDCAST_WEBHOOK_SECRET ?? '';

createServer((request, response) => {
  const chunks: Buffer[] = [];

  request.on('data', (chunk: Buffer) => chunks.push(chunk));
  request.on('end', () => {
    try {
      const event = constructEvent({
        payload: Buffer.concat(chunks),
        signature: request.headers['x-webhook-signature-v1'],
        secret,
      });

      if (event.event === 'push.token_invalidated') {
        console.log('stop sending to device', event.data.tokenId);
      }

      response.writeHead(204).end();
    } catch (error) {
      response.writeHead(error instanceof WebhookVerificationError ? 400 : 500).end();
    }
  });
}).listen(4000);
