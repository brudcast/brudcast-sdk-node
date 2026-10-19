import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions, Transport } from '../../core/transport';
import type {
  CampaignJourney,
  CampaignRecipientMetrics,
  CampaignReportsOverview,
  CampaignStatus,
  CampaignTrendPoint,
  ReportDateRange,
  Trend,
} from '../campaigns/types';
import type { BounceClassification, BounceClassificationParams } from '../messages/types';
import type { CampaignChannel, Timestamp } from '../shared';

/**
 * Report types. Replies mirror `ReportService`, `CampaignConversionService`,
 * `TrackingEventService` and the dashboard services; report exports mirror
 * `ReportExportTransformer` and `app/validators/report_validator.ts`.
 */

export interface ChannelComparisonRow {
  channel: CampaignChannel;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unconfirmed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface ReportsOverview {
  kpis: CampaignReportsOverview & { totalRevenue: number; totalConversions: number };
  emailKpis: CampaignReportsOverview;
  performanceTrend: CampaignTrendPoint[];
  channelComparison: ChannelComparisonRow[];
  channelReach: {
    channel: CampaignChannel;
    /** The audience the channel was sent to, or null when not measured. */
    targeted: number | null;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  }[];
  topCampaigns: {
    id: string;
    name: string;
    channels: CampaignChannel[];
    sentAt: string | null;
    sent: number;
    delivered: number;
    openRate: number;
    clickRate: number;
    revenue: number;
  }[];
  recipients: CampaignRecipientMetrics;
  journey: CampaignJourney;
}

export interface EngagementReport {
  kpis: {
    avgOpenRate: number;
    avgClickRate: number;
    /** Click-to-open rate. */
    ctor: number;
    trends: { opened: Trend; clicked: Trend };
  };
  ratesTrend: { date: string; openRate: number; clickRate: number }[];
  /** Opens by hour (0 to 23) for each day of the week. */
  bestSendTimes: { day: string; hours: number[] }[];
  deviceBreakdown: { name: string; value: number }[];
  topClickedLinks: { url: string; clicks: number; uniqueClicks: number; ctr: number }[];
}

export interface DeliverabilityReport {
  kpis: {
    inboxPlacementRate: number;
    bounceRate: number;
    complaintRate: number;
    blacklistStatus: 'listed' | 'clean' | 'unknown';
    totalSent: number;
    totalDelivered: number;
    totalBounced: number;
    totalUnconfirmed: number;
    trends: CampaignReportsOverview['trends'] & { bounceRate: Trend; complaintRate: Trend };
  };
  inboxPlacementTrend: { date: string; inboxRate: number; sent: number; delivered: number }[];
  bounceBreakdown: { hardBounced: number; softBounced: number; totalBounced: number };
  domainReputation: { domain: string; blacklistsListed: number; blacklistsChecked: number }[];
  blacklistChecks: {
    domain: string;
    blacklist: string;
    status: 'listed' | 'clean';
    response: string | null;
    checkedAt: string;
  }[];
}

export interface ChannelPerformanceReport {
  totals: CampaignReportsOverview;
  comparison: ChannelComparisonRow[];
  channels: {
    channel: CampaignChannel;
    kpis: CampaignReportsOverview;
    topCampaigns: {
      id: string;
      name: string;
      sent: number;
      delivered: number;
      openRate: number;
      clickRate: number;
    }[];
  }[];
}

export interface RevenueAttributionReport {
  overview: {
    totalRevenue: number;
    totalConversions: number;
    avgOrderValue: number;
    revenuePerEmail: number;
    trends: { revenue: Trend; conversions: Trend };
  };
  trend: { date: string; revenue: number }[];
  byChannel: { channel: string; revenue: number }[];
  topCampaigns: {
    name: string;
    revenue: number;
    conversions: number;
    avgOrderValue: number;
    conversionRate: number;
  }[];
}

export type ReportType =
  | 'campaigns'
  | 'channel_performance'
  | 'engagement'
  | 'deliverability'
  | 'revenue_attribution'
  | 'voice_calls';

/**
 * A report rendered to a file in the background
 */
export interface ReportExport {
  id: string;
  organizationId: string;
  campaignId: string | null;
  reportType: ReportType;
  format: 'csv' | 'pdf';
  status: 'processing' | 'ready' | 'failed';
  fromDate: string | null;
  toDate: string | null;
  fileSize: string | null;
  /** The file's storage path once ready; use `download` for a link. */
  downloadUrl: string | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

export type ReportExportCreateParams =
  | {
      reportType: Exclude<ReportType, 'voice_calls'>;
      format: 'csv' | 'pdf';
      /** ISO date. */
      fromDate: string;
      /** ISO date. */
      toDate: string;
      campaignId?: string;
    }
  | {
      reportType: 'voice_calls';
      format: 'csv' | 'pdf';
      campaignId: string;
      fromDate?: string;
      toDate?: string;
    };

export interface DashboardStats {
  messagesSent: number;
  sentByChannel: { channel: CampaignChannel; sent: number }[];
  activeSubscribers: number;
  deliveryRate: number | null;
}

export interface DashboardOverview {
  sendVolume: {
    series: { date: string; byChannel: Partial<Record<CampaignChannel, number>>; total: number }[];
    channels: CampaignChannel[];
    weekTotal: number;
    previousWeekTotal: number;
  };
  recentCampaigns: {
    id: string;
    name: string;
    status: CampaignStatus;
    sentAt: string | null;
    openRate: number | null;
    clickRate: number | null;
  }[];
  insights: {
    key: 'open_rate_trend' | 'bounce_rate_high' | 'unengaged_subscribers' | (string & {});
    severity: 'info' | 'warning' | 'suggestion';
    title: string;
    message: string;
    href: string | null;
  }[];
}

/**
 * Cross-campaign reports
 *
 * Requires the `analytics:read` scope to read and `analytics:write` to start an export.
 */
export class Reports extends APIResource {
  readonly exports: ReportExports;

