import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type { SendingDomain } from '../sending-domains/sending-domains';
import type { Timestamp } from '../shared';

/**
 * A pool of dedicated sending IPs. Mirrors `IpPoolTransformer`.
 */
export interface IpPool {
  id: string;
  organizationId: string;
  name: string;
  dipmPoolId: string | null;
  ips: string[];
  isDefault: boolean;
  warmupStatus: 'not_started' | 'in_progress' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  domainAssignments?: {
    id: string;
    sendingDomainId: string;
    ipPoolId: string;
    createdAt: Timestamp;
  }[];
}

export interface IpPoolListItem extends Omit<IpPool, 'domainAssignments'> {
  assignedDomains: number;
  domainAssignments: { id: string; sendingDomainId: string }[];
}

export type IpPoolRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * A request for dedicated IPs for a sending domain. Mirrors `IpPoolRequestTransformer`.
 */
export interface IpPoolRequest {
  id: string;
  organizationId: string;
  sendingDomainId: string;
  useType: 'transactional' | 'marketing';
  estimatedVolume: number;
  ipCount: number;
  status: IpPoolRequestStatus;
  adminNotes: string | null;
  /** The pool created for an approved request. */
  approvedIpPoolId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sentLast30Days: number | null;
  sentThisCycle: number | null;
  sendingDomain?: SendingDomain;
}

export interface IpPoolRequestCreateParams {
  useType: 'transactional' | 'marketing';
  /** Expected emails per month. */
  estimatedVolume: number;
  /** 1 to 10. */
  ipCount: number;
}

/**
 * Dedicated IP pools
 *
 * Requires the `domains:read` scope to read and `domains:write` to change.
 */
export class IpPools extends APIResource {
  /**
   * List the organization's pools, with how many domains each serves
   *
   * @param params - Page and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every pool
   */
  list(
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<IpPoolListItem>, IpPoolListItem> {
    return this.offsetList('/ip-pools', { query: params, options });
  }

  /**
   * Fetch a pool
   *
   * @param poolId - The pool
   * @param options - Request options
   * @returns The pool
   */
  retrieve(poolId: string, options?: RequestOptions): APIPromise<IpPool> {
    return this.request('GET', this.path`/ip-pools/${poolId}`, { options });
  }

  /**
   * Rename a pool
   *
   * @param poolId - The pool
   * @param params - The new name
   * @param options - Request options
   * @returns The updated pool
   */
  update(poolId: string, params: { name?: string }, options?: RequestOptions): APIPromise<IpPool> {
    return this.request('PATCH', this.path`/ip-pools/${poolId}`, { body: params, options });
  }

  /**
   * Send a domain's email through a pool
   *
   * @param poolId - The pool
   * @param sendingDomainId - The domain
   * @param options - Request options
   * @returns A promise that resolves once the pool is assigned
   */
  assign(poolId: string, sendingDomainId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid(
      'POST',
      this.path`/sending-domains/${sendingDomainId}/ip-pools/${poolId}/assign`,
      { options },
    );
  }

  /**
   * Stop sending a domain's email through a pool
   *
   * @param poolId - The pool
   * @param sendingDomainId - The domain
   * @param options - Request options
   * @returns A promise that resolves once the pool is unassigned
   */
  unassign(poolId: string, sendingDomainId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid(
      'POST',
      this.path`/sending-domains/${sendingDomainId}/ip-pools/${poolId}/unassign`,
      { options },
    );
  }
}

/**
 * Requests for dedicated IPs, reviewed by Brudcast
 *
 * Requires the `domains:read` scope to read and `domains:write` to change.
 */
export class IpPoolRequests extends APIResource {
  /**
   * Ask for dedicated IPs for a domain
   *
   * @param sendingDomainId - The domain
   * @param params - The use, volume and number of IPs
   * @param options - Request options
   * @returns The request, pending review
   */
  create(
    sendingDomainId: string,
    params: IpPoolRequestCreateParams,
    options?: RequestOptions,
  ): APIPromise<IpPoolRequest> {
    return this.request('POST', this.path`/sending-domains/${sendingDomainId}/ip-pool-requests`, {
      body: params,
      options,
    });
  }

  /**
   * List a domain's requests, newest first; at most the 100 most recent
   *
   * @param sendingDomainId - The domain
   * @param options - Request options
   * @returns The requests
   */
  list(sendingDomainId: string, options?: RequestOptions): APIPromise<IpPoolRequest[]> {
    return this.request('GET', this.path`/sending-domains/${sendingDomainId}/ip-pool-requests`, {
      options,
    });
  }

  /**
   * Withdraw a pending request
   *
   * @param requestId - The request
   * @param options - Request options
   * @returns The cancelled request
   */
  cancel(requestId: string, options?: RequestOptions): APIPromise<IpPoolRequest> {
    return this.request('POST', this.path`/ip-pool-requests/${requestId}/cancel`, { options });
  }
}
