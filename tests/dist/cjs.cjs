const assert = require('node:assert/strict');
const sdk = require('@brudcast/node');
const webhooks = require('@brudcast/node/webhooks');

const client = new sdk.Brudcast({ apiKey: 'bk_live_dist' });
assert.equal(typeof client.contacts.list, 'function');
assert.equal(sdk.default, sdk.Brudcast);
assert.ok(new sdk.NotFoundError({ status: 404, message: 'x', body: undefined, headers: new Headers() }) instanceof sdk.APIError);
assert.equal(typeof webhooks.constructEvent, 'function');
console.log('cjs ok');
