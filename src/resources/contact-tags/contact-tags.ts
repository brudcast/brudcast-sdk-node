import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type { ContactTagRecord } from '../contacts/types';

/**
 * A tag. Mirrors `ContactTagTransformer`.
 */
export type ContactTag = ContactTagRecord;

/**
 * The short form `listAll` returns, for pickers. Mirrors `ContactTagTransformer.toSummary`.
 */
export interface ContactTagSummary {
  id: string;
  name: string;
  contactCount?: number;
}

export interface ContactTagListParams extends OffsetPageParams {
  search?: string;
}

export interface ContactTagParams {
  /** 1 to 100 characters. */
  name: string;
}

/**
 * Contact tags, the labels on contacts and lists
 *
 * Requires the `contacts:read` scope to read and `contacts:write` to change.
 */
export class ContactTags extends APIResource {
  /**
   * Create a tag
   *
   * @param params - The tag's name
   * @param options - Request options
   * @returns The new tag
   */
  create(params: ContactTagParams, options?: RequestOptions): APIPromise<ContactTag> {
    return this.request(
      'POST',
      '/contact-tags',
      { body: params, options },
      (data: { tag: ContactTag }) => data.tag,
    );
  }

  /**
   * Rename a tag
   *
   * @param tagId - The tag
   * @param params - The new name
   * @param options - Request options
   * @returns The updated tag
   */
  update(
    tagId: string,
    params: ContactTagParams,
    options?: RequestOptions,
  ): APIPromise<ContactTag> {
    return this.request(
      'PATCH',
      this.path`/contact-tags/${tagId}`,
      { body: params, options },
      (data: { tag: ContactTag }) => data.tag,
    );
  }

  /**
   * List tags, ordered by name
   *
   * @param params - Search and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every tag
   */
  list(
    params: ContactTagListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactTag>, ContactTag> {
    return this.offsetList('/contact-tags', { query: params, options });
  }

  /**
   * List every tag in one reply, ordered by name
   *
   * @param options - Request options
   * @returns All the organization's tags
   */
  listAll(options?: RequestOptions): APIPromise<ContactTagSummary[]> {
    return this.request('GET', '/contact-tags/all', { options });
  }

  /**
   * Delete a tag and take it off every contact
   *
   * @param tagId - The tag
   * @param options - Request options
   * @returns A promise that resolves once the tag is deleted
   */
  delete(tagId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/contact-tags/${tagId}`, { options });
  }
}