  constructor(transport: Transport) {
    super(transport);
    this.exports = new ReportExports(transport);
  }

  /**
   * Headline figures across channels, with trends, top campaigns and recipient reach
   *
   * @param params - The date range
   * @param options - Request options
   * @returns The overview
   */
  overview(params: ReportDateRange = {}, options?: RequestOptions): APIPromise<ReportsOverview> {
    return this.request('GET', '/reports/overview', { query: params, options });
  }

  /**
   * Email engagement: rates, best send times, devices and top links
   *
   * @param params - The date range
   * @param options - Request options
   * @returns The engagement report
   */
  engagement(params: ReportDateRange = {}, options?: RequestOptions): APIPromise<EngagementReport> {
    return this.request('GET', '/reports/engagement', { query: params, options });
  }

  /**
   * Email deliverability: inbox placement, bounces, complaints and blacklists
   *
   * @param params - The date range
   * @param options - Request options
   * @returns The deliverability report
   */
  deliverability(
    params: ReportDateRange = {},
    options?: RequestOptions,
  ): APIPromise<DeliverabilityReport> {
    return this.request('GET', '/reports/deliverability', { query: params, options });
  }

  /**
   * Figures per channel, with each channel's top campaigns
   *
   * @param params - The date range
   * @param options - Request options
   * @returns The channel report
   */
  channelPerformance(
    params: ReportDateRange = {},
    options?: RequestOptions,
  ): APIPromise<ChannelPerformanceReport> {
    return this.request('GET', '/reports/channel-performance', { query: params, options });
  }

  /**
   * Revenue attributed to campaigns
   *
   * @param params - The date range
   * @param options - Request options
   * @returns The revenue report
   */
  revenueAttribution(
    params: ReportDateRange = {},
    options?: RequestOptions,
  ): APIPromise<RevenueAttributionReport> {
    return this.request('GET', '/reports/revenue-attribution', { query: params, options });
  }

  /**
   * Group email or SMS failures by class and category
   *
   * @param params - The channel, date range and filters
   * @param options - Request options
   * @returns The classification
   */
  bounceClassification(
    params: BounceClassificationParams = {},
    options?: RequestOptions,
  ): APIPromise<BounceClassification> {
    return this.request('GET', '/reports/bounce-classification', { query: params, options });
  }
}

/**
 * Report exports: a report rendered to a CSV or PDF in the background
 */
export class ReportExports extends APIResource {
  /**
   * Start an export
   *
   * @param params - The report, format and range; a voice report takes a campaign instead
   * @param options - Request options
   * @returns The export, which runs in the background
   */
  create(params: ReportExportCreateParams, options?: RequestOptions): APIPromise<ReportExport> {
    return this.request('POST', '/reports/exports', { body: params, options });
  }

  /**
   * Fetch an export, to follow its progress
   *
   * @param exportId - The export
   * @param options - Request options
   * @returns The export
   */
  retrieve(exportId: string, options?: RequestOptions): APIPromise<ReportExport> {
    return this.request('GET', this.path`/reports/exports/${exportId}`, { options });
  }

  /**
   * List exports, newest first
   *
   * @param params - Page and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every export
   */
  list(
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ReportExport>, ReportExport> {
    return this.offsetList('/reports/exports', { query: params, options });
  }

  /**
   * Get a link to a ready export's file
   *
   * The link is signed and short-lived; fetch it without an `Authorization` header. An export
   * that is not ready fails, so poll `retrieve` until its `status` is `ready` first.
   *
   * @param exportId - The export
   * @param options - Request options
   * @returns The signed URL
   */
  download(exportId: string, options?: RequestOptions): APIPromise<{ url: string }> {
    return this.request('GET', this.path`/reports/exports/${exportId}/download`, { options });
  }
}

/**
 * The dashboard's home-screen figures
 *
 * Requires the `analytics:read` scope.
 */
export class Dashboard extends APIResource {
  /**
   * Messages sent, active subscribers and delivery rate
   *
   * @param options - Request options
   * @returns The figures
   */
  stats(options?: RequestOptions): APIPromise<DashboardStats> {
    return this.request('GET', '/dashboard/stats', { options });
  }

  /**
   * The week's send volume, recent campaigns and suggested actions
   *
   * @param options - Request options
   * @returns The overview
   */
  overview(options?: RequestOptions): APIPromise<DashboardOverview> {
    return this.request('GET', '/dashboard/overview', { options });
  }
}
