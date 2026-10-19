import { version } from '../package.json';
import * as Errors from './core/errors';
import { BrudcastError } from './core/errors';
import { toFile } from './core/uploads';
import { Transport, type Host } from './core/transport';
import { isBrowser, readEnv, runtimeDescription } from './internal/utils';
import { ContactCustomFields } from './resources/contact-custom-fields/contact-custom-fields';
import { ContactExports } from './resources/contact-exports/contact-exports';
import { ContactImports } from './resources/contact-imports/contact-imports';
import { ContactLists } from './resources/contact-lists/contact-lists';
import { ContactSegments } from './resources/contact-segments/contact-segments';
import { ContactTags } from './resources/contact-tags/contact-tags';
import { Contacts } from './resources/contacts/contacts';
import { Emails } from './resources/emails/emails';
import { Suppressions } from './resources/suppressions/suppressions';
import { Campaigns } from './resources/campaigns/campaigns';
import { Templates } from './resources/templates/templates';
import { Messages } from './resources/messages/messages';
import { InApp } from './resources/in-app/messages';
import { WebhookDeliveries, WebhookEndpoints } from './resources/webhooks/webhooks';
import { Dashboard, Reports } from './resources/reports/reports';
import { SendingDomains } from './resources/sending-domains/sending-domains';
import { IpPoolRequests, IpPools } from './resources/ip-pools/ip-pools';
import { SenderIdentities } from './resources/sender-identities/sender-identities';
import { InAppApplications, PushApplications } from './resources/applications/applications';
import { Whatsapp } from './resources/whatsapp/whatsapp';
import { MailboxDomains, Mailboxes } from './resources/mailboxes/mailboxes';
import { ContactForms } from './resources/contact-forms/contact-forms';
import { PreferenceCenterResource, Websites } from './resources/websites/websites';

export const VERSION: string = version;

export const DEFAULT_CORE_BASE_URL = 'https://core-service.brudcast.com';
export const DEFAULT_MAILING_BASE_URL = 'https://mailing-service.brudcast.com';
export const DEFAULT_TIMEOUT = 60_000;
export const DEFAULT_MAX_RETRIES = 2;

/**
 * What a client is built from. Every option has an environment variable fallback.
 */
export interface ClientOptions {
  /**
   * The organization API key (`bk_live_...`), for everything but sending email. Defaults to
   * `BRUDCAST_API_KEY`.
   */
  apiKey?: string | undefined;
  /**
   * A sending key for one of the organization's sending domains, for `emails.send`. Defaults to
   * `BRUDCAST_SENDING_KEY`.
   */
  sendingKey?: string | undefined;
  /** The core API's address. Defaults to `BRUDCAST_BASE_URL`, then production. */
  baseURL?: string | undefined;
  /** The mailing service's address. Defaults to `BRUDCAST_MAILING_BASE_URL`, then production. */
  mailingBaseURL?: string | undefined;
  /** Milliseconds to wait for each attempt. Defaults to 60 seconds. */
  timeout?: number | undefined;
  /** How many times to retry an attempt that is safe to repeat. Defaults to 2. */
  maxRetries?: number | undefined;
  /** Headers sent on every request; a `null` value removes one the SDK would send. */
  defaultHeaders?: Record<string, string | null | undefined> | undefined;
  /** A `fetch` to use instead of the global one, for proxies, tests or instrumentation. */
  fetch?: typeof fetch | undefined;
  /**
   * Allow the client in a browser. An API key in browser code gives anyone who opens the page
   * the whole organization, so this is off unless you set it.
   */
  dangerouslyAllowBrowser?: boolean | undefined;
}

/**
 * The Brudcast API client
 *
 * ```ts
 * const brudcast = new Brudcast({ apiKey: process.env.BRUDCAST_API_KEY });
 * const contact = await brudcast.contacts.create({ emails: [{ email: 'ada@example.com' }] });
 * ```
 */
export class Brudcast {
  static readonly BrudcastError = Errors.BrudcastError;
  static readonly APIError = Errors.APIError;
  static readonly BadRequestError = Errors.BadRequestError;
  static readonly AuthenticationError = Errors.AuthenticationError;
  static readonly PermissionDeniedError = Errors.PermissionDeniedError;
  static readonly InsufficientScopeError = Errors.InsufficientScopeError;
  static readonly InsufficientCreditsError = Errors.InsufficientCreditsError;
  static readonly NotFoundError = Errors.NotFoundError;
  static readonly ConflictError = Errors.ConflictError;
  static readonly UnprocessableEntityError = Errors.UnprocessableEntityError;
  static readonly RateLimitError = Errors.RateLimitError;
  static readonly InternalServerError = Errors.InternalServerError;
  static readonly APIConnectionError = Errors.APIConnectionError;
  static readonly APITimeoutError = Errors.APITimeoutError;
  static readonly APIUserAbortError = Errors.APIUserAbortError;
  static readonly toFile = toFile;

