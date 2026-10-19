/**
 * Message log types. Replies mirror `app/types/message_log.ts` and `app/types/voice_call_log.ts`;
 * requests mirror `app/validators/message_log.ts`.
 */
import type { CursorPageMeta, CursorPageParams } from '../../core/pagination';

export type MessageChannel = 'email' | 'sms' | 'voice';
export type FailureClass = 'critical' | 'non_critical' | 'critical_delay';

export type EmailDeliveryStatus = 'delivered' | 'bounced' | 'deferred' | 'failed';

export type EmailBounceCategory =
  | 'invalid_mailbox'
  | 'invalid_domain'
  | 'mailbox_full'
  | 'mailbox_disabled'
  | 'authentication_failure'
  | 'reputation_block'
  | 'content_rejected'
  | 'rate_limited'
  | 'message_too_large'
  | 'connection_failure'
  | 'sending_domain_not_authorized'
  | 'sending_domain_unavailable'
  | 'sending_capacity'
  | 'send_rate_limited'
  | 'other';

/** Why Brudcast refused to hand an email to the receiving server. */
export type EmailRefusalReason =
  | 'spf_unauthorized'
  | 'no_ip_assigned'
  | 'routing_unavailable'
  | 'ip_capacity_exhausted'
  | 'domain_not_found'
  | 'domain_suspended'
  | 'rate_limited'
  | 'handoff_rejected'
  | 'handoff_failed';

/** A failure on Brudcast's side or the network's, not the receiver's. */
export type PlatformFailureReason =
  | 'outbound_connection_failed'
  | 'receiver_tls_unavailable'
  | 'receiver_dns_failed'
  | 'receiver_unreachable'
  | 'delivery_expired'
  | 'delivery_cancelled'
  | 'internal_error';

export interface EmailMessage {
  /** The `jobId` `emails.send` returned. */
  jobId: string;
  messageId: string;
  senderAddress: string;
  recipient: string;
  status: EmailDeliveryStatus;
  smtpCode: number | null;
  smtpMessage: string | null;
  attempts: number;
  campaignId: string | null;
  lastAttemptedAt: string;
  failureClass: FailureClass | null;
  category: EmailBounceCategory | null;
  enhancedCode: string | null;
  failureReason: EmailRefusalReason | null;
  platformReason: PlatformFailureReason | null;
}

export interface EmailMessageDetail {
  jobId: string;
  messageId: string;
  senderAddress: string;
  campaignId: string | null;
  contactId: string | null;
  recipients: string[];
  deliveryAttempts: {
    recipient: string;
    status: EmailDeliveryStatus;
    smtpCode: number | null;
    smtpMessage: string | null;
    enhancedCode: string | null;
    failureReason: EmailRefusalReason | null;
    platformReason: PlatformFailureReason | null;
    mxHost: string | null;
    outboundIp: string | null;
    retryCount: number;
    attemptedAt: string;
  }[];
  engagementEvents: {
    type: 'opened' | 'clicked' | 'complained';
    recipient: string;
    userAgent: string | null;
    remoteIp: string | null;
    occurredAt: string;
  }[];
  failureClass: FailureClass | null;
  category: EmailBounceCategory | null;
  enhancedCode: string | null;
  retentionDays: number;
}

export type SmsMessageStatus = 'submitted' | 'delivered' | 'failed' | 'expired' | 'rejected';

export type SmsRefusalReason =
  | 'chain_exhausted'
  | 'retries_exhausted'
  | 'no_provider_available'
  | 'sender_id_not_approved'
  | 'recipient_opted_out'
  | 'segment_limit_exceeded'
  | 'invalid_destination'
  | 'credits_exhausted';

export type SmsFailureCategory =
  | 'recipient_opted_out'
  | 'sender_not_approved'
  | 'unknown_number'
  | 'carrier_rejected'
  | 'blocked_or_barred'
  | 'submit_rejected'
  | 'expired'
  | 'absent_subscriber'
  | 'submit_throttled'
  | 'no_receipt'
  | 'other';

export interface SmsRecipient {
  contactId: string | null;
  contactName: string | null;
  maskedNumber: string | null;
  /** ISO 3166-1 alpha-2. */
  country: string | null;
  network: string | null;
}

