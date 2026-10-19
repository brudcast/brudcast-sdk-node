import type { APIPromise } from '../../core/api-promise';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type { InAppDesign, InAppDisplayRules, InAppInboxSettings } from '../content';

interface InAppMessageContent {
  /** The application to deliver through. */
  applicationId: string;
  /** Overrides how often and how soon the message shows. */
  displayRules?: InAppDisplayRules;
  /** Keeps the message in the app's inbox. */
  inbox?: InAppInboxSettings;
  /** Values for the design's merge tags. */
  mergeData?: Record<string, string | number | boolean>;
  /** How long the message waits to be shown, 1 to 365 days. */
  expiresInDays?: number;
}

type InAppRecipient =
  | {
      /** Your id for the app user, as the SDK identified them. */ externalId: string;
      contactId?: string;
    }
  | { contactId: string; externalId?: string };

type InAppBody =
  | { /** An in-app template to render. */ templateId: string; design?: InAppDesign }
  | { design: InAppDesign; templateId?: string };

/**
 * One in-app message to one user: an application, a recipient and either a template or a design
 */
export type InAppMessageSendParams = InAppMessageContent & InAppRecipient & InAppBody;

/**
 * Transactional in-app messages, sent to one app user at a time
 *
 * Requires the `messages:send` scope.
 */
export class InAppMessages extends APIResource {
  /**
   * Queue an in-app message for one user
   *
   * @param params - The application, the user, and the template or design
   * @param options - Request options; pass an `idempotencyKey` to make a retried send safe
   * @returns The queued message's id
   */
  send(
    params: InAppMessageSendParams,
    options?: RequestOptions,
  ): APIPromise<{ messageId: string }> {
    return this.request('POST', '/in-app/messages', { body: params, options });
  }
}

/**
 * The in-app messaging namespace
 */
export class InApp extends APIResource {
  readonly messages: InAppMessages = new InAppMessages(this.transport);
}
