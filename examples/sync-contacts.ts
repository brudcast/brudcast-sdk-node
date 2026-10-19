import Brudcast, { UnprocessableEntityError } from '@brudcast/node';

const brudcast = new Brudcast({ apiKey: process.env.BRUDCAST_API_KEY });

const signups = [
  { firstName: 'Ada', email: 'ada@example.com' },
  { firstName: 'Grace', email: 'grace@example.com' },
];

const list = await brudcast.contactLists.create({ name: 'Newsletter' });

const result = await brudcast.contacts.bulkCreate({
  contacts: signups.map((signup) => ({
    firstName: signup.firstName,
    emails: [{ email: signup.email, isPrimary: true }],
  })),
});

await brudcast.contactLists.contacts.add(list.id, {
  contactIds: result.created.map((contact) => contact.id),
});

for (const failure of result.errors) {
  console.warn(`signup ${failure.index} was not imported: ${failure.message}`);
}

for await (const contact of brudcast.contacts.list({ status: ['active'], limit: 100 })) {
  console.log(contact.id, contact.emails?.[0]?.email);
}

try {
  await brudcast.contacts.create({});
} catch (error) {
  if (error instanceof UnprocessableEntityError) console.log(error.errors);
}
