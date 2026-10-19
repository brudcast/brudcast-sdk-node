/**
 * Contact types. Replies mirror `ContactTransformer` and the channel transformers in
 * `app/transformers/`; requests mirror `app/validators/contact.ts` and
 * `app/validators/communication_channel.ts`.
 */
import type {
  CursorPageMeta,
  CursorPageParams,
  OffsetPageMeta,
  OffsetPageParams,
} from '../../core/pagination';
import type { ContactListSummary } from '../contact-lists/types';
import type { ContactFormSummary } from '../contact-forms/types';
import type {
  CampaignChannel,
  FilterDescriptor,
  InAppPlatform,
  PushPlatform,
  QuotaStatus,
  SortOrder,
  Timestamp,
} from '../shared';

export type ContactStatus = 'active' | 'inactive' | 'archived';
export type EmailStatus = 'verified' | 'unverified' | 'bounced' | 'complained' | 'suppressed';
export type SmsStatus = 'verified' | 'unverified' | 'invalid' | 'opted_out';
export type WhatsappStatus = 'verified' | 'unverified' | 'blocked';
export type TelegramStatus = 'active' | 'inactive' | 'blocked';
export type ImessageStatus = 'verified' | 'unverified' | 'invalid';
export type PushNotificationStatus = 'active' | 'inactive' | 'expired';
export type MembershipStatus = 'subscribed' | 'unsubscribed' | 'pending';

