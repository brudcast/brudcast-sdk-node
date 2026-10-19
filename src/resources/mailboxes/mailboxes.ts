import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions, Transport } from '../../core/transport';
import type { DnsRecordPurpose } from '../sending-domains/sending-domains';
import type { Timestamp } from '../shared';

export type MailboxDomainStatus = 'pending' | 'verifying' | 'active' | 'verification_failed';
export type MailboxStatus = 'provisioning' | 'active' | 'provisioning_failed' | 'suspended';

export interface MailboxDnsRecord {
  id: string;
  mailboxDomainId: string;
  type: 'TXT' | 'CNAME' | 'MX' | 'SRV';
  name: string;
  value: string;
  purpose: DnsRecordPurpose;
  description: string | null;
  priority: number | null;
  weight: number | null;
  port: number | null;
  ttl: number;
  verifiedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Present on records embedded in a domain. */
  isVerified?: boolean;
  /** Present on records embedded in a domain. */
  scope?: 'sending' | 'mailbox' | 'shared';
}

/**
 * A domain the organization hosts mailboxes on. Mirrors `MailboxDomainTransformer`.
 */
export interface MailboxDomain {
  id: string;
  organizationId: string;
  sendingDomainId: string | null;
  name: string;
  status: MailboxDomainStatus;
  dkimSelector: string | null;
  dkimPublicKey: string | null;
  lastVerificationAttempt: Timestamp | null;
  verifiedAt: Timestamp | null;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Whether incoming mail is delivered yet. */
  inboundDeliveryLive?: boolean;
  dnsRecords?: MailboxDnsRecord[];
}

export interface MailboxAlias {
  id: string;
  mailboxId: string;
  address: string;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A mailbox. Mirrors `MailboxTransformer`.
 */
export interface Mailbox {
  id: string;
  mailboxDomainId: string;
  organizationId: string;
  address: string;
  displayName: string | null;
  status: MailboxStatus;
  quotaBytes: number;
  usedBytes: number;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  aliases?: MailboxAlias[];
  mailboxDomain?: MailboxDomain;
}

export interface MailboxWithPassword extends Omit<Mailbox, 'aliases' | 'mailboxDomain'> {
  /** The mailbox's password; store or hand it over now, it is not shown again. */
  password: string;
}

export interface MailboxCreateParams {
  /** The part before `@`: lowercase letters and digits, separated by `.`, `_` or `-`. */
  localPart: string;
  displayName?: string;
  /** 1 GiB to 100 GiB. */
  quotaBytes?: number;
}

/**
 * Mailbox domains, with their mailboxes and aliases
 *
 * Requires the `mailboxes:read` scope to read and `mailboxes:write` to change.
 */
export class MailboxDomains extends APIResource {
  readonly mailboxes: MailboxDomainMailboxes;
  readonly aliases: MailboxAliases;

  constructor(transport: Transport) {
    super(transport);
    this.mailboxes = new MailboxDomainMailboxes(transport);
    this.aliases = new MailboxAliases(transport);
  }

  /**
   * Add a mailbox domain; publish its DNS records, then call `verifyDnsRecords`
   *
   * @param params - The domain name
   * @param options - Request options
   * @returns The new domain
   */
  create(params: { name: string }, options?: RequestOptions): APIPromise<MailboxDomain> {
    return this.request('POST', '/mailbox-domains', { body: params, options });
  }

  /**
   * Fetch a domain with its DNS records
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns The domain
   */
  retrieve(domainId: string, options?: RequestOptions): APIPromise<MailboxDomain> {
    return this.request('GET', this.path`/mailbox-domains/${domainId}`, { options });
  }

