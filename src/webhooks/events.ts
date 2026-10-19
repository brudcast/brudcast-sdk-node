/**
 * Webhook event types. The envelope mirrors `WebhookDeliveryService` in the core service and the
 * event names mirror `WebhookEventType`; the payloads mirror what each dispatcher sends.
 */

/** Every event name an endpoint can subscribe to. */
export type WebhookEventType =
  | 'email.delivered'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked'
  | 'email.marked_spam'
  | 'email.unsubscribed'
  | 'email.dropped'
  | 'email.deferred'
  | 'email.rejected'
  | 'email.complained'
  | 'contact.subscribed'
  | 'contact.unsubscribed'
  | 'contact.updated'
  | 'campaign.sent'
  | 'campaign.completed'
  | 'push.token_invalidated'
  | 'voice.call.completed'
  | 'voice.response.recorded'
  | 'test.event';

/**
 * A push device token that stopped working and will no longer be sent to
 */
export interface PushTokenInvalidatedData {
  /** The device's id on the contact. */
  tokenId: string;
  contactId: string;
  applicationId: string | null;
  platform: 'ios' | 'android' | 'web';
  reason: string | null;
  occurredAt: string | null;
}

/**
 * A voice campaign call that reached its final state
 */
export interface VoiceCallCompletedData {
  callId: string;
  campaignId: string;
  contactId: string | null;
  status: string;
  failureReason: string | null;
  dialCount: number;
  maxDials: number;
  talkSeconds: number;
  creditsCharged: number;
  optedOut: boolean;
  /** The contact's final answer to each question, by response key. */
  answers: Record<string, string | null>;
  completedAt: string;
}

/**
 * A final answer a contact gave on a voice call
 */
export interface VoiceResponseRecordedData {
  callId: string;
  campaignId: string;
  contactId: string;
  responseKey: string;
  /** The keys the contact pressed. */
  digits: string;
  /** The answer the digits map to, or null when the contact left it unanswered. */
  value: string | null;
  dial: number;
  occurredAt: string;
}

/**
 * The delivery the dashboard's and API's "send a test" button sends
 */
export interface TestEventData {
  message: string;
  timestamp: string;
}

/**
 * The payload of each event. Events the API declares but does not send yet carry an open
 * payload until their shape is fixed.
 */
export interface WebhookEventDataMap {
  'push.token_invalidated': PushTokenInvalidatedData;
  'voice.call.completed': VoiceCallCompletedData;
  'voice.response.recorded': VoiceResponseRecordedData;
  'test.event': TestEventData;
}

type DataOf<T extends WebhookEventType> = T extends keyof WebhookEventDataMap
  ? WebhookEventDataMap[T]
  : Record<string, unknown>;

/**
 * One webhook delivery's body. Its fields are snake_case as sent.
 */
export type WebhookEvent = {
  [T in WebhookEventType]: {
    /** The delivery's id, the same on every retry of it; use it to drop duplicates. */
    delivery_id: string;
    event: T;
    data: DataOf<T>;
    /** When the event happened, in Unix seconds. */
    timestamp: number;
  };
}[WebhookEventType];