  readonly contacts: Contacts;
  readonly contactLists: ContactLists;
  readonly contactTags: ContactTags;
  readonly contactCustomFields: ContactCustomFields;
  readonly contactSegments: ContactSegments;
  readonly contactImports: ContactImports;
  readonly contactExports: ContactExports;
  readonly suppressions: Suppressions;
  readonly emails: Emails;
  readonly campaigns: Campaigns;
  readonly templates: Templates;
  readonly messages: Messages;
  readonly inApp: InApp;
  readonly webhookEndpoints: WebhookEndpoints;
  readonly webhookDeliveries: WebhookDeliveries;
  readonly reports: Reports;
  readonly dashboard: Dashboard;
  readonly sendingDomains: SendingDomains;
  readonly ipPools: IpPools;
  readonly ipPoolRequests: IpPoolRequests;
  readonly senderIdentities: SenderIdentities;
  readonly pushApplications: PushApplications;
  readonly inAppApplications: InAppApplications;
  readonly whatsapp: Whatsapp;
  readonly mailboxDomains: MailboxDomains;
  readonly mailboxes: Mailboxes;
  readonly contactForms: ContactForms;
  readonly websites: Websites;
  readonly preferenceCenter: PreferenceCenterResource;

  private readonly apiKey: string | undefined;
  private readonly sendingKey: string | undefined;

  /**
   * Build a client
   *
   * @param options - Keys, addresses, timeouts and retries
   * @throws {BrudcastError} When neither key is set, a key is malformed, or the client is built
   * in a browser without `dangerouslyAllowBrowser`
   */
  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey?.trim() || readEnv('BRUDCAST_API_KEY');
    this.sendingKey = options.sendingKey?.trim() || readEnv('BRUDCAST_SENDING_KEY');

    if (!this.apiKey && !this.sendingKey) {
      throw new BrudcastError(
        'No API key was given. Pass apiKey (and sendingKey for email) to the Brudcast constructor, or set BRUDCAST_API_KEY.',
      );
    }
    if (this.apiKey !== undefined && !/^bk_[\x21-\x7E]+$/.test(this.apiKey)) {
      throw new BrudcastError(
        'The apiKey does not look like a Brudcast API key, which starts with "bk_". A sending key goes in sendingKey.',
      );
    }
    if (this.sendingKey !== undefined && !/^[\x21-\x7E]+$/.test(this.sendingKey)) {
      throw new BrudcastError('The sendingKey has characters that cannot be sent in a header.');
    }
    if (isBrowser() && !options.dangerouslyAllowBrowser) {
      throw new BrudcastError(
        'The Brudcast client runs on your server: in a browser it would expose your API key. Set dangerouslyAllowBrowser: true only if you understand the risk.',
      );
    }

    const transport = new Transport({
      baseURL: {
        core: options.baseURL ?? readEnv('BRUDCAST_BASE_URL') ?? DEFAULT_CORE_BASE_URL,
        mailing:
          options.mailingBaseURL ??
          readEnv('BRUDCAST_MAILING_BASE_URL') ??
          DEFAULT_MAILING_BASE_URL,
      },
      credential: (host) => this.credentialFor(host),
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      defaultHeaders: options.defaultHeaders ?? {},
      userAgent: `brudcast-node/${VERSION} ${runtimeDescription()}`,
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    });

    this.contacts = new Contacts(transport);
    this.contactLists = new ContactLists(transport);
    this.contactTags = new ContactTags(transport);
    this.contactCustomFields = new ContactCustomFields(transport);
    this.contactSegments = new ContactSegments(transport);
    this.contactImports = new ContactImports(transport);
    this.contactExports = new ContactExports(transport);
    this.suppressions = new Suppressions(transport);
    this.emails = new Emails(transport);
    this.campaigns = new Campaigns(transport);
    this.templates = new Templates(transport);
    this.messages = new Messages(transport);
    this.inApp = new InApp(transport);
    this.webhookEndpoints = new WebhookEndpoints(transport);
    this.webhookDeliveries = new WebhookDeliveries(transport);
    this.reports = new Reports(transport);
    this.dashboard = new Dashboard(transport);
    this.sendingDomains = new SendingDomains(transport);
    this.ipPools = new IpPools(transport);
    this.ipPoolRequests = new IpPoolRequests(transport);
    this.senderIdentities = new SenderIdentities(transport);
    this.pushApplications = new PushApplications(transport);
    this.inAppApplications = new InAppApplications(transport);
    this.whatsapp = new Whatsapp(transport);
    this.mailboxDomains = new MailboxDomains(transport);
    this.mailboxes = new Mailboxes(transport);
    this.contactForms = new ContactForms(transport);
    this.websites = new Websites(transport);
    this.preferenceCenter = new PreferenceCenterResource(transport);
  }

  /**
   * Pick the key a service takes
   *
   * @param host - The service
   * @returns The API key for the core service, the sending key for the mailing service
   * @throws {BrudcastError} When the client was built without that key
   */
  private credentialFor(host: Host): string {
    const key = host === 'mailing' ? this.sendingKey : this.apiKey;

    if (key === undefined) {
      throw new BrudcastError(
        host === 'mailing'
          ? 'emails.send needs a sending key: pass sendingKey to the Brudcast constructor or set BRUDCAST_SENDING_KEY.'
          : 'This method needs an API key: pass apiKey to the Brudcast constructor or set BRUDCAST_API_KEY.',
      );
    }

    return key;
  }
}
