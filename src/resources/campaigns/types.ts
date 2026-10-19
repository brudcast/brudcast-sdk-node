/**
 * Campaign types. Replies mirror `CampaignTransformer` and its content, settings, recipient, A/B
 * test and statistics transformers, and the campaign action, preview, recipient, statistics and
 * voice report services; requests mirror `app/validators/campaign_validator.ts`.
 */
import type { CursorPageParams, OffsetPageParams } from '../../core/pagination';
import type {
  InAppAudience,
  InAppDesign,
  InAppDisplayRules,
  InAppFormat,
  InAppInboxSettings,
  InAppTrigger,
  VoiceFlow,
} from '../content';
import type { CampaignChannel, SortOrder, Timestamp } from '../shared';

export type CampaignStatus =
  'draft' | 'scheduled' | 'sending' | 'sent' | 'completed' | 'paused' | 'cancelled';
export type CampaignType = 'regular' | 'ab_test';
export type CampaignEditorMode = 'visual' | 'html' | 'plain';
export type WhatsappCategory = 'marketing' | 'utility' | 'authentication';
export type PushPriority = 'normal' | 'high';

/** Recipients per channel. */
export type ChannelReach = Partial<Record<CampaignChannel, number>>;

export interface CampaignBrief {
  goal: string;
  tone?: string | null;
}

export interface CampaignEmailContent {
  id: string;
  campaignId: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  subject: string;
  previewText: string | null;
  htmlContent: string | null;
  plainTextContent: string | null;
  editorMode: CampaignEditorMode;
  /** The visual editor's document. */
  builderData: Record<string, unknown> | null;
}

export interface CampaignSmsContent {
  id: string;
  campaignId: string;
  body: string;
  senderId: string;
}

export interface CampaignWhatsappContent {
  id: string;
  campaignId: string;
  whatsappTemplateId: string | null;
  templateName: string;
  languageCode: string;
  category: WhatsappCategory;
  variables: Record<string, string> | null;
  headerMediaUrl: string | null;
  bodyPreview: string | null;
  phoneNumberId: string | null;
  senderId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  whatsappTemplate?: {
    id: string;
    whatsappBusinessAccountId: string;
    name: string;
    language: string;
    status: string;
    variableCount: number;
    hasHeaderMedia: boolean;
  };
}

