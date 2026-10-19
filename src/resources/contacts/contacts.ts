import type { APIPromise } from '../../core/api-promise';
import type { CursorPage, OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions, Transport } from '../../core/transport';
import {
  ContactEmails,
  ContactImessageAccounts,
  ContactPushNotifications,
  ContactSmsNumbers,
  ContactTelegramAccounts,
  ContactWhatsappAccounts,
} from './channels';
import type {
  Contact,
  ContactActivity,
  ContactActivityMeta,
  ContactActivityParams,
  ContactBulkAddToListParams,
  ContactBulkCreateParams,
  ContactBulkCreateResult,
  ContactConsentRecord,
  ContactCreateParams,
  ContactIdsParams,
  ContactInAppIdentity,
  ContactListMeta,
  ContactListParams,
  ContactStatistics,
  ContactUpdateParams,
} from './types';

/**
 * Contacts: the people an organization messages, and every channel it can reach them on
 *
 * Requires the `contacts:read` scope to read and `contacts:write` to change.
 */
export class Contacts extends APIResource {
  readonly emails: ContactEmails;
  readonly sms: ContactSmsNumbers;
  readonly whatsapp: ContactWhatsappAccounts;
  readonly telegram: ContactTelegramAccounts;
  readonly imessage: ContactImessageAccounts;
  readonly pushNotifications: ContactPushNotifications;
  readonly consentRecords: ContactConsentRecords;
  readonly inAppIdentities: ContactInAppIdentities;

  constructor(transport: Transport) {
    super(transport);
    this.emails = new ContactEmails(transport);
    this.sms = new ContactSmsNumbers(transport);
    this.whatsapp = new ContactWhatsappAccounts(transport);
    this.telegram = new ContactTelegramAccounts(transport);
    this.imessage = new ContactImessageAccounts(transport);
    this.pushNotifications = new ContactPushNotifications(transport);
    this.consentRecords = new ContactConsentRecords(transport);
    this.inAppIdentities = new ContactInAppIdentities(transport);
  }

  /**
   * Create a contact
   *
   * @param params - The contact; at least one channel array must hold an entry
   * @param options - Request options
   * @returns The new contact with its channels
   */
  create(params: ContactCreateParams, options?: RequestOptions): APIPromise<Contact> {
    return this.request(
      'POST',
      '/contacts',
      { body: params, options },
      (data: { contact: Contact }) => data.contact,
    );
  }

  /**
   * Create up to 500 contacts at once
   *
   * Each contact is created or fails on its own; `errors` lists the failures by position.
   *
   * @param params - The contacts
   * @param options - Request options
   * @returns The created contacts and the failures
   */
  bulkCreate(
    params: ContactBulkCreateParams,
    options?: RequestOptions,
  ): APIPromise<ContactBulkCreateResult> {
    return this.request('POST', '/contacts/bulk', { body: params, options });
  }

  /**
   * Fetch a contact with its channels, tags and list memberships
   *
   * @param contactId - The contact
   * @param options - Request options
   * @returns The contact
   */
  retrieve(contactId: string, options?: RequestOptions): APIPromise<Contact> {
    return this.request('GET', this.path`/contacts/${contactId}`, { options });
  }

  /**
   * Change a contact's own fields; channels have their own methods
   *
   * @param contactId - The contact
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated contact
   */
  update(
    contactId: string,
    params: ContactUpdateParams,
    options?: RequestOptions,
  ): APIPromise<Contact> {
    return this.request('PATCH', this.path`/contacts/${contactId}`, { body: params, options });
  }

  /**
   * List contacts
   *
   * @param params - Filters, sort and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every contact
   */
  list(
    params: ContactListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<Contact, ContactListMeta>, Contact> {
    return this.offsetList('/contacts', { query: params, options });
  }

  /**
   * Delete a contact
   *
   * @param contactId - The contact
   * @param options - Request options
   * @returns A promise that resolves once the contact is deleted
   */
  delete(contactId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/contacts/${contactId}`, { options });
  }

  /**
   * Delete up to 1000 contacts at once
   *
   * @param params - The contact ids
   * @param options - Request options
   * @returns How many were deleted
   */
  bulkDelete(
    params: ContactIdsParams,
    options?: RequestOptions,
  ): APIPromise<{ deletedCount: number }> {
    return this.request('POST', '/contacts/bulk-delete', { body: params, options });
  }

  /**
   * Archive up to 1000 contacts at once
   *
   * @param params - The contact ids
   * @param options - Request options
   * @returns How many were archived
   */
  bulkArchive(
    params: ContactIdsParams,
    options?: RequestOptions,
  ): APIPromise<{ archivedCount: number }> {
    return this.request('POST', '/contacts/bulk-archive', { body: params, options });
  }

  /**
   * Add up to 1000 contacts to a list at once
   *
   * @param params - The contact ids and the list
   * @param options - Request options
   * @returns How many were added
   */
  bulkAddToList(
    params: ContactBulkAddToListParams,
    options?: RequestOptions,
  ): APIPromise<{ addedCount: number }> {
    return this.request('POST', '/contacts/bulk-add-to-list', { body: params, options });
  }

  /**
   * Count contacts by status, with the organization's contact quota
   *
   * @param options - Request options
   * @returns The counts and the quota
   */
  statistics(options?: RequestOptions): APIPromise<ContactStatistics> {
    return this.request('GET', '/contacts/statistics', { options });
  }

  /**
   * List what happened to a contact across campaigns, newest first
   *
   * Events older than `meta.retentionDays` are not kept.
   *
   * @param contactId - The contact
   * @param params - Cursor and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every event
   */
  activity(
    contactId: string,
    params: ContactActivityParams = {},
    options?: RequestOptions,
  ): PagePromise<CursorPage<ContactActivity, ContactActivityMeta>, ContactActivity> {
    return this.cursorList(this.path`/contacts/${contactId}/activity`, { query: params, options });
  }
}

/**
 * The consent a contact gave, and where: `/contacts/:contactId/consent-records`
 */
export class ContactConsentRecords extends APIResource {
  /**
   * List a contact's consent records, newest first
   *
   * @param contactId - The contact
   * @param params - Page and page size (up to 100, the default)
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every record
   */
  list(
    contactId: string,
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactConsentRecord>, ContactConsentRecord> {
    return this.offsetList(this.path`/contacts/${contactId}/consent-records`, {
      query: params,
      options,
    });
  }
}

/**
 * The in-app SDK identities linked to a contact: `/contacts/:contactId/in-app-identities`
 */
export class ContactInAppIdentities extends APIResource {
  /**
   * List the in-app identities linked to a contact
   *
   * @param contactId - The contact
   * @param params - Page and page size (up to 100, the default)
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every identity
   */
  list(
    contactId: string,
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactInAppIdentity>, ContactInAppIdentity> {
    return this.offsetList(this.path`/contacts/${contactId}/in-app-identities`, {
      query: params,
      options,
    });
  }
}