  /**
   * List mailbox domains
   *
   * @param params - Page and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every domain
   */
  list(
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<MailboxDomain>, MailboxDomain> {
    return this.offsetList('/mailbox-domains', { query: params, options });
  }

  /**
   * Delete a mailbox domain and its mailboxes
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns A promise that resolves once the domain is deleted
   */
  delete(domainId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/mailbox-domains/${domainId}`, { options });
  }

  /**
   * List the DNS records a domain needs
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns The records
   */
  dnsRecords(domainId: string, options?: RequestOptions): APIPromise<MailboxDnsRecord[]> {
    return this.request('GET', this.path`/mailbox-domains/${domainId}/dns-records`, { options });
  }

  /**
   * Check a domain's DNS records now
   *
   * @param domainId - The domain
   * @param options - Request options
   * @returns The domain and its records, each marked verified or not
   */
  verifyDnsRecords(
    domainId: string,
    options?: RequestOptions,
  ): APIPromise<{ mailboxDomain: MailboxDomain; dnsRecords: MailboxDnsRecord[] }> {
    return this.request('POST', this.path`/mailbox-domains/${domainId}/verify-dns-records`, {
      options,
    });
  }
}

/**
 * The mailboxes on one domain: `/mailbox-domains/:mailboxDomainId/mailboxes`
 */
export class MailboxDomainMailboxes extends APIResource {
  /**
   * Create a mailbox
   *
   * @param domainId - The mailbox domain
   * @param params - The address and quota
   * @param options - Request options
   * @returns The mailbox with its password, which is not shown again
   */
  create(
    domainId: string,
    params: MailboxCreateParams,
    options?: RequestOptions,
  ): APIPromise<MailboxWithPassword> {
    return this.request('POST', this.path`/mailbox-domains/${domainId}/mailboxes`, {
      body: params,
      options,
    });
  }

  /**
   * Fetch a mailbox
   *
   * @param domainId - The mailbox domain
   * @param mailboxId - The mailbox
   * @param options - Request options
   * @returns The mailbox
   */
  retrieve(domainId: string, mailboxId: string, options?: RequestOptions): APIPromise<Mailbox> {
    return this.request('GET', this.path`/mailbox-domains/${domainId}/mailboxes/${mailboxId}`, {
      options,
    });
  }

  /**
   * Change a mailbox's name or quota
   *
   * @param domainId - The mailbox domain
   * @param mailboxId - The mailbox
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated mailbox
   */
  update(
    domainId: string,
    mailboxId: string,
    params: { displayName?: string | null; quotaBytes?: number },
    options?: RequestOptions,
  ): APIPromise<Mailbox> {
    return this.request('PATCH', this.path`/mailbox-domains/${domainId}/mailboxes/${mailboxId}`, {
      body: params,
      options,
    });
  }

  /**
   * List a domain's mailboxes
   *
   * @param domainId - The mailbox domain
   * @param params - Page and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every mailbox
   */
  list(
    domainId: string,
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<Mailbox>, Mailbox> {
    return this.offsetList(this.path`/mailbox-domains/${domainId}/mailboxes`, {
      query: params,
      options,
    });
  }

  /**
   * Delete a mailbox
   *
   * @param domainId - The mailbox domain
   * @param mailboxId - The mailbox
   * @param options - Request options
   * @returns A promise that resolves once the mailbox is deleted
   */
  delete(domainId: string, mailboxId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid(
      'DELETE',
      this.path`/mailbox-domains/${domainId}/mailboxes/${mailboxId}`,
      {
        options,
      },
    );
  }

  /**
   * Replace a mailbox's password
   *
   * @param domainId - The mailbox domain
   * @param mailboxId - The mailbox
   * @param options - Request options
   * @returns The mailbox with its new password, which is not shown again
   */
  resetPassword(
    domainId: string,
    mailboxId: string,
    options?: RequestOptions,
  ): APIPromise<MailboxWithPassword> {
    return this.request(
      'POST',
      this.path`/mailbox-domains/${domainId}/mailboxes/${mailboxId}/reset-password`,
      { options },
    );
  }

  /**
   * Stop a mailbox from sending and receiving
   *
   * @param domainId - The mailbox domain
   * @param mailboxId - The mailbox
   * @param options - Request options
   * @returns The suspended mailbox
   */
  suspend(domainId: string, mailboxId: string, options?: RequestOptions): APIPromise<Mailbox> {
    return this.request(
      'POST',
      this.path`/mailbox-domains/${domainId}/mailboxes/${mailboxId}/suspend`,
      { options },
    );
  }

  /**
   * Restore a suspended mailbox
   *
   * @param domainId - The mailbox domain
   * @param mailboxId - The mailbox
   * @param options - Request options
   * @returns The restored mailbox
   */
  unsuspend(domainId: string, mailboxId: string, options?: RequestOptions): APIPromise<Mailbox> {
    return this.request(
      'POST',
      this.path`/mailbox-domains/${domainId}/mailboxes/${mailboxId}/unsuspend`,
      { options },
    );
  }
}

/**
 * A mailbox's aliases: `/mailbox-domains/:mailboxDomainId/mailboxes/:mailboxId/aliases`
 */
export class MailboxAliases extends APIResource {
  /**
   * Add an alias that delivers to a mailbox
   *
   * @param domainId - The mailbox domain
   * @param mailboxId - The mailbox
   * @param params - The alias's part before `@`
   * @param options - Request options
   * @returns The alias
   */
  create(
    domainId: string,
    mailboxId: string,
    params: { localPart: string },
    options?: RequestOptions,
  ): APIPromise<MailboxAlias> {
    return this.request(
      'POST',
      this.path`/mailbox-domains/${domainId}/mailboxes/${mailboxId}/aliases`,
      { body: params, options },
    );
  }

  /**
   * List a mailbox's aliases
   *
   * @param domainId - The mailbox domain
   * @param mailboxId - The mailbox
   * @param params - Page and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every alias
   */
  list(
    domainId: string,
    mailboxId: string,
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<MailboxAlias>, MailboxAlias> {
    return this.offsetList(this.path`/mailbox-domains/${domainId}/mailboxes/${mailboxId}/aliases`, {
      query: params,
      options,
    });
  }

  /**
   * Remove an alias
   *
   * @param domainId - The mailbox domain
   * @param mailboxId - The mailbox
   * @param aliasId - The alias
   * @param options - Request options
   * @returns A promise that resolves once the alias is removed
   */
  delete(
    domainId: string,
    mailboxId: string,
    aliasId: string,
    options?: RequestOptions,
  ): APIPromise<void> {
    return this.requestVoid(
      'DELETE',
      this.path`/mailbox-domains/${domainId}/mailboxes/${mailboxId}/aliases/${aliasId}`,
      { options },
    );
  }
}

/**
 * Every mailbox in the organization, across its domains
 *
 * Requires the `mailboxes:read` scope.
 */
export class Mailboxes extends APIResource {
  /**
   * List the organization's mailboxes
   *
   * @param params - Page and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every mailbox
   */
  list(
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<Mailbox>, Mailbox> {
    return this.offsetList('/mailboxes', { query: params, options });
  }
}
