import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions, Transport } from '../../core/transport';
import type {
  ContactList,
  ContactListAddContactsParams,
  ContactListBulkOperationParams,
  ContactListBulkOperationResult,
  ContactListCreateParams,
  ContactListListParams,
  ContactListMember,
  ContactListMemberListParams,
  ContactListRemoveContactsParams,
  ContactListStatistics,
  ContactListUpdateParams,
} from './types';

/**
 * Contact lists: audiences contacts subscribe to
 *
 * Requires the `contacts:read` scope to read and `contacts:write` to change.
 */
export class ContactLists extends APIResource {
  readonly contacts: ContactListContacts;

  constructor(transport: Transport) {
    super(transport);
    this.contacts = new ContactListContacts(transport);
  }

  /**
   * Create a list
   *
   * @param params - The list
   * @param options - Request options
   * @returns The new list
   */
  create(params: ContactListCreateParams, options?: RequestOptions): APIPromise<ContactList> {
    return this.request('POST', '/contact-lists', { body: params, options });
  }

  /**
   * Fetch a list
   *
   * @param listId - The list
   * @param options - Request options
   * @returns The list
   */
  retrieve(listId: string, options?: RequestOptions): APIPromise<ContactList> {
    return this.request('GET', this.path`/contact-lists/${listId}`, { options });
  }

  /**
   * Change a list
   *
   * @param listId - The list
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated list
   */
  update(
    listId: string,
    params: ContactListUpdateParams,
    options?: RequestOptions,
  ): APIPromise<ContactList> {
    return this.request('PATCH', this.path`/contact-lists/${listId}`, { body: params, options });
  }

  /**
   * List the organization's lists
   *
   * @param params - Filters, sort and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every list
   */
  list(
    params: ContactListListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactList>, ContactList> {
    return this.offsetList('/contact-lists', { query: params, options });
  }

  /**
   * Delete a list; its contacts are kept
   *
   * @param listId - The list
   * @param options - Request options
   * @returns A promise that resolves once the list is deleted
   */
  delete(listId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/contact-lists/${listId}`, { options });
  }

  /**
   * Count the organization's lists and subscribers
   *
   * @param options - Request options
   * @returns The counts
   */
  statistics(options?: RequestOptions): APIPromise<ContactListStatistics> {
    return this.request(
      'GET',
      '/contact-lists/statistics',
      { options },
      (data: { statistics: ContactListStatistics }) => data.statistics,
    );
  }

  /**
   * Activate, deactivate, archive or delete up to 1000 lists at once
   *
   * @param params - The lists and the operation
   * @param options - Request options
   * @returns How many lists changed; undefined for `delete`, which reports nothing back
   */
  bulkOperation(
    params: ContactListBulkOperationParams,
    options?: RequestOptions,
  ): APIPromise<ContactListBulkOperationResult | undefined> {
    return this.request('POST', '/contact-lists/bulk-operation', { body: params, options });
  }
}

/**
 * The contacts subscribed to a list: `/contact-lists/:id/contacts`
 */
export class ContactListContacts extends APIResource {
  /**
   * List a list's members
   *
   * @param listId - The list
   * @param params - Search and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every member
   */
  list(
    listId: string,
    params: ContactListMemberListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactListMember>, ContactListMember> {
    return this.offsetList(this.path`/contact-lists/${listId}/contacts`, {
      query: params,
      options,
    });
  }

  /**
   * Subscribe up to 1000 contacts to a list
   *
   * @param listId - The list
   * @param params - The contact ids
   * @param options - Request options
   * @returns How many were added and the list's new subscriber count
   */
  add(
    listId: string,
    params: ContactListAddContactsParams,
    options?: RequestOptions,
  ): APIPromise<{ addedCount: number; totalSubscribers: number }> {
    return this.request('POST', this.path`/contact-lists/${listId}/contacts`, {
      body: params,
      options,
    });
  }

  /**
   * Unsubscribe up to 1000 contacts from a list
   *
   * @param listId - The list
   * @param params - The contact ids and an optional reason
   * @param options - Request options
   * @returns How many were removed and the list's new subscriber count
   */
  remove(
    listId: string,
    params: ContactListRemoveContactsParams,
    options?: RequestOptions,
  ): APIPromise<{ removedCount: number; totalSubscribers: number }> {
    return this.request('POST', this.path`/contact-lists/${listId}/contacts/remove`, {
      body: params,
      options,
    });
  }
}
