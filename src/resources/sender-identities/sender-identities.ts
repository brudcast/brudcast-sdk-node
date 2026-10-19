import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type { Timestamp } from '../shared';

export type SenderIdentityChannel =
  'email' | 'sms' | 'whatsapp' | 'telegram' | 'imessage' | 'voice';
export type SenderIdentityStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'disabled';

/**
 * Channel-specific details of a sender
 */
export interface SenderIdentityMetadata {
  wabaId?: string;
  phoneNumber?: string;
  botUsername?: string;
  platform?: string;
  /** ISO 3166-1 alpha-2 countries an SMS sender ID may send to. */
  allowedCountries?: string[];
  providerRefs?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Where an SMS sender ID is registered and can be used. Mirrors `SenderIdentityCoverageTransformer`.
 */
export interface SenderIdentityCoverage {
  id: string;
  senderIdentityId: string;
  status: 'not_submitted' | 'submitted' | 'approved' | 'rejected';
  allowedCountries: string[];
  submittedAt: Timestamp | null;
  decidedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Whether messages can be routed through this registration. */
  isRoutable: boolean;
}

/**
 * A sender: an email address, SMS sender ID, WhatsApp number and so on. Mirrors
 * `OrganizationSenderIdentityTransformer`.
 */
export interface SenderIdentity {
  id: string;
  organizationId: string;
  channel: SenderIdentityChannel;
  status: SenderIdentityStatus;
  label: string;
  /** The address, sender ID or number. */
  value: string;
  fromName: string | null;
  replyTo: string | null;
  metadata: SenderIdentityMetadata | null;
  sendingDomainId: string | null;
  isDefault: boolean;
  adminNotes: string | null;
  approvedBy: string | null;
  approvedAt: Timestamp | null;
  mirrorPublishedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  providerRegistrations?: SenderIdentityCoverage[];
}

export interface SenderIdentityCreateParams {
  channel: SenderIdentityChannel;
  label: string;
  value: string;
  fromName?: string;
  replyTo?: string;
  metadata?: SenderIdentityMetadata;
  sendingDomainId?: string;
  isDefault?: boolean;
  /** Compliance documents supporting an SMS sender ID registration. */
  documentIds?: string[];
}

export interface SenderIdentityUpdateParams {
  label?: string;
  value?: string;
  fromName?: string | null;
  replyTo?: string | null;
  metadata?: SenderIdentityMetadata | null;
  sendingDomainId?: string | null;
  isDefault?: boolean;
}

export interface SenderIdentityListParams extends OffsetPageParams {
  channel?: SenderIdentityChannel;
  status?: SenderIdentityStatus;
  search?: string;
}

/**
 * Sender identities: who messages come from on each channel
 *
 * Requires the `senders:read` scope to read and `senders:write` to change.
 */
export class SenderIdentities extends APIResource {
  /**
   * Add a sender; SMS sender IDs and WhatsApp numbers are reviewed before use
   *
   * @param params - The sender
   * @param options - Request options
   * @returns The new sender
   */
  create(params: SenderIdentityCreateParams, options?: RequestOptions): APIPromise<SenderIdentity> {
    return this.request('POST', '/sender-identities', { body: params, options });
  }

  /**
   * Fetch a sender with its SMS registrations
   *
   * @param senderIdentityId - The sender
   * @param options - Request options
   * @returns The sender
   */
  retrieve(senderIdentityId: string, options?: RequestOptions): APIPromise<SenderIdentity> {
    return this.request('GET', this.path`/sender-identities/${senderIdentityId}`, { options });
  }

  /**
   * Change a sender
   *
   * @param senderIdentityId - The sender
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated sender
   */
  update(
    senderIdentityId: string,
    params: SenderIdentityUpdateParams,
    options?: RequestOptions,
  ): APIPromise<SenderIdentity> {
    return this.request('PATCH', this.path`/sender-identities/${senderIdentityId}`, {
      body: params,
      options,
    });
  }

  /**
   * List senders
   *
   * @param params - Channel, status, search and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every sender
   */
  list(
    params: SenderIdentityListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<SenderIdentity>, SenderIdentity> {
    return this.offsetList('/sender-identities', { query: params, options });
  }

  /**
   * Delete a sender
   *
   * @param senderIdentityId - The sender
   * @param options - Request options
   * @returns A promise that resolves once the sender is deleted
   */
  delete(senderIdentityId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/sender-identities/${senderIdentityId}`, {
      options,
    });
  }

  /**
   * Make a sender its channel's default
   *
   * @param senderIdentityId - The sender
   * @param options - Request options
   * @returns The sender
   */
  setDefault(senderIdentityId: string, options?: RequestOptions): APIPromise<SenderIdentity> {
    return this.request('POST', this.path`/sender-identities/${senderIdentityId}/default`, {
      options,
    });
  }

  /**
   * List where an SMS sender ID is registered, and to which countries it can send
   *
   * @param senderIdentityId - The sender
   * @param options - Request options
   * @returns The registrations
   */
  providerRegistrations(
    senderIdentityId: string,
    options?: RequestOptions,
  ): APIPromise<SenderIdentityCoverage[]> {
    return this.request(
      'GET',
      this.path`/sender-identities/${senderIdentityId}/provider-registrations`,
      { options },
    );
  }
}
