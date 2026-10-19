import type { APIPromise } from '../../core/api-promise';
import type { CursorPage, CursorPageMeta, OffsetPage, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions, Transport } from '../../core/transport';
import type {
  Campaign,
  CampaignAnswers,
  CampaignCreateParams,
  CampaignCreditEstimate,
  CampaignEstimateRecipientsParams,
  CampaignJourney,
  CampaignListParams,
  CampaignPerformance,
  CampaignPerformanceParams,
  CampaignReadiness,
  CampaignRecipientEstimate,
  CampaignRecipientMetrics,
  CampaignRecipientSource,
  CampaignReportParams,
  CampaignReportsOverview,
  CampaignSendParams,
  CampaignStatisticsReport,
  CampaignStatisticsSummary,
  CampaignTestSendParams,
  CampaignTrendParams,
  CampaignTrendPoint,
  CampaignUpdateParams,
  CampaignWhatsappPreview,
  ReportDateRange,
} from './types';

/**
 * Campaigns: one message sent to an audience on one or more channels
 *
 * Requires the `campaigns:read` scope to read and `campaigns:write` to change or send. Actions
 * that only read but are sent as `POST` (`preview`, `previewWhatsapp`, `estimateRecipients`)
 * need `campaigns:write` too.
 */
export class Campaigns extends APIResource {
  readonly reports: CampaignReports;

  constructor(transport: Transport) {
    super(transport);
    this.reports = new CampaignReports(transport);
  }

  /**
   * Create a draft campaign
   *
   * @param params - The campaign, its audience and its content per channel
   * @param options - Request options
   * @returns The new campaign
   */
  create(params: CampaignCreateParams, options?: RequestOptions): APIPromise<Campaign> {
    return this.request('POST', '/campaigns', { body: params, options });
  }

  /**
   * Fetch a campaign with its content, audience, settings and statistics
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The campaign
   */
  retrieve(campaignId: string, options?: RequestOptions): APIPromise<Campaign> {
    return this.request('GET', this.path`/campaigns/${campaignId}`, { options });
  }

  /**
   * Change a draft campaign
   *
   * @param campaignId - The campaign
   * @param params - The fields to change; a content object updates only the keys it has
   * @param options - Request options
   * @returns The updated campaign
   */
  update(
    campaignId: string,
    params: CampaignUpdateParams,
    options?: RequestOptions,
  ): APIPromise<Campaign> {
    return this.request('PATCH', this.path`/campaigns/${campaignId}`, { body: params, options });
  }

