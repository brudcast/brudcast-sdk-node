import type { APIPromise } from '../../core/api-promise';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type {
  ContactChannelUpdateParams,
  ContactEmail,
  ContactEmailInput,
  ContactImessage,
  ContactImessageInput,
  ContactPushNotification,
  ContactPushNotificationInput,
  ContactPushNotificationUpdateParams,
  ContactSms,
  ContactSmsInput,
  ContactTelegram,
  ContactTelegramInput,
  ContactTelegramUpdateParams,
  ContactWhatsapp,
  ContactWhatsappInput,
  ContactWhatsappUpdateParams,
  EmailStatus,
  ImessageStatus,
  SmsStatus,
} from './types';

/**
 * The create, update and delete methods every contact channel shares
 */
abstract class ContactChannelResource<Channel, Input, Update> extends APIResource {
  protected abstract readonly segment: string;

  /**
   * Add a channel to a contact
   *
   * @param contactId - The contact
   * @param params - The channel
   * @param options - Request options
   * @returns The new channel
   */
  create(contactId: string, params: Input, options?: RequestOptions): APIPromise<Channel> {
    return this.request('POST', this.channelPath(contactId), { body: params, options });
  }

  /**
   * Change a contact's channel
   *
   * @param contactId - The contact
   * @param channelId - The channel
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated channel
   */
  update(
    contactId: string,
    channelId: string,
    params: Update,
    options?: RequestOptions,
  ): APIPromise<Channel> {
    return this.request('PATCH', `${this.channelPath(contactId)}${this.path`/${channelId}`}`, {
      body: params,
      options,
    });
  }

  /**
   * Remove a channel from a contact
   *
   * @param contactId - The contact
   * @param channelId - The channel
   * @param options - Request options
   * @returns A promise that resolves once the channel is removed
   */
  delete(contactId: string, channelId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', `${this.channelPath(contactId)}${this.path`/${channelId}`}`, {
      options,
    });
  }

  /**
   * Build the path of a contact's channels of this kind
   *
   * @param contactId - The contact
   * @returns The path
   */
  private channelPath(contactId: string): string {
    return `${this.path`/contacts/${contactId}`}/${this.segment}`;
  }
}

/** A contact's email addresses: `/contacts/:contactId/emails`. */
export class ContactEmails extends ContactChannelResource<
  ContactEmail,
  ContactEmailInput,
  ContactChannelUpdateParams<EmailStatus>
> {
  protected readonly segment = 'emails';
}

/** A contact's SMS numbers: `/contacts/:contactId/sms`. */
export class ContactSmsNumbers extends ContactChannelResource<
  ContactSms,
  ContactSmsInput,
  ContactChannelUpdateParams<SmsStatus>
> {
  protected readonly segment = 'sms';
}

/** A contact's WhatsApp numbers: `/contacts/:contactId/whatsapp`. */
export class ContactWhatsappAccounts extends ContactChannelResource<
  ContactWhatsapp,
  Omit<ContactWhatsappInput, 'status'>,
  ContactWhatsappUpdateParams
> {
  protected readonly segment = 'whatsapp';
}

/** A contact's Telegram accounts: `/contacts/:contactId/telegram`. */
export class ContactTelegramAccounts extends ContactChannelResource<
  ContactTelegram,
  ContactTelegramInput & { username: string },
  ContactTelegramUpdateParams
> {
  protected readonly segment = 'telegram';
}

/** A contact's iMessage accounts: `/contacts/:contactId/imessage`. */
export class ContactImessageAccounts extends ContactChannelResource<
  ContactImessage,
  ContactImessageInput,
  ContactChannelUpdateParams<ImessageStatus>
> {
  protected readonly segment = 'imessage';
}

/** A contact's push devices: `/contacts/:contactId/push-notifications`. */
export class ContactPushNotifications extends ContactChannelResource<
  ContactPushNotification,
  ContactPushNotificationInput,
  ContactPushNotificationUpdateParams
> {
  protected readonly segment = 'push-notifications';
}
