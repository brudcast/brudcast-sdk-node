/**
 * Types several resources share. Enum values mirror `app/types/` in the core service.
 */

/** An ISO 8601 timestamp, as the API sends it. */
export type Timestamp = string;

export type SortOrder = 'asc' | 'desc';

/** A channel a contact can be reached on. Mirrors `ContactChannel`. */
export type ContactChannel = 'email' | 'sms' | 'imessage' | 'telegram' | 'push' | 'whatsapp';

/** A channel a campaign or message is sent on. Mirrors `CampaignChannel`. */
export type CampaignChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'voice' | 'in_app';

export type PushPlatform = 'ios' | 'android' | 'web';

export type InAppPlatform = 'ios' | 'android';

/** A product a subscription can cover. Mirrors `ProductSlug`. */
export type ProductSlug =
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'push'
  | 'voice'
  | 'in-app'
  | 'mailbox'
  | 'telegram'
  | 'imessage'
  | 'automations';

/** A quota metric. Mirrors `QuotaMetric`. */
export type QuotaMetric =
  | 'emails_sent'
  | 'contacts'
  | 'sending_domains'
  | 'dedicated_ips'
  | 'webhook_endpoints'
  | 'sms_sent'
  | 'phone_numbers'
  | 'conversations'
  | 'waba_accounts'
  | 'notifications_sent'
  | 'subscribers'
  | 'minutes_used'
  | 'ivr_flows'
  | 'messages_sent'
  | 'active_automations'
  | 'automation_enrollments'
  | (string & {});

/**
 * How much of a quota is used. Mirrors `QuotaStatus`.
 */
export interface QuotaStatus {
  metric: QuotaMetric;
  limit: number;
  used: number;
  remaining: number;
}

/**
 * One filter a list offers, as the dashboard draws it. Mirrors `FilterDescriptor`.
 */
export interface FilterDescriptor {
  key: string;
  label: string;
  type:
    | 'text'
    | 'single_select'
    | 'multi_select'
    | 'boolean'
    | 'tri_state'
    | 'segmented'
    | 'date_range'
    | 'number_range'
    | 'preset';
  group?: string;
  order?: number;
  placement?: 'inline' | 'advanced';
  placeholder?: string;
  debounceMs?: number;
  clearable?: boolean;
  options?: {
    value: string | number | boolean | null;
    label: string;
    count?: number;
    color?: string;
  }[];
  maxSelections?: number | null;
  min?: string | number | null;
  max?: string | number | null;
  presets?: { value: string; label: string }[];
  dependsOn?: { key: string; value: string | number | boolean | null };
}