export interface CampaignPushContent {
  id: string;
  campaignId: string;
  title: string;
  body: string;
  imageUrl: string | null;
  clickUrl: string | null;
  /** The push applications to send through; null for the default one. */
  pushApplicationIds: string[] | null;
  data: Record<string, string> | null;
  ttlSeconds: number | null;
  priority: PushPriority;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CampaignVoiceContent {
  id: string;
  campaignId: string;
  callerId: string;
  flow: VoiceFlow;
  /** `HH:MM` in the contact's time zone. */
  callingWindowStart: string;
  callingWindowEnd: string;
  retryAttempts: number;
  retryIntervalMinutes: number;
  maxConcurrentCalls: number | null;
}

export interface CampaignInAppContent {
  id: string;
  campaignId: string;
  format: InAppFormat;
  design: InAppDesign;
  editorMode: CampaignEditorMode;
  trigger: InAppTrigger;
  displayRules: InAppDisplayRules;
  inbox: InAppInboxSettings;
  inAppApplicationIds: string[] | null;
  audience: InAppAudience;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CampaignSettings {
  id: string;
  campaignId: string;
  trackOpens: boolean;
  trackClicks: boolean;
  utmEnabled: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  includeUnsubLink: boolean;
  footerText: string | null;
}

export interface CampaignRecipientSource {
  id: string;
  campaignId: string;
  sourceType: 'list' | 'segment' | 'contact';
  sourceId: string;
  sourceName: string | null;
  isExcluded: boolean;
}

export interface CampaignAbTestVariant {
  id: string;
  abTestId: string;
  variantLabel: string;
  subject: string | null;
  htmlContent: string | null;
  sendTime: Timestamp | null;
  isWinner: boolean;
}

export interface CampaignAbTest {
  id: string;
  campaignId: string;
  variable: 'subject' | 'content' | 'send_time';
  variantCount: number;
  winnerCriteria: 'open_rate' | 'click_rate';
  testDurationHrs: number;
  samplePercent: number;
  variants?: CampaignAbTestVariant[];
}

export interface CampaignDeliveryCounts {
  sent: number;
  delivered: number;
  opened: number;
  uniqueOpened: number;
  clicked: number;
  uniqueClicked: number;
  bounced: number;
  hardBounced: number;
  softBounced: number;
  unsubscribed: number;
  complained: number;
  suppressed: number;
  failed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

export interface CampaignStatistics extends CampaignDeliveryCounts {
  id: string;
  campaignId: string;
  audienceSize: number | null;
  channelReach: ChannelReach | null;
}

export interface CampaignChannelStatistics extends CampaignDeliveryCounts {
  id: string;
  campaignId: string;
  channel: CampaignChannel;
  status: CampaignStatus | null;
  /** Why the channel stopped early. */
  stopReason: 'credits_exhausted' | null;
  stoppedAt: Timestamp | null;
  statusReason: string | null;
  snapshotAt: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A campaign. The content, settings, recipients, A/B test and statistics are present when the
 * API loaded them, which `retrieve` does.
 */
export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  status: CampaignStatus;
  type: CampaignType;
  channels: CampaignChannel[];
  tags: string[];
  brief: CampaignBrief | null;
  estimatedRecipients: number;
  channelReach: ChannelReach | null;
  scheduledAt: Timestamp | null;
  sentAt: Timestamp | null;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  emailContent?: CampaignEmailContent | null;
  smsContent?: CampaignSmsContent | null;
  whatsappContent?: CampaignWhatsappContent | null;
  pushContent?: CampaignPushContent | null;
  voiceContent?: CampaignVoiceContent | null;
  inAppContent?: CampaignInAppContent | null;
  recipients?: CampaignRecipientSource[];
  settings?: CampaignSettings | null;
  abTest?: CampaignAbTest | null;
  statistics?: CampaignStatistics | null;
  channelStatistics?: CampaignChannelStatistics[];
}

/**
 * Who a campaign goes to: lists, segments and single contacts, minus exclusions
 */
export interface CampaignRecipientSelection {
  listIds?: string[];
  segmentIds?: string[];
  contactIds?: string[];
  excludeListIds?: string[];
  excludeSegmentIds?: string[];
  excludeContactIds?: string[];
}

export interface CampaignEmailContentParams {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  subject: string;
  previewText?: string;
  htmlContent?: string;
  plainTextContent?: string;
  editorMode: CampaignEditorMode;
  builderData?: Record<string, unknown>;
  /** Save the sender as one of the organization's sender identities. */
  saveSenderIdentity?: boolean;
}

export interface CampaignWhatsappContentParams {
  whatsappTemplateId?: string;
  /** Required without `whatsappTemplateId`. */
  templateName?: string;
  languageCode?: string;
  category?: WhatsappCategory;
  /** Template variables by position or name. */
  variables?: Record<string, string>;
  headerMediaUrl?: string;
  bodyPreview?: string;
  phoneNumberId?: string;
  senderId?: string;
}

export interface CampaignPushContentParams {
  title: string;
  body: string;
  imageUrl?: string;
  clickUrl?: string;
  pushApplicationIds?: string[] | null;
  /** Up to 20 keys. The whole notification must fit FCM's 4 KB limit. */
  data?: Record<string, string> | null;
  /** Up to 28 days. */
  ttlSeconds?: number | null;
  priority?: PushPriority;
}

export interface CampaignVoiceContentParams {
  callerId?: string;
  flow?: VoiceFlow;
  /** `HH:MM`. */
  callingWindowStart?: string;
  /** `HH:MM`. */
  callingWindowEnd?: string;
  /** 0 to 3. */
  retryAttempts?: number;
  /** 30 to 1440. */
  retryIntervalMinutes?: number;
  /** 1 to 200. */
  maxConcurrentCalls?: number | null;
}

export interface CampaignInAppContentParams {
  format?: InAppFormat;
  design?: InAppDesign;
  editorMode?: 'visual';
  trigger?: InAppTrigger;
  displayRules?: InAppDisplayRules;
  inbox?: InAppInboxSettings;
  inAppApplicationIds?: string[] | null;
  audience?: InAppAudience;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface CampaignSettingsParams {
  trackOpens?: boolean;
  trackClicks?: boolean;
  utmEnabled?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  includeUnsubLink?: boolean;
  footerText?: string;
}

export interface CampaignAbTestVariantParams {
  variantLabel: string;
  subject?: string;
  htmlContent?: string;
  sendTime?: string;
}

export interface CampaignAbTestParams {
  variable: 'subject' | 'content' | 'send_time';
  /** 2 to 4. */
  variantCount: number;
  winnerCriteria: 'open_rate' | 'click_rate';
  testDurationHrs: number;
  /** 1 to 100. */
  samplePercent: number;
  variants: CampaignAbTestVariantParams[];
}

export interface CampaignCreateParams {
  /** 1 to 255 characters. */
  name: string;
  type: CampaignType;
  channels: CampaignChannel[];
  tags?: string[];
  brief?: CampaignBrief | null;
  recipients?: CampaignRecipientSelection;
  emailContent?: CampaignEmailContentParams;
  smsContent?: { body: string; senderId: string };
  whatsappContent?: CampaignWhatsappContentParams;
  pushContent?: CampaignPushContentParams;
  voiceContent?: CampaignVoiceContentParams;
  inAppContent?: CampaignInAppContentParams;
  settings?: CampaignSettingsParams;
  abTest?: CampaignAbTestParams;
}

type Nullable<T> = { [K in keyof T]?: T[K] | null };

export interface CampaignUpdateParams {
  name?: string;
  channels?: CampaignChannel[];
  tags?: string[] | null;
  brief?: CampaignBrief | null;
  recipients?: CampaignRecipientSelection;
  emailContent?: Partial<
    Pick<
      CampaignEmailContentParams,
      'fromName' | 'fromEmail' | 'subject' | 'editorMode' | 'saveSenderIdentity'
    >
  > &
    Nullable<
      Pick<
        CampaignEmailContentParams,
        'replyTo' | 'previewText' | 'htmlContent' | 'plainTextContent'
      >
    > & {
      builderData?: Record<string, unknown> | null;
    };
  smsContent?: { body?: string; senderId?: string };
  whatsappContent?: Partial<
    Pick<CampaignWhatsappContentParams, 'templateName' | 'languageCode' | 'category'>
  > &
    Nullable<
      Pick<
        CampaignWhatsappContentParams,
        | 'whatsappTemplateId'
        | 'variables'
        | 'headerMediaUrl'
        | 'bodyPreview'
        | 'phoneNumberId'
        | 'senderId'
      >
    >;
  pushContent?: Partial<Pick<CampaignPushContentParams, 'title' | 'body' | 'priority'>> &
    Nullable<
      Pick<
        CampaignPushContentParams,
        'imageUrl' | 'clickUrl' | 'pushApplicationIds' | 'data' | 'ttlSeconds'
      >
    >;
  voiceContent?: CampaignVoiceContentParams;
  inAppContent?: CampaignInAppContentParams;
  settings?: Pick<
    CampaignSettingsParams,
    'trackOpens' | 'trackClicks' | 'utmEnabled' | 'includeUnsubLink'
  > &
    Nullable<
      Pick<CampaignSettingsParams, 'utmSource' | 'utmMedium' | 'utmCampaign' | 'footerText'>
    >;
  abTest?: Partial<Omit<CampaignAbTestParams, 'variants'>> & {
    variants?: CampaignAbTestVariantParams[];
  };
}

export interface CampaignListParams extends OffsetPageParams {
  status?: CampaignStatus;
  type?: CampaignType;
  channel?: CampaignChannel;
  search?: string;
  /** ISO date; campaigns created from. */
  from?: string;
  /** ISO date; campaigns created until. */
  to?: string;
  /** The field to sort by, such as `createdAt` or `name`. */
  sort?: string;
  order?: SortOrder;
}

export interface CampaignStatisticsSummary {
  totalCampaigns: number;
  activeCampaigns: number;
  avgOpenRate: number;
  avgClickRate: number;
}

export type CampaignSendParams =
  | { sendOption: 'now' }
  | {
      sendOption: 'schedule';
      /** ISO 8601 time to send at. */
      scheduledAt: string;
    };

export interface CampaignTestSendParams {
  /** Sends the email content to this address. */
  testEmail?: string;
  /** Sends the push content to one device. */
  push?: { applicationId: string; deviceToken: string };
}

export interface CampaignSendRequirement {
  channel: string;
  /** What is missing, such as `verified_domain` or `sender_id`. */
  requirement: string;
  message: string;
}

export interface CampaignReadiness {
  requirements: CampaignSendRequirement[];
  sendable: boolean;
}

export interface CampaignRateLine {
  countryCode: string;
  recipients: number;
  credits: number;
  /** SMS only. */
  segments?: number;
  ratePerSegment?: number;
  /** Voice only. */
  minutes?: number;
  ratePerMinute?: number;
}

export interface CampaignCreditEstimate {
  lines: {
    channel: CampaignChannel;
    rateCredits: number;
    estimatedRecipients: number;
    credits: number;
    /** Whether bonus credits can pay for this channel. */
    bonusEligible: boolean;
    rateBreakdown?: CampaignRateLine[];
  }[];
  totalCredits: number;
  purchasedCreditsRequired: number;
  balanceCredits: number;
  bonusCredits: number;
  availableCredits: number;
  sufficient: boolean;
}

export interface CampaignEstimateRecipientsParams extends CampaignRecipientSelection {
  channels?: CampaignChannel[];
  /** Prices SMS by segment count when given. */
  smsBody?: string;
  /** Prices voice by call length when given. */
  voiceFlow?: VoiceFlow;
}

export interface CampaignRecipientEstimate {
  estimatedRecipients: number;
  total: number;
  perChannel: Record<CampaignChannel, number>;
  credits: CampaignCreditEstimate;
}

export interface CampaignWhatsappPreview {
  whatsappTemplateId: string | null;
  templateName: string;
  languageCode: string;
  headerFormat: string | null;
  headerText: string | null;
  headerMediaUrl: string | null;
  body: string | null;
  footer: string | null;
  buttons: { type: string; text: string }[];
  /** Template variables the campaign has no value for. */
  missingVariables: string[];
}

export interface VoiceCampaignSummary {
  outcomes: {
    total: number;
    queued: number;
    inFlight: number;
    answered: number;
    noAnswer: number;
    busy: number;
    failed: number;
    cancelled: number;
    notDialed: number;
    optedOut: number;
  };
  talk: {
    talkSeconds: number;
    answeredCalls: number;
    averageAnsweredSeconds: number | null;
    creditsCharged: number;
  };
}

/**
 * A campaign's own statistics, with the voice summary for a voice campaign
 */
export interface CampaignStatisticsReport extends CampaignStatistics {
  voice: VoiceCampaignSummary | null;
}

type VoiceValueCount = { value: string; count: number };

export type VoiceQuestionResult = { answered: number; noResponse: number } & (
  | { kind: 'menu'; options: { digits: string; value: string; label: string; count: number }[] }
  | {
      kind: 'range';
      min: number;
      max: number;
      histogram: VoiceValueCount[];
      average: number | null;
      median: number | null;
    }
  | { kind: 'number'; distinctValues: number; topValues: VoiceValueCount[] }
  | { kind: 'unlisted'; values: VoiceValueCount[] }
);

export interface CampaignAnswers {
  questions: {
    responseKey: string;
    preset: 'rsvp' | 'rating_10' | 'rating_5' | 'yes_no' | 'custom_menu' | 'number_entry' | null;
    prompt: string | null;
    result: VoiceQuestionResult;
  }[];
}

export interface ReportDateRange {
  /** ISO date. */
  from?: string;
  /** ISO date. */
  to?: string;
}

export interface CampaignRecipientMetrics {
  scope: 'cross_channel' | 'per_channel';
  audienceSize: number | null;
  audienceIsAggregated: boolean;
  reached: number | null;
  engaged: number | null;
  clicked: number | null;
  retentionDays: number;
  /** False when part of the range is older than the retention window. */
  coversFullRange: boolean;
}

export interface CampaignJourney {
  firstSuccessfulChannel: { channel: CampaignChannel; recipients: number; share: number }[];
  paths: { steps: string[]; recipients: number }[];
}

export interface CampaignReportParams extends ReportDateRange {
  channel?: CampaignChannel;
}

export interface CampaignTrendParams extends CampaignReportParams {
  granularity?: 'day' | 'week' | 'month';
}

export interface Trend {
  direction: string;
  value: number;
}

export interface CampaignReportsOverview {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnconfirmed: number;
  totalUnsubscribed: number;
  avgDeliveryRate: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgBounceRate: number;
  trends: { sent: Trend; delivered: Trend; opened: Trend; clicked: Trend };
}

export interface CampaignTrendPoint {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  uniqueOpened: number;
  uniqueClicked: number;
}

export interface CampaignPerformance {
  id: string;
  name: string;
  channels: string[];
  sentAt: string | null;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
}

export type CampaignPerformanceParams = ReportDateRange & CursorPageParams;
