import { describe, expect, it } from 'vitest';
import { envelope, json, mockClient } from '../helpers';

const offsetMeta = (currentPage: number, lastPage: number) => ({
  total: lastPage * 2,
  perPage: 2,
  currentPage,
  lastPage,
  firstPage: 1,
  firstPageUrl: '/api/v1/user/contacts?page=1',
  lastPageUrl: `/api/v1/user/contacts?page=${lastPage}`,
  nextPageUrl: null,
  previousPageUrl: null,
});

describe('offset pages', () => {
  const pages = [
    envelope([{ id: 'a' }, { id: 'b' }], offsetMeta(1, 3)),
    envelope([{ id: 'c' }, { id: 'd' }], offsetMeta(2, 3)),
    envelope([{ id: 'e' }], offsetMeta(3, 3)),
  ];

  it('awaits to the first page with its meta', async () => {
    const { client } = mockClient(() => json(pages[0]));

    const page = await client.contacts.list({ limit: 2 });

    expect(page.data.map((contact) => contact.id)).toEqual(['a', 'b']);
    expect(page.meta.lastPage).toBe(3);
    expect(page.hasNextPage()).toBe(true);
  });

  it('iterates every item across pages, keeping the query', async () => {
    const { client, requests } = mockClient((request) =>
      json(pages[Number(request.url.searchParams.get('page') ?? '1') - 1]),
    );

    const ids: string[] = [];
    for await (const contact of client.contacts.list({ limit: 2, search: 'ada' })) {
      ids.push(contact.id);
    }

    expect(ids).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(requests.map((request) => request.url.search)).toEqual([
      '?limit=2&search=ada',
      '?limit=2&search=ada&page=2',
      '?limit=2&search=ada&page=3',
    ]);
  });

  it('iterates pages and stops on the last', async () => {
    const { client } = mockClient((request) =>
      json(pages[Number(request.url.searchParams.get('page') ?? '1') - 1]),
    );

    const first = await client.contacts.list();
    const counts: number[] = [];
    for await (const page of first.iterPages()) counts.push(page.data.length);

    expect(counts).toEqual([2, 2, 1]);
    const last = await (await first.getNextPage()).getNextPage();
    expect(last.hasNextPage()).toBe(false);
    await expect(last.getNextPage()).rejects.toThrow(/No next page/);
  });

  it('treats an empty page as the last and a missing meta as one page', async () => {
    const { client } = mockClient((_, attempt) =>
      attempt === 0 ? json(envelope([], offsetMeta(1, 5))) : json({ success: true }),
    );

    const empty = await client.contacts.list();
    const bare = await client.contacts.list();

    expect(empty.hasNextPage()).toBe(false);
    expect(bare.data).toEqual([]);
    expect(bare.meta).toMatchObject({ currentPage: 1, lastPage: 1 });
  });
});

describe('cursor pages', () => {
  it('follows nextCursor while hasMore', async () => {
    const { client, requests } = mockClient((request) => {
      const cursor = request.url.searchParams.get('cursor');
      return cursor
        ? json(
            envelope([{ type: 'opened' }], { nextCursor: null, hasMore: false, retentionDays: 90 }),
          )
        : json(
            envelope([{ type: 'delivered' }], {
              nextCursor: 'cur_2',
              hasMore: true,
              retentionDays: 90,
            }),
          );
    });

    const types: string[] = [];
    for await (const event of client.contacts.activity('c1', { limit: 1 })) types.push(event.type);

    expect(types).toEqual(['delivered', 'opened']);
    expect(requests[1]?.url.searchParams.get('cursor')).toBe('cur_2');
    expect((await client.contacts.activity('c1')).meta.retentionDays).toBe(90);
  });

  it('stops when hasMore is set without a cursor, or meta is missing', async () => {
    const { client } = mockClient((_, attempt) =>
      attempt === 0
        ? json(envelope([{ type: 'opened' }], { nextCursor: null, hasMore: true }))
        : json(envelope([{ type: 'opened' }])),
    );

    expect((await client.contacts.activity('c1')).hasNextPage()).toBe(false);
    const bare = await client.contacts.activity('c1');
    expect(bare.meta).toEqual({ nextCursor: null, hasMore: false });
  });
});

describe('empty replies', () => {
  it('reads a list reply with no body as an empty last page', async () => {
    const { client } = mockClient(() => new Response(null, { status: 204 }));

    const page = await client.contacts.list();

    expect(page.data).toEqual([]);
    expect(page.hasNextPage()).toBe(false);
  });

  it('resolves an upload with no body to undefined', async () => {
    const { client } = mockClient(() => new Response(null, { status: 201 }));

    await expect(client.contactImports.upload(new Blob(['a']))).resolves.toBeUndefined();
  });
});
