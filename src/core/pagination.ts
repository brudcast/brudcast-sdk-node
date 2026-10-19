import { APIPromise } from './api-promise';
import type { FinalRequest, Transport } from './transport';

/**
 * The `meta` of an offset page
 */
export interface OffsetPageMeta {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  firstPage: number;
  firstPageUrl: string;
  lastPageUrl: string;
  nextPageUrl: string | null;
  previousPageUrl: string | null;
}

/**
 * The `meta` of a cursor page; some lists add fields of their own, such as `retentionDays`
 */
export interface CursorPageMeta {
  nextCursor: string | null;
  hasMore: boolean;
  [key: string]: unknown;
}

/**
 * The parameters every offset-paged list accepts
 */
export interface OffsetPageParams {
  /** The page to fetch, from 1. */
  page?: number;
  /** Items per page, from 1 to 100. */
  limit?: number;
}

/**
 * The parameters every cursor-paged list accepts
 */
export interface CursorPageParams {
  /** The `meta.nextCursor` of the previous page; omit for the first page. */
  cursor?: string;
  /** Items per page, from 1 to 100. */
  limit?: number;
}

/**
 * One page of a list, which can fetch the pages after it
 *
 * Iterating a page with `for await` yields every item from this page onwards, fetching the
 * following pages as it goes.
 */
export abstract class Page<Item> implements AsyncIterable<Item> {
  readonly data: Item[];

  constructor(
    protected readonly transport: Transport,
    protected readonly request: FinalRequest,
    body: unknown,
  ) {
    const envelope = (body ?? {}) as { data?: unknown };
    this.data = Array.isArray(envelope.data) ? (envelope.data as Item[]) : [];
  }

  /**
   * The query that fetches the next page
   *
   * @returns The parameters to merge into this page's query, or null on the last page
   */
  protected abstract nextPageQuery(): Record<string, unknown> | null;

  /**
   * Build the next page from a reply
   *
   * @param request - The request that fetched it
   * @param body - Its parsed body
   * @returns The next page
   */
  protected abstract build(request: FinalRequest, body: unknown): this;

  /**
   * Tell whether another page follows this one
   *
   * @returns True when `getNextPage()` would return a page
   */
  hasNextPage(): boolean {
    return this.data.length > 0 && this.nextPageQuery() !== null;
  }

  /**
   * Fetch the page after this one
   *
   * @returns The next page
   * @throws {Error} When this is the last page; check `hasNextPage()` first
   */
  async getNextPage(): Promise<this> {
    const next = this.nextPageQuery();
    if (!this.hasNextPage() || next === null) {
      throw new Error('No next page; check hasNextPage() before calling getNextPage().');
    }

    const request: FinalRequest = { ...this.request, query: { ...this.request.query, ...next } };
    const reply = await this.transport.request(request);

    return this.build(request, reply.body);
  }

  /**
   * Iterate over this page and every page after it
   *
   * @returns The pages, fetched lazily
   */
  async *iterPages(): AsyncGenerator<this> {
    yield this;

    if (this.hasNextPage()) {
      yield* (await this.getNextPage()).iterPages();
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<Item> {
    for await (const page of this.iterPages()) {
      yield* page.data;
    }
  }
}

/**
 * A page of a list paged by number (`page` and `limit`)
 */
export class OffsetPage<Item, Meta extends OffsetPageMeta = OffsetPageMeta> extends Page<Item> {
  readonly meta: Meta;

  constructor(transport: Transport, request: FinalRequest, body: unknown) {
    super(transport, request, body);
    this.meta = ((body as { meta?: OffsetPageMeta } | undefined)?.meta ?? {
      total: this.data.length,
      perPage: this.data.length,
      currentPage: 1,
      lastPage: 1,
      firstPage: 1,
      firstPageUrl: '',
      lastPageUrl: '',
      nextPageUrl: null,
      previousPageUrl: null,
    }) as Meta;
  }

  protected nextPageQuery(): Record<string, unknown> | null {
    return this.meta.currentPage < this.meta.lastPage ? { page: this.meta.currentPage + 1 } : null;
  }

  protected build(request: FinalRequest, body: unknown): this {
    return new OffsetPage<Item, Meta>(this.transport, request, body) as this;
  }
}

/**
 * A page of a list paged by cursor (`cursor` and `limit`), used for logs that only grow
 */
export class CursorPage<Item, Meta extends CursorPageMeta = CursorPageMeta> extends Page<Item> {
  readonly meta: Meta;

  constructor(transport: Transport, request: FinalRequest, body: unknown) {
    super(transport, request, body);
    this.meta = ((body as { meta?: CursorPageMeta } | undefined)?.meta ?? {
      nextCursor: null,
      hasMore: false,
    }) as Meta;
  }

  protected nextPageQuery(): Record<string, unknown> | null {
    return this.meta.hasMore && this.meta.nextCursor ? { cursor: this.meta.nextCursor } : null;
  }

  protected build(request: FinalRequest, body: unknown): this {
    return new CursorPage<Item, Meta>(this.transport, request, body) as this;
  }
}

/**
 * The promise a list method returns: awaiting it gives the first page, and iterating it with
 * `for await` yields every item across every page
 */
export class PagePromise<P extends Page<Item>, Item>
  extends APIPromise<P>
  implements AsyncIterable<Item>
{
  async *[Symbol.asyncIterator](): AsyncIterator<Item> {
    const page = await this;

    for await (const item of page) {
      yield item;
    }
  }
}