  /**
   * List campaigns
   *
   * @param params - Filters, sort and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every campaign
   */
  list(
    params: CampaignListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<Campaign>, Campaign> {
    return this.offsetList('/campaigns', { query: params, options });
  }

  /**
   * Delete a campaign
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns A promise that resolves once the campaign is deleted
   */
  delete(campaignId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/campaigns/${campaignId}`, { options });
  }

  /**
   * Delete several campaigns at once
   *
   * @param params - The campaign ids
   * @param options - Request options
   * @returns A promise that resolves once they are deleted
   */
  bulkDelete(params: { ids: string[] }, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('POST', '/campaigns/bulk-delete', { body: params, options });
  }

  /**
   * Archive several campaigns at once
   *
   * @param params - The campaign ids
   * @param options - Request options
   * @returns A promise that resolves once they are archived
   */
  bulkArchive(params: { ids: string[] }, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('POST', '/campaigns/bulk-archive', { body: params, options });
  }

  /**
   * Summarise the organization's campaigns
   *
   * @param options - Request options
   * @returns The campaign counts and average rates
   */
  statistics(options?: RequestOptions): APIPromise<CampaignStatisticsSummary> {
    return this.request('GET', '/campaigns/statistics', { options });
  }

  /**
   * Count the recipients an audience would reach per channel, and what sending would cost
   *
   * @param params - The audience, the channels and optionally the SMS body or voice flow to price
   * @param options - Request options
   * @returns The counts and the credit estimate
   */
  estimateRecipients(
    params: CampaignEstimateRecipientsParams,
    options?: RequestOptions,
  ): APIPromise<CampaignRecipientEstimate> {
    return this.request('POST', '/campaigns/estimate-recipients', { body: params, options });
  }

  /**
   * List the lists, segments and contacts a campaign is sent to or excludes
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The recipient sources
   */
  recipients(campaignId: string, options?: RequestOptions): APIPromise<CampaignRecipientSource[]> {
    return this.request('GET', this.path`/campaigns/${campaignId}/recipients`, { options });
  }

  /**
   * Check whether a campaign can be sent, and what is missing if not
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The unmet requirements per channel
   */
  readiness(campaignId: string, options?: RequestOptions): APIPromise<CampaignReadiness> {
    return this.request('GET', this.path`/campaigns/${campaignId}/readiness`, { options });
  }

  /**
   * Estimate what sending a campaign would cost in credits
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The cost per channel and the wallet's balance
   */
  creditEstimate(campaignId: string, options?: RequestOptions): APIPromise<CampaignCreditEstimate> {
    return this.request('GET', this.path`/campaigns/${campaignId}/credit-estimate`, { options });
  }

  /**
   * Send a campaign now or schedule it
   *
   * A campaign that is not ready fails with `BadRequestError` and code
   * `E_CAMPAIGN_NOT_SENDABLE`, whose `errors` lists what is missing. Sending twice fails the
   * same way, so a retried send cannot send twice.
   *
   * @param campaignId - The campaign
   * @param params - Now, or a time to send at
   * @param options - Request options
   * @returns The campaign, now sending or scheduled
   */
  send(
    campaignId: string,
    params: CampaignSendParams,
    options?: RequestOptions,
  ): APIPromise<Campaign> {
    return this.request('POST', this.path`/campaigns/${campaignId}/send`, {
      body: params,
      options,
    });
  }

  /**
   * Pause a sending campaign
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The paused campaign
   */
  pause(campaignId: string, options?: RequestOptions): APIPromise<Campaign> {
    return this.request('POST', this.path`/campaigns/${campaignId}/pause`, { options });
  }

  /**
   * Resume a paused campaign
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The resumed campaign
   */
  resume(campaignId: string, options?: RequestOptions): APIPromise<Campaign> {
    return this.request('POST', this.path`/campaigns/${campaignId}/resume`, { options });
  }

  /**
   * Cancel a scheduled or sending campaign
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The cancelled campaign
   */
  cancel(campaignId: string, options?: RequestOptions): APIPromise<Campaign> {
    return this.request('POST', this.path`/campaigns/${campaignId}/cancel`, { options });
  }

  /**
   * Copy a campaign into a new draft
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The new draft
   */
  duplicate(campaignId: string, options?: RequestOptions): APIPromise<Campaign> {
    return this.request('POST', this.path`/campaigns/${campaignId}/duplicate`, { options });
  }

  /**
   * Render a campaign's email as a recipient would see it
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The rendered HTML
   */
  preview(campaignId: string, options?: RequestOptions): APIPromise<{ html: string }> {
    return this.request('POST', this.path`/campaigns/${campaignId}/preview`, { options });
  }

  /**
   * Render a campaign's WhatsApp template with its variables
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The rendered template and any variables without a value
   */
  previewWhatsapp(
    campaignId: string,
    options?: RequestOptions,
  ): APIPromise<CampaignWhatsappPreview> {
    return this.request('POST', this.path`/campaigns/${campaignId}/preview/whatsapp`, { options });
  }

  /**
   * Send a campaign's email to one address, or its push notification to one device
   *
   * @param campaignId - The campaign
   * @param params - The address or device
   * @param options - Request options
   * @returns The push test's id, when a push test was sent
   */
  testSend(
    campaignId: string,
    params: CampaignTestSendParams,
    options?: RequestOptions,
  ): APIPromise<{ pushTestSendId: string | null }> {
    return this.request('POST', this.path`/campaigns/${campaignId}/test-send`, {
      body: params,
      options,
    });
  }
}

/**
 * Campaign reporting, across campaigns and for one campaign
 */
export class CampaignReports extends APIResource {
  /**
   * Total and average delivery figures across campaigns, with trends against the previous period
   *
   * @param params - The date range and channel
   * @param options - Request options
   * @returns The overview
   */
  overview(
    params: CampaignReportParams = {},
    options?: RequestOptions,
  ): APIPromise<CampaignReportsOverview> {
    return this.request('GET', '/campaigns/reports/overview', { query: params, options });
  }

  /**
   * Delivery figures per day, week or month across campaigns
   *
   * @param params - The date range, channel and granularity
   * @param options - Request options
   * @returns One point per period
   */
  trends(
    params: CampaignTrendParams = {},
    options?: RequestOptions,
  ): APIPromise<CampaignTrendPoint[]> {
    return this.request('GET', '/campaigns/reports/trends', { query: params, options });
  }

  /**
   * Delivery figures per campaign, newest first
   *
   * @param params - The date range, cursor and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every campaign
   */
  performance(
    params: CampaignPerformanceParams = {},
    options?: RequestOptions,
  ): PagePromise<
    CursorPage<CampaignPerformance, CursorPageMeta & { limit: number }>,
    CampaignPerformance
  > {
    return this.cursorList('/campaigns/reports/performance', { query: params, options });
  }

  /**
   * A campaign's statistics, with the call outcomes of a voice campaign
   *
   * @param campaignId - The campaign
   * @param options - Request options
   * @returns The statistics
   */
  statistics(campaignId: string, options?: RequestOptions): APIPromise<CampaignStatisticsReport> {
    return this.request('GET', this.path`/campaigns/${campaignId}/statistics`, { options });
  }

  /**
   * How many of a campaign's recipients were reached, engaged and clicked
   *
   * @param campaignId - The campaign
   * @param params - The date range
   * @param options - Request options
   * @returns The recipient counts
   */
  recipients(
    campaignId: string,
    params: ReportDateRange = {},
    options?: RequestOptions,
  ): APIPromise<CampaignRecipientMetrics> {
    return this.request('GET', this.path`/campaigns/${campaignId}/report/recipients`, {
      query: params,
      options,
    });
  }

  /**
   * Which channel reached a multichannel campaign's recipients first, and the paths they took
   *
   * @param campaignId - The campaign
   * @param params - The date range
   * @param options - Request options
   * @returns The channel shares and paths
   */
  journey(
    campaignId: string,
    params: ReportDateRange = {},
    options?: RequestOptions,
  ): APIPromise<CampaignJourney> {
    return this.request('GET', this.path`/campaigns/${campaignId}/report/journey`, {
      query: params,
      options,
    });
  }

  /**
   * How a voice campaign's contacts answered each question
   *
   * @param campaignId - The voice campaign
   * @param options - Request options
   * @returns The answers per question
   */
  answers(campaignId: string, options?: RequestOptions): APIPromise<CampaignAnswers> {
    return this.request('GET', this.path`/campaigns/${campaignId}/report/answers`, { options });
  }
}
