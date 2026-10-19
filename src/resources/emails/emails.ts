import type { APIPromise } from '../../core/api-promise';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';

/**
 * An email address with an optional display name
 */
export interface EmailAddress {
  name?: string;
  /** Up to 254 characters. */
  address: string;
}

/**
 * A file attached to an email, or an inline image when `cid` is set
 */
export interface EmailAttachment {
  filename: string;
  /** The file's bytes, base64-encoded. */
  content: string;
  encoding: 'base64';
  contentType: string;
  /** Makes the attachment inline, referenced from the HTML as `cid:<cid>`. */
  cid?: string;
}

/**
 * One email to send. Mirrors `mailSchema` in the mailing service.
 */
export interface EmailSendParams {
  /** A sender on the sending key's domain. */
  from: EmailAddress | EmailAddress[];
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress | EmailAddress[];
  subject: string;
  /** At least one of `text` and `html` is required. */
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  /** Extra headers: printable ASCII names without a colon, values without line breaks. */
  headers?: Record<string, string>;
}

export interface EmailSendResult {
  /** The queued message's id; look it up with `messages.retrieve(jobId)`. */
  jobId: string;
}

/**
 * Transactional email, sent through the mailing service with a sending key
 */
export class Emails extends APIResource {
  /**
   * Queue an email for delivery
   *
   * Uses the client's `sendingKey`, not its `apiKey`. Pass an `idempotencyKey` that you store
   * with the message, so a retry after a crash or a timeout cannot send it twice.
   *
   * @param params - The email
   * @param options - Request options
   * @returns The queued message's job id
   */
  send(params: EmailSendParams, options?: RequestOptions): APIPromise<EmailSendResult> {
    return this.request('POST', '/api/v1/send', { body: params, options, host: 'mailing' });
  }
}
