import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions, Transport } from '../../core/transport';
import type { Timestamp } from '../shared';

export type SendingDomainStatus =
  | 'provisioning'
  | 'provisioning_failed'
  | 'unverified'
  | 'verified'
  | 'verification_failed'
  | 'suspended';

export type DnsRecordPurpose =
  | 'verification'
  | 'dkim'
  | 'spf'
  | 'dmarc'
  | 'tracking'
  | 'mx'
  | 'autoconfig'
  | 'autodiscover'
  | 'srv';

/**
 * A DNS record a domain needs. Mirrors `DomainDnsRecordTransformer`.
 */
export interface DomainDnsRecord {
  id: string;
  sendingDomainId: string;
  type: 'TXT' | 'CNAME' | 'MX';
  name: string;
  value: string;
  purpose: DnsRecordPurpose;
  description: string | null;
  priority: number | null;
  ttl: number;
  isVerified: boolean;
  /** Whether the record serves sending, mailboxes or both. */
  scope: 'sending' | 'mailbox' | 'shared';
  verifiedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A domain the organization sends email from. Mirrors `SendingDomainTransformer`.
 */
export interface SendingDomain {
  id: string;
  cuid: string;
  organizationId: string;
  name: string;
  status: SendingDomainStatus;
  /** `managed` domains are provided by Brudcast and expire. */
  ownership: 'customer' | 'managed';
  expiresAt: Timestamp | null;
  retiredAt: Timestamp | null;
  verifiedAt: Timestamp | null;
  lastVerificationAttempt: Timestamp | null;
  verificationAttempts: number;
  trackingEnabled: boolean;
  trackingHostname: string;
  clickTrackingEnabled: boolean;
  openTrackingEnabled: boolean;
  unsubscribesEnabled: boolean;
  returnPathEnabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sentLast30Days: number | null;
  sentThisCycle: number | null;
  /** The sender a managed domain sends as. */
  managedIdentity: { fromEmail: string; fromName: string } | null;
  domainDnsRecords?: DomainDnsRecord[];
}

export interface SendingDomainUpdateParams {
  trackingEnabled?: boolean;
  /** One hostname label, such as `email`, for `email.<domain>`. */
  trackingHostname?: string;
  clickTrackingEnabled?: boolean;
  openTrackingEnabled?: boolean;
  unsubscribesEnabled?: boolean;
  returnPathEnabled?: boolean;
}

export interface SendingDomainListParams extends OffsetPageParams {
  search?: string;
}

export interface DkimDnsRecord {
  name: string;
  type: 'TXT';
  value: string;
}

export interface DkimKey {
  domain: string;
  selector: string;
  algorithm: string;
  status: 'active';
  createdAt: Timestamp;
  dnsRecord: DkimDnsRecord;
}

/**
 * Sending domains: the domains email is sent from, with their DNS records
 *
 * Requires the `domains:read` scope to read and `domains:write` to change.
 */
export class SendingDomains extends APIResource {
  readonly dkims: SendingDomainDkims;

  constructor(transport: Transport) {
    super(transport);
    this.dkims = new SendingDomainDkims(transport);
  }

  /**
   * Add a domain; publish its `domainDnsRecords`, then call `verifyDnsRecords`
   *
   * @param params - The domain name, such as `example.com`
   * @param options - Request options
   * @returns The new domain with the DNS records to publish
   */
  create(params: { domain: string }, options?: RequestOptions): APIPromise<SendingDomain> {
    return this.request('POST', '/sending-domains', { body: params, options });
  }

  /**
   * Fetch a domain with its DNS records
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns The domain
   */
  retrieve(domainId: string, options?: RequestOptions): APIPromise<SendingDomain> {
    return this.request('GET', this.path`/sending-domains/${domainId}`, { options });
  }

  /**
   * Change a domain's tracking and return-path settings
   *
   * @param domainId - The domain
   * @param params - The settings to change
   * @param options - Request options
   * @returns The updated domain
   */
  update(
    domainId: string,
    params: SendingDomainUpdateParams,
    options?: RequestOptions,
  ): APIPromise<SendingDomain> {
    return this.request('PATCH', this.path`/sending-domains/${domainId}`, {
      body: params,
      options,
    });
  }

  /**
   * List domains
   *
   * @param params - Search and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every domain
   */
  list(
    params: SendingDomainListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<SendingDomain>, SendingDomain> {
    return this.offsetList('/sending-domains', { query: params, options });
  }

  /**
   * Delete a domain
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns A promise that resolves once the domain is deleted
   */
  delete(domainId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/sending-domains/${domainId}`, { options });
  }

  /**
   * Start checking a domain's DNS records; `retrieve` shows the result
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns A promise that resolves once the check has started
   */
  verifyDnsRecords(domainId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('POST', this.path`/sending-domains/${domainId}/verify-dns-records`, {
      options,
    });
  }

  /**
   * Drop the email queued for a domain that has not been sent yet
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns A promise that resolves once the queue is cleared
   */
  clearQueue(domainId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('POST', this.path`/sending-domains/${domainId}/clear-queue`, {
      options,
    });
  }
}

/**
 * A sending domain's DKIM keys: `/sending-domains/:id/dkims`
 */
export class SendingDomainDkims extends APIResource {
  /**
   * List a domain's DKIM keys, newest first
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns The keys, each with its TXT record
   */
  list(domainId: string, options?: RequestOptions): APIPromise<DkimKey[]> {
    return this.request('GET', this.path`/sending-domains/${domainId}/dkims`, { options });
  }

  /**
   * The TXT record of the domain's active DKIM key
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns The record to publish; fails with `BadRequestError` when there is no active key
   */
  active(domainId: string, options?: RequestOptions): APIPromise<DkimDnsRecord> {
    return this.request('GET', this.path`/sending-domains/${domainId}/dkims/active`, { options });
  }

  /**
   * Check whether the active DKIM key's TXT record is published
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns Whether the record was found, and whether a different value is published instead
   */
  verify(
    domainId: string,
    options?: RequestOptions,
  ): APIPromise<{ propagated: boolean; mismatch: boolean }> {
    return this.request('GET', this.path`/sending-domains/${domainId}/dkims/verify`, { options });
  }
}