export interface SmsMessage {
  messageId: string;
  status: SmsMessageStatus;
  senderId: string | null;
  recipient: SmsRecipient;
  segments: number | null;
  creditsCharged: number | null;
  attempts: number;
  campaignId: string | null;
  carrierStatus: string | null;
  carrierErrorCode: string | null;
  failureReason: SmsRefusalReason | null;
  failureClass: FailureClass | null;
  category: SmsFailureCategory | null;
  lastOccurredAt: string;
}

export interface SmsMessageDetail {
  messageId: string;
  status: SmsMessageStatus;
  senderId: string | null;
  recipient: SmsRecipient;
  campaignId: string | null;
  failureClass: FailureClass | null;
  category: SmsFailureCategory | null;
  submitAttempts: {
    attemptNo: number;
    segments: number | null;
    encoding: string | null;
    creditsCharged: number | null;
    submittedAt: string;
  }[];
  receipts: {
    status: SmsMessageStatus;
    carrierStatus: string | null;
    carrierErrorCode: string | null;
    failureReason: SmsRefusalReason | null;
    receivedAt: string;
  }[];
  inboundReplies: { eventType: string; keyword: string | null; occurredAt: string }[];
  retentionDays: number;
}

export type VoiceCallStatus =
  'queued' | 'in_flight' | 'answered' | 'no_answer' | 'busy' | 'failed' | 'cancelled';

export interface VoiceCall {
  callId: string;
  status: VoiceCallStatus;
  callerId: string;
  recipient: {
    contactId: string | null;
    contactName: string | null;
    maskedNumber: string;
    country: string;
  };
  campaignId: string;
  dialCount: number;
  maxDials: number;
  talkSeconds: number;
  creditsCharged: number;
  failureReason: string | null;
  optedOutAt: string | null;
  startedAt: string;
  lastEventAt: string;
  /** The contact's final answer to each question, by response key. */
  answersByQuestion: Record<string, string | null>;
}

export interface VoiceCallDetail extends VoiceCall {
  attempts: {
    attemptNo: number;
    status: 'dialing' | 'in_progress' | 'answered' | 'no_answer' | 'busy' | 'failed';
    hangupCause: string | null;
    durationSeconds: number | null;
    billedCredits: number;
    dialedAt: string;
    answeredAt: string | null;
    endedAt: string | null;
  }[];
  answers: {
    responseKey: string;
    rawDigits: string;
    mappedValue: string | null;
    isFinal: boolean;
    attemptNo: number;
    questionAttempt: number;
    writeBackProblem: string | null;
    occurredAt: string;
  }[];
}

export interface MessageLogMeta extends CursorPageMeta {
  /** How many days of messages the API keeps. */
  retentionDays: number;
}

interface MessageWindow extends CursorPageParams {
  /** ISO date or timestamp. */
  from?: string;
  /** ISO date or timestamp. */
  to?: string;
  campaignId?: string;
}

export interface EmailMessageListParams extends MessageWindow {
  channel?: 'email';
  status?: EmailDeliveryStatus;
  recipient?: string;
  domain?: string;
  sender?: string;
  failureClass?: FailureClass;
  category?: EmailBounceCategory;
}

export interface SmsMessageListParams extends MessageWindow {
  channel: 'sms';
  status?: SmsMessageStatus;
  phone?: string;
  /** ISO 3166-1 alpha-2. */
  country?: string;
  senderId?: string;
  failureClass?: FailureClass;
  category?: SmsFailureCategory;
}

export interface VoiceCallListParams extends MessageWindow {
  channel: 'voice';
  status?: VoiceCallStatus;
  phone?: string;
  country?: string;
  /** `<responseKey>:<value>`, for calls with that final answer. */
  answer?: string;
}

export interface BounceClassificationParams {
  from?: string;
  to?: string;
  channel?: 'email' | 'sms';
  campaignId?: string;
  domain?: string;
  country?: string;
}

export interface BounceClassification {
  channel: MessageChannel;
  from: string;
  to: string;
  totals: { critical: number; nonCritical: number; criticalDelay: number };
  categories: {
    failureClass: FailureClass;
    category: EmailBounceCategory | SmsFailureCategory;
    count: number;
    affectedRecipients: number;
    topGroups: { key: string; count: number }[];
    sample: string | null;
    lastSeenAt: string;
  }[];
  series: { date: string; critical: number; nonCritical: number; criticalDelay: number }[];
  retentionDays: number;
}
