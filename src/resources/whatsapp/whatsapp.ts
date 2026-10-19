import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions, Transport } from '../../core/transport';
import type { WhatsappCategory } from '../campaigns/types';
import type { Timestamp } from '../shared';

export type WhatsappBusinessAccountStatus =
  'pending_validation' | 'connected' | 'credential_invalid' | 'disconnecting' | 'disconnected';
export type WhatsappQualityRating = 'green' | 'yellow' | 'red' | 'unknown';
export type WhatsappMessagingTier =
  'tier_50' | 'tier_250' | 'tier_1k' | 'tier_2k' | 'tier_10k' | 'tier_100k' | 'unlimited';
export type WhatsappTemplateStatus = 'approved' | 'pending' | 'rejected' | 'paused' | 'disabled';

/**
 * A WhatsApp Business Account connected to the organization. Mirrors
 * `WhatsappBusinessAccountTransformer`.
 */
export interface WhatsappBusinessAccount {
  id: string;
  organizationId: string;
  /** Meta's id for the account. */
  wabaId: string;
  name: string | null;
  status: WhatsappBusinessAccountStatus;
  lastValidatedAt: Timestamp | null;
  lastError: string | null;
  connectedByUserId: string | null;
  disconnectRequestedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  credentialFingerprint: string | null;
  phoneNumberCount: number;
  phoneNumbers?: {
    id: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    verifiedName: string | null;
    qualityRating: WhatsappQualityRating | null;
    messagingLimitTier: WhatsappMessagingTier | null;
    status: string | null;
    senderIdentityId: string | null;
    sourceUpdatedAt: Timestamp;
  }[];
}

/**
 * A phone number on a business account. Mirrors `WhatsappPhoneNumberTransformer`.
 */
export interface WhatsappPhoneNumber {
  id: string;
  whatsappBusinessAccountId: string;
  organizationId: string;
  /** Meta's id for the number. */
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  qualityRating: WhatsappQualityRating | null;
  messagingLimitTier: WhatsappMessagingTier | null;
  status: string | null;
  isActive: boolean;
  senderIdentityId: string | null;
  sourceUpdatedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  businessAccount?: {
    id: string;
    wabaId: string;
    name: string | null;
    status: WhatsappBusinessAccountStatus;
  };
}

/**
 * A message template approved by Meta. Mirrors `WhatsappTemplateTransformer`.
 */
export interface WhatsappTemplate {
  id: string;
  whatsappBusinessAccountId: string;
  organizationId: string;
  metaTemplateId: string;
  name: string;
  language: string;
  category: WhatsappCategory;
  status: WhatsappTemplateStatus;
  variableCount: number;
  hasHeaderMedia: boolean;
  /** The template's components as Meta returns them. */
  components: Record<string, unknown>[];
  rejectedReason: string | null;
  sourceUpdatedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WhatsappTemplateListParams extends OffsetPageParams {
  businessAccountId?: string;
  phoneNumberId?: string;
  status?: WhatsappTemplateStatus;
  language?: string;
  search?: string;
}

/**
 * WhatsApp Business Accounts. Connecting an account and replacing its access token need a
 * dashboard session, so they are not here.
 *
 * Requires the `senders:read` scope to read and `senders:write` to change.
 */
export class WhatsappBusinessAccounts extends APIResource {
  /**
   * Fetch an account with its phone numbers
   *
   * @param accountId - The account
   * @param options - Request options
   * @returns The account
   */
  retrieve(accountId: string, options?: RequestOptions): APIPromise<WhatsappBusinessAccount> {
    return this.request('GET', this.path`/whatsapp/business-accounts/${accountId}`, { options });
  }

  /**
   * Rename an account
   *
   * @param accountId - The account
   * @param params - The new name, or null to clear it
   * @param options - Request options
   * @returns The updated account
   */
  update(
    accountId: string,
    params: { name?: string | null },
    options?: RequestOptions,
  ): APIPromise<WhatsappBusinessAccount> {
    return this.request('PATCH', this.path`/whatsapp/business-accounts/${accountId}`, {
      body: params,
      options,
    });
  }

  /**
   * List accounts
   *
   * @param params - Status, search and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every account
   */
  list(
    params: OffsetPageParams & { status?: WhatsappBusinessAccountStatus; search?: string } = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<WhatsappBusinessAccount>, WhatsappBusinessAccount> {
    return this.offsetList('/whatsapp/business-accounts', { query: params, options });
  }

  /**
   * Disconnect an account; it finishes in the background
   *
   * @param accountId - The account
   * @param options - Request options
   * @returns The account, disconnecting
   */
  delete(accountId: string, options?: RequestOptions): APIPromise<WhatsappBusinessAccount> {
    return this.request('DELETE', this.path`/whatsapp/business-accounts/${accountId}`, { options });
  }

  /**
   * Check the account's access token again
   *
   * @param accountId - The account
   * @param options - Request options
   * @returns The account, pending validation
   */
  validate(accountId: string, options?: RequestOptions): APIPromise<WhatsappBusinessAccount> {
    return this.request('POST', this.path`/whatsapp/business-accounts/${accountId}/validate`, {
      options,
    });
  }

  /**
   * Fetch the account's phone numbers and templates from Meta again
   *
   * @param accountId - The account
   * @param options - Request options
   * @returns The account; the refresh runs in the background
   */
  sync(accountId: string, options?: RequestOptions): APIPromise<WhatsappBusinessAccount> {
    return this.request('POST', this.path`/whatsapp/business-accounts/${accountId}/sync`, {
      options,
    });
  }
}

/**
 * The phone numbers on the organization's WhatsApp Business Accounts
 */
export class WhatsappPhoneNumbers extends APIResource {
  /**
   * List phone numbers
   *
   * @param params - One account only, and connected numbers only
   * @param options - Request options
   * @returns The numbers
   */
  list(
    params: { businessAccountId?: string; connectedOnly?: boolean } = {},
    options?: RequestOptions,
  ): APIPromise<WhatsappPhoneNumber[]> {
    return this.request('GET', '/whatsapp/phone-numbers', { query: params, options });
  }
}

/**
 * The message templates on the organization's WhatsApp Business Accounts
 *
 * Requires the `templates:read` scope.
 */
export class WhatsappTemplates extends APIResource {
  /**
   * List templates
   *
   * @param params - Account, number, status, language, search and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every template
   */
  list(
    params: WhatsappTemplateListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<WhatsappTemplate>, WhatsappTemplate> {
    return this.offsetList('/whatsapp/templates', { query: params, options });
  }

  /**
   * Fetch a template
   *
   * @param templateId - The template
   * @param options - Request options
   * @returns The template
   */
  retrieve(templateId: string, options?: RequestOptions): APIPromise<WhatsappTemplate> {
    return this.request('GET', this.path`/whatsapp/templates/${templateId}`, { options });
  }
}

/**
 * WhatsApp: business accounts, their phone numbers and their templates
 */
export class Whatsapp extends APIResource {
  readonly businessAccounts: WhatsappBusinessAccounts;
  readonly phoneNumbers: WhatsappPhoneNumbers;
  readonly templates: WhatsappTemplates;

  constructor(transport: Transport) {
    super(transport);
    this.businessAccounts = new WhatsappBusinessAccounts(transport);
    this.phoneNumbers = new WhatsappPhoneNumbers(transport);
    this.templates = new WhatsappTemplates(transport);
  }
}
