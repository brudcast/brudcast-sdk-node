import type { APIPromise } from '../../core/api-promise';
import type { CursorPage, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type {
  EmailMessage,
  EmailMessageDetail,
  EmailMessageListParams,
  MessageChannel,
  MessageLogMeta,
  SmsMessage,
  SmsMessageDetail,
  SmsMessageListParams,
  VoiceCall,
  VoiceCallDetail,
  VoiceCallListParams,
} from './types';

/**
 * The delivery log of every email, SMS and voice call sent, newest first
 *
 * Requires the `messages:read` scope. Entries older than `meta.retentionDays` are not kept.
 */
export class Messages extends APIResource {
  /**
   * List sent messages on one channel; email unless `channel` says otherwise
   *
   * @param params - The channel, time window and filters
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every message
   */
  list(
    params?: EmailMessageListParams,
    options?: RequestOptions,
  ): PagePromise<CursorPage<EmailMessage, MessageLogMeta>, EmailMessage>;
  list(
    params: SmsMessageListParams,
    options?: RequestOptions,
  ): PagePromise<CursorPage<SmsMessage, MessageLogMeta>, SmsMessage>;
  list(
    params: VoiceCallListParams,
    options?: RequestOptions,
  ): PagePromise<CursorPage<VoiceCall, MessageLogMeta>, VoiceCall>;
  list(
    params: EmailMessageListParams | SmsMessageListParams | VoiceCallListParams = {},
    options?: RequestOptions,
  ): PagePromise<CursorPage<unknown, MessageLogMeta>, unknown> {
    return this.cursorList('/messages', { query: params, options });
  }

  /**
   * Fetch one message with its delivery attempts and events
   *
   * @param id - The email's `jobId`, the SMS's `messageId` or the call's `callId`
   * @param params - The channel the id belongs to; email when omitted
   * @param options - Request options
   * @returns The message
   */
  retrieve(
    id: string,
    params?: { channel?: 'email' },
    options?: RequestOptions,
  ): APIPromise<EmailMessageDetail>;
  retrieve(
    id: string,
    params: { channel: 'sms' },
    options?: RequestOptions,
  ): APIPromise<SmsMessageDetail>;
  retrieve(
    id: string,
    params: { channel: 'voice' },
    options?: RequestOptions,
  ): APIPromise<VoiceCallDetail>;
  retrieve(
    id: string,
    params: { channel?: MessageChannel } = {},
    options?: RequestOptions,
  ): APIPromise<unknown> {
    return this.request('GET', this.path`/messages/${id}`, { query: params, options });
  }
}
