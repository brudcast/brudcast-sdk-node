import type { APIPromise } from '../../core/api-promise';
import type {
  CursorPage,
  CursorPageParams,
  OffsetPage,
  OffsetPageParams,
  PagePromise,
} from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type { WebhookEventType } from '../../webhooks/events';
import type { Timestamp } from '../shared';

export type { WebhookEventType };

export type WebhookDeliveryStatus = 'pending' | 'processing' | 'retrying' | 'delivered' | 'failed';

/**
 * An endpoint the API posts events to. Mirrors the `WebhookEndpoint` model; the signing secret
 * is only ever returned by `create` and `regenerateSecret`.
 */
export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  url: string;
  description: string | null;
  events: WebhookEventType[];
  customHeaders: { key: string; value: string }[] | null;
  isActive: boolean;
  maxRetries: number;
  timeoutSeconds: number;
  lastTriggeredAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WebhookEndpointListItem extends WebhookEndpoint {
  totalDeliveries: number;
  /** Percent, 0 to 100. */
  successRate: number;
}

export interface WebhookEndpointDetail extends WebhookEndpoint {
  retryPolicy: { maxRetries: number; timeoutSeconds: number };
  totalDeliveries: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgResponseTimeMs: number;
}

export interface WebhookEndpointWithSecret extends WebhookEndpoint {
  /** The signing secret; store it now, it is not shown again. */
  secret: string;
}

export interface WebhookEndpointCreateParams {
  url: string;
  description?: string;
  events: WebhookEventType[];
  /** Sent with every delivery. */
  customHeaders?: { key: string; value: string }[];
  /** Up to 300. */
  timeoutSeconds?: number;
  /** 0 to 20. */
  maxRetries?: number;
}

export interface WebhookEndpointUpdateParams {
  url?: string;
  description?: string | null;
  events?: WebhookEventType[];
  isActive?: boolean;
  customHeaders?: { key: string; value: string }[] | null;
  timeoutSeconds?: number;
  maxRetries?: number;
}

export interface WebhookEndpointStatistics {
  totalEndpoints: number;
  activeEndpoints: number;
  inactiveEndpoints: number;
  /** Active endpoints below 95% success. */
  failingEndpoints: number;
  totalDeliveries: number;
  overallSuccessRate: number;
}

export interface WebhookDeliveryAttempt {
  id: string;
  webhookDeliveryId: string;
  attemptNumber: number;
  httpStatusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  attemptedAt: Timestamp;
}

/**
 * One event sent to one endpoint, with its attempts. Mirrors `WebhookDeliveryTransformer`.
 */
export interface WebhookDelivery {
  id: string;
  webhookEndpointId: string;
  type: WebhookEventType;
  /** The event's `data`. */
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  httpStatusCode: number | null;
  errorMessage: string | null;
  responseBody: string | null;
  nextRetryAt: Timestamp | null;
  deliveredAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  attempts?: WebhookDeliveryAttempt[];
  endpoint?: WebhookEndpoint;
}

export interface WebhookDeliveryListParams extends CursorPageParams {
  webhookEndpointId?: string;
  status?: WebhookDeliveryStatus[];
  type?: WebhookEventType;
  /** Load each delivery's attempts. */
  includeAttempts?: boolean;
}

/**
 * Webhook endpoints: where the API sends events
 *
 * Requires the `webhooks:read` scope to read and `webhooks:write` to change.
 */
export class WebhookEndpoints extends APIResource {
  /**
   * Register an endpoint
   *
   * @param params - The URL and the events to send it
   * @param options - Request options
   * @returns The endpoint with its signing secret, which is not shown again
   */
  create(
    params: WebhookEndpointCreateParams,
    options?: RequestOptions,
  ): APIPromise<WebhookEndpointWithSecret> {
    return this.request('POST', '/webhook-endpoints', { body: params, options });
  }

  /**
   * Fetch an endpoint with its delivery statistics
   *
   * @param endpointId - The endpoint
   * @param options - Request options
   * @returns The endpoint
   */
  retrieve(endpointId: string, options?: RequestOptions): APIPromise<WebhookEndpointDetail> {
    return this.request('GET', this.path`/webhook-endpoints/${endpointId}`, { options });
  }

  /**
   * Change an endpoint
   *
   * @param endpointId - The endpoint
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated endpoint
   */
  update(
    endpointId: string,
    params: WebhookEndpointUpdateParams,
    options?: RequestOptions,
  ): APIPromise<WebhookEndpoint> {
    return this.request(
      'PATCH',
      this.path`/webhook-endpoints/${endpointId}`,
      { body: params, options },
      (data: { endpoint: WebhookEndpoint }) => data.endpoint,
    );
  }

  /**
   * List endpoints, with each one's delivery count and success rate
   *
   * @param params - Page and page size (10 by default)
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every endpoint
   */
  list(
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<WebhookEndpointListItem>, WebhookEndpointListItem> {
    return this.offsetList('/webhook-endpoints', { query: params, options });
  }

  /**
   * Delete an endpoint
   *
   * @param endpointId - The endpoint
   * @param options - Request options
   * @returns A promise that resolves once the endpoint is deleted
   */
  delete(endpointId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/webhook-endpoints/${endpointId}`, { options });
  }

  /**
   * Count the organization's endpoints and their deliveries
   *
   * @param options - Request options
   * @returns The counts
   */
  statistics(options?: RequestOptions): APIPromise<WebhookEndpointStatistics> {
    return this.request('GET', '/webhook-endpoints/statistics', { options });
  }

  /**
   * Send the endpoint a `test.event` delivery
   *
   * @param endpointId - The endpoint
   * @param options - Request options
   * @returns A promise that resolves once the delivery is queued
   */
  test(endpointId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('POST', this.path`/webhook-endpoints/${endpointId}/test`, { options });
  }

  /**
   * Replace an endpoint's signing secret; the old one stops working at once
   *
   * @param endpointId - The endpoint
   * @param options - Request options
   * @returns The new secret, which is not shown again
   */
  regenerateSecret(endpointId: string, options?: RequestOptions): APIPromise<{ secret: string }> {
    return this.request('POST', this.path`/webhook-endpoints/${endpointId}/regenerate-secret`, {
      options,
    });
  }
}

/**
 * Webhook deliveries: every event sent to an endpoint, newest first
 *
 * Requires the `webhooks:read` scope to read and `webhooks:write` to retry.
 */
export class WebhookDeliveries extends APIResource {
  /**
   * List deliveries
   *
   * @param params - Endpoint, status, event and cursor
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every delivery
   */
  list(
    params: WebhookDeliveryListParams = {},
    options?: RequestOptions,
  ): PagePromise<CursorPage<WebhookDelivery>, WebhookDelivery> {
    return this.cursorList('/webhook-deliveries', { query: params, options });
  }

  /**
   * Fetch a delivery with its attempts
   *
   * @param deliveryId - The delivery
   * @param options - Request options
   * @returns The delivery
   */
  retrieve(deliveryId: string, options?: RequestOptions): APIPromise<WebhookDelivery> {
    return this.request('GET', this.path`/webhook-deliveries/${deliveryId}`, { options });
  }

  /**
   * Send a delivery again, for example after fixing the receiver
   *
   * @param deliveryId - The delivery
   * @param options - Request options
   * @returns A promise that resolves once the retry is queued
   */
  retry(deliveryId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('POST', this.path`/webhook-deliveries/${deliveryId}/retry`, {
      options,
    });
  }
}
