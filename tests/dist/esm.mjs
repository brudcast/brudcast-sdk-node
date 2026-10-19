import assert from 'node:assert/strict';
import Brudcast, { APIError, NotFoundError, VERSION } from '@brudcast/node';
import { constructEvent, verifyWebhook } from '@brudcast/node/webhooks';

const client = new Brudcast({ apiKey: 'bk_live_dist' });
assert.equal(typeof client.campaigns.send, 'function');
assert.match(VERSION, /^\d+\.\d+\.\d+/);
assert.ok(new NotFoundError({ status: 404, message: 'x', body: undefined, headers: new Headers() }) instanceof APIError);
assert.equal(typeof constructEvent, 'function');
assert.equal(typeof verifyWebhook, 'function');
console.log('esm ok');