export interface ContactEmail {
  id: string;
  contactId: string;
  organizationId: string;
  email: string;
  status: EmailStatus;
  isPrimary: boolean;
  bounceCount: number;
  complaintCount: number;
  verifiedAt: Timestamp | null;
  lastBouncedAt: Timestamp | null;
  lastComplainedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactSms {
  id: string;
  contactId: string;
  phoneNumber: string;
  countryCode: string;
  status: SmsStatus;
  isPrimary: boolean;
  verifiedAt: Timestamp | null;
  optedOutAt: Timestamp | null;
  voiceOptedOutAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactWhatsapp {
  id: string;
  contactId: string;
  phoneNumber: string;
  countryCode: string;
  status: WhatsappStatus;
  isPrimary: boolean;
  isBusinessAccount: boolean;
  optedOutAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactTelegram {
  id: string;
  contactId: string;
  phoneNumber: string;
  countryCode: string;
  username: string | null;
  status: TelegramStatus;
  isPrimary: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactImessage {
  id: string;
  contactId: string;
  appleId: string;
  phoneNumber: string | null;
  status: ImessageStatus;
  isPrimary: boolean;
  verifiedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactPushNotification {
  id: string;
  contactId: string;
  organizationId: string;
  pushApplicationId: string | null;
  deviceToken: string;
  platform: PushPlatform;
  status: PushNotificationStatus;
  isPrimary: boolean;
  lastUsedAt: Timestamp | null;
  expiresAt: Timestamp | null;
  invalidatedAt: Timestamp | null;
  lastFailureReason: string | null;
  optedOutAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Present when the application was loaded with the device. */
  pushApplication?: {
    id: string;
    name: string;
    provider: string;
    identifier: string;
    status: string;
  };
}

export interface ContactInAppIdentity {
  id: string;
  contactId: string;
  inAppApplicationId: string;
  externalId: string;
  platforms: InAppPlatform[];
  appVersion: string | null;
  sdkVersion: string | null;
  firstSeenAt: Timestamp;
  lastSeenAt: Timestamp;
  optedOutAt: Timestamp | null;
  /** Present when the application was loaded with the identity. */
  application?: { id: string; name: string; status: string };
}

export interface ContactTagRecord {
  id: string;
  organizationId: string;
  name: string;
  contactCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactListMembership {
  id: string;
  contactId: string;
  contactListId: string;
  status: MembershipStatus;
  subscribedAt: Timestamp | null;
  unsubscribedAt: Timestamp | null;
  unsubscribeReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  contactList?: ContactListSummary;
}

/**
 * A contact. The channel and membership arrays are present when the API loaded them, which it
 * does for `retrieve`, `create` and `list`.
 */
export interface Contact {
  id: string;
  organizationId: string;
  externalId: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  timezone?: string | null;
  language?: string | null;
  status?: ContactStatus;
  customFields?: Record<string, unknown> | null;
  notes?: string | null;
  lastActivityAt?: Timestamp | null;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  emails?: ContactEmail[];
  smsNumbers?: ContactSms[];
  whatsappAccounts?: ContactWhatsapp[];
  telegramAccounts?: ContactTelegram[];
  imessageAccounts?: ContactImessage[];
  pushNotifications?: ContactPushNotification[];
  inAppIdentities?: ContactInAppIdentity[];
  tagRecords?: ContactTagRecord[];
  listMemberships?: ContactListMembership[];
}

/**
 * The short form of a contact that list members and segment members use
 */
export interface ContactSummary {
  id: string;
  organizationId: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  status?: ContactStatus;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  emails?: ContactEmail[];
}

export interface ContactEmailInput {
  email: string;
  isPrimary?: boolean;
}

export interface ContactSmsInput {
  /** 10 to 20 characters. */
  phoneNumber: string;
  /** The dialling code without `+`, 1 to 3 characters. */
  countryCode: string;
  isPrimary?: boolean;
}

export interface ContactWhatsappInput {
  phoneNumber: string;
  countryCode: string;
  status?: WhatsappStatus;
  isPrimary?: boolean;
  isBusinessAccount?: boolean;
}

export interface ContactTelegramInput {
  phoneNumber: string;
  countryCode: string;
  username?: string;
  isPrimary?: boolean;
}

export interface ContactImessageInput {
  appleId: string;
  phoneNumber?: string;
  isPrimary?: boolean;
}

export interface ContactPushNotificationInput {
  pushApplicationId: string;
  /** Up to 4096 characters. */
  deviceToken: string;
  platform: PushPlatform;
  appVersion?: string;
  deviceInfo?: Record<string, unknown>;
  isPrimary?: boolean;
}

/**
 * A new contact. At least one channel array must hold an entry.
 */
export interface ContactCreateParams {
  /** Your own id for the contact, up to 191 characters. */
  externalId?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  timezone?: string;
  language?: string;
  status?: ContactStatus;
  tags?: string[];
  customFields?: Record<string, unknown>;
  notes?: string;
  emails?: ContactEmailInput[];
  smsNumbers?: ContactSmsInput[];
  whatsappAccounts?: ContactWhatsappInput[];
  telegramAccounts?: ContactTelegramInput[];
  imessageAccounts?: ContactImessageInput[];
  pushNotifications?: ContactPushNotificationInput[];
}

export interface ContactUpdateParams {
  externalId?: string | null;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  timezone?: string;
  language?: string;
  status?: ContactStatus;
  tags?: string[];
  customFields?: Record<string, unknown>;
  notes?: string | null;
}

export interface ContactListParams extends OffsetPageParams {
  search?: string;
  status?: ContactStatus[];
  tags?: string[];
  channel?: 'email' | 'sms' | 'whatsapp' | 'telegram' | 'imessage' | 'push';
  hasEmail?: string;
  language?: string;
  /** ISO date or timestamp. */
  createdAtFrom?: string;
  /** ISO date or timestamp. */
  createdAtTo?: string;
  sortBy?: 'firstName' | 'lastName' | 'createdAt' | 'updatedAt' | 'lastActivityAt';
  sortOrder?: SortOrder;
}

/**
 * The `meta` of a contact list page: the page fields, plus the filters the list offers and the
 * ones this request applied
 */
export interface ContactListMeta extends OffsetPageMeta {
  filters: FilterDescriptor[];
  appliedFilters: Record<string, unknown>;
}

export interface ContactBulkCreateParams {
  /** 1 to 500 contacts. */
  contacts: ContactCreateParams[];
}

export interface ContactBulkCreateResult {
  /** The created contacts, with every column but without their channels. */
  created: Contact[];
  createdCount: number;
  failedCount: number;
  /** One entry per contact that failed, by its position in the request. */
  errors: { index: number; message: string }[];
}

export interface ContactIdsParams {
  /** 1 to 1000 contact ids. */
  contactIds: string[];
}

export interface ContactBulkAddToListParams extends ContactIdsParams {
  listId: string;
}

export interface ContactStatistics {
  statistics: { total: number; active: number; inactive: number; archived: number };
  quota: QuotaStatus;
}

export type ContactActivityType =
  | 'targeted'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed'
  | 'unsubscribed'
  | 'complained';

export interface ContactActivity {
  type: ContactActivityType;
  occurredAt: Timestamp;
  campaignId: string | null;
  campaignName: string | null;
  channel: CampaignChannel | null;
  channels: CampaignChannel[];
  linkUrl: string | null;
}

export type ContactActivityParams = CursorPageParams;

export interface ContactActivityMeta extends CursorPageMeta {
  /** How many days of activity the API keeps. */
  retentionDays: number;
}

export interface ContactChannelUpdateParams<Status extends string> {
  status?: Status;
  isPrimary?: boolean;
}

export interface ContactWhatsappUpdateParams extends ContactChannelUpdateParams<WhatsappStatus> {
  isBusinessAccount?: boolean;
  /** Records or clears the contact's WhatsApp opt-out. */
  optedOut?: boolean;
}

export interface ContactTelegramUpdateParams extends ContactChannelUpdateParams<TelegramStatus> {
  username?: string;
}

export interface ContactPushNotificationUpdateParams extends ContactChannelUpdateParams<PushNotificationStatus> {
  appVersion?: string;
  deviceInfo?: Record<string, unknown>;
}

export type ConsentSource =
  'form_double_opt_in' | 'form_single_opt_in' | 'import' | 'api' | 'dashboard';

export interface ContactConsentRecord {
  id: string;
  organizationId: string;
  contactId: string;
  contactListId: string | null;
  contactFormId: string | null;
  contactFormSubmissionId: string | null;
  source: ConsentSource;
  channel: 'email' | 'sms' | 'whatsapp';
  ingress: 'hosted' | 'api' | 'html';
  apiKeyId: string | null;
  consentText: string | null;
  formName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  occurredAt: Timestamp;
  confirmedAt: Timestamp | null;
  createdAt: Timestamp;
  contactForm?: ContactFormSummary;
  contactList?: ContactListSummary;
}
