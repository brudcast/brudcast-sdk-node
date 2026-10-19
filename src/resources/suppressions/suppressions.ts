import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type { Timestamp } from '../shared';

export type SuppressionReason = 'hard_bounce' | 'complaint' | 'invalid' | 'manual';
export type SuppressionSource = 'deliverability' | 'api' | 'dashboard' | 'import';

/**
 * An address email is never sent to. Mirrors `SuppressionEntryTransformer`.
 */
export interface Suppression {
  id: string;
  organizationId: string;
  email: string | null;
  reason: SuppressionReason;
  source: SuppressionSource;
  /** The SMTP code of the bounce that suppressed the address. */
  smtpCode: number | null;
  detail: string | null;
  createdByUserId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SuppressionCreateParams {
  email: string;
  /** Only the reasons you can set by hand; bounces and complaints are recorded by the API. */
  reason?: 'manual' | 'invalid';
  /** Up to 500 characters. */
  detail?: string;
}

export interface SuppressionListParams extends OffsetPageParams {
  search?: string;
  reason?: SuppressionReason;
}

/**
 * The organization's email suppression list
 *
 * Requires the `contacts:read` scope to read and `contacts:write` to change.
 */
export class Suppressions extends APIResource {
  /**
   * Suppress an address
   *
   * @param params - The address and why
   * @param options - Request options
   * @returns The suppression
   */
  create(params: SuppressionCreateParams, options?: RequestOptions): APIPromise<Suppression> {
    return this.request(
      'POST',
      '/suppressions',
      { body: params, options },
      (data: { suppression: Suppression }) => data.suppression,
    );
  }

  /**
   * List suppressed addresses
   *
   * @param params - Search, reason and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every entry
   */
  list(
    params: SuppressionListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<Suppression>, Suppression> {
    return this.offsetList('/suppressions', { query: params, options });
  }

  /**
   * Lift a suppression, so the address can be emailed again
   *
   * @param suppressionId - The suppression
   * @param options - Request options
   * @returns A promise that resolves once the suppression is lifted
   */
  delete(suppressionId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/suppressions/${suppressionId}`, { options });
  }
}
