import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type { InAppDesign, InAppInboxSettings } from '../content';
import type { InAppPlatform, PushPlatform, Timestamp } from '../shared';

export type PushApplicationStatus =
  'pending_validation' | 'active' | 'credential_invalid' | 'disabled';

/**
 * An app push notifications are sent to. Mirrors `PushApplicationTransformer`.
 */
export interface PushApplication {
  id: string;
  organizationId: string;
  name: string;
  provider: 'fcm' | 'apns' | 'webpush';
  /** The app's bundle id or package name. */
  identifier: string;
  platforms: PushPlatform[];
  status: PushApplicationStatus;
  lastValidatedAt: Timestamp | null;
  lastError: string | null;
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** The start of the credential's fingerprint, to tell credentials apart. */
  credentialFingerprint: string | null;
  activeTokenCount: number;
  tokenCounts?: { active: number; inactive: number; expired: number };
}

/**
 * A Firebase service account key, as downloaded from the Firebase console
 */
export interface FcmServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

export interface PushApplicationCreateParams {
  /** 1 to 120 characters. */
  name: string;
  identifier: string;
  platforms: PushPlatform[];
  isDefault?: boolean;
  /** Only Firebase Cloud Messaging can be connected for now. */
  provider: 'fcm';
  credential: FcmServiceAccount;
}

export interface PushApplicationListParams extends OffsetPageParams {
  status?: PushApplicationStatus;
  provider?: 'fcm' | 'apns' | 'webpush';
  search?: string;
}

/**
 * Push applications: the mobile and web apps push notifications go to
 *
 * Requires the `senders:read` scope to read and `senders:write` to change.
 */
export class PushApplications extends APIResource {
  /**
   * Connect an app; its credential is validated in the background
   *
   * @param params - The app and its Firebase service account
   * @param options - Request options
   * @returns The new application, pending validation
   */
  create(
    params: PushApplicationCreateParams,
    options?: RequestOptions,
  ): APIPromise<PushApplication> {
    return this.request('POST', '/push-applications', { body: params, options });
  }

  /**
   * Fetch an application
   *
   * @param applicationId - The application
   * @param options - Request options
   * @returns The application
   */
  retrieve(applicationId: string, options?: RequestOptions): APIPromise<PushApplication> {
    return this.request('GET', this.path`/push-applications/${applicationId}`, { options });
  }

  /**
   * Change an application
   *
   * @param applicationId - The application
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated application
   */
  update(
    applicationId: string,
    params: { name?: string; platforms?: PushPlatform[]; isDefault?: boolean },
    options?: RequestOptions,
  ): APIPromise<PushApplication> {
    return this.request('PATCH', this.path`/push-applications/${applicationId}`, {
      body: params,
      options,
    });
  }

  /**
   * List applications
   *
   * @param params - Status, provider, search and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every application
   */
  list(
    params: PushApplicationListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<PushApplication>, PushApplication> {
    return this.offsetList('/push-applications', { query: params, options });
  }

  /**
   * Disable an application; nothing more is sent to it
   *
   * @param applicationId - The application
   * @param options - Request options
   * @returns A promise that resolves once the application is disabled
   */
  delete(applicationId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/push-applications/${applicationId}`, { options });
  }

  /**
   * Make an application the default for push campaigns
   *
   * @param applicationId - The application
   * @param options - Request options
   * @returns The application
   */
  setDefault(applicationId: string, options?: RequestOptions): APIPromise<PushApplication> {
    return this.request('POST', this.path`/push-applications/${applicationId}/default`, {
      options,
    });
  }

  /**
   * Check the application's credential again
   *
   * @param applicationId - The application
   * @param options - Request options
   * @returns The application, pending validation
   */
  validate(applicationId: string, options?: RequestOptions): APIPromise<PushApplication> {
    return this.request('POST', this.path`/push-applications/${applicationId}/validate`, {
      options,
    });
  }

  /**
   * Replace the application's Firebase service account
   *
   * @param applicationId - The application
   * @param params - The new service account key
   * @param options - Request options
   * @returns The application, pending validation
   */
  rotateCredential(
    applicationId: string,
    params: { credential: FcmServiceAccount },
    options?: RequestOptions,
  ): APIPromise<PushApplication> {
    return this.request('POST', this.path`/push-applications/${applicationId}/credential`, {
      body: params,
      options,
    });
  }

  /**
   * Send a test notification to one device
   *
   * @param applicationId - The application
   * @param params - The device token and the notification
   * @param options - Request options
   * @returns The test's id
   */
  testSend(
    applicationId: string,
    params: { deviceToken: string; title: string; body: string },
    options?: RequestOptions,
  ): APIPromise<{ testSendId: string }> {
    return this.request('POST', this.path`/push-applications/${applicationId}/test-send`, {
      body: params,
      options,
    });
  }
}

/**
 * An app that shows in-app messages through the Brudcast mobile SDKs. Mirrors
 * `InAppApplicationTransformer`.
 */
export interface InAppApplication {
  id: string;
  organizationId: string;
  name: string;
  platforms: InAppPlatform[];
  /** The publishable key (`bpk_...`) the mobile SDKs are configured with. */
  publicKey: string;
  /** The key replaced by `rotateKey`, still accepted until `revokePreviousKey`. */
  previousPublicKey: string | null;
  /** `enforced` requires a signed identity token for every user. */
  identityMode: 'enforced' | 'off';
  secretVersion: number;
  /** When the secret replaced by `rotateSecret` stops being accepted. */
  previousSecretValidUntil: Timestamp | null;
  frequencyCapCount: number | null;
  frequencyCapHours: number | null;
  /** The push application the SDK registers push tokens with. */
  pushApplicationId: string | null;
  status: 'active' | 'disabled';
  lastSeenAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  identitySecretFingerprint: string | null;
  identityCount: number;
}

export interface InAppApplicationWithSecret extends InAppApplication {
  /** The identity secret (`bis_...`) that signs user tokens; store it now, it is not shown again. */
  identitySecret: string;
}

export interface InAppApplicationUpdateParams {
  name?: string;
  platforms?: InAppPlatform[];
  identityMode?: 'enforced' | 'off';
  /** 1 to 20 messages per `frequencyCapHours`; null removes the cap. */
  frequencyCapCount?: number | null;
  /** 1 to 168. */
  frequencyCapHours?: number | null;
  pushApplicationId?: string | null;
}

export interface InAppApplicationListParams extends OffsetPageParams {
  status?: 'active' | 'disabled';
  search?: string;
}

/**
 * In-app applications: the apps the Brudcast mobile SDKs run in
 *
 * Requires the `senders:read` scope to read and `senders:write` to change.
 */
export class InAppApplications extends APIResource {
  /**
   * Register an app
   *
   * @param params - The name, platforms and identity mode
   * @param options - Request options
   * @returns The application with its identity secret, which is not shown again
   */
  create(
    params: { name: string; platforms: InAppPlatform[]; identityMode?: 'enforced' | 'off' },
    options?: RequestOptions,
  ): APIPromise<InAppApplicationWithSecret> {
    return this.request('POST', '/in-app-applications', { body: params, options });
  }

  /**
   * Fetch an application
   *
   * @param applicationId - The application
   * @param options - Request options
   * @returns The application
   */
  retrieve(applicationId: string, options?: RequestOptions): APIPromise<InAppApplication> {
    return this.request('GET', this.path`/in-app-applications/${applicationId}`, { options });
  }

  /**
   * Change an application
   *
   * @param applicationId - The application
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated application
   */
  update(
    applicationId: string,
    params: InAppApplicationUpdateParams,
    options?: RequestOptions,
  ): APIPromise<InAppApplication> {
    return this.request('PATCH', this.path`/in-app-applications/${applicationId}`, {
      body: params,
      options,
    });
  }

  /**
   * List applications
   *
   * @param params - Status, search and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every application
   */
  list(
    params: InAppApplicationListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<InAppApplication>, InAppApplication> {
    return this.offsetList('/in-app-applications', { query: params, options });
  }

  /**
   * Disable an application; its SDKs stop receiving messages
   *
   * @param applicationId - The application
   * @param options - Request options
   * @returns A promise that resolves once the application is disabled
   */
  delete(applicationId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/in-app-applications/${applicationId}`, {
      options,
    });
  }

  /**
   * Issue a new identity secret; the old one keeps working for 24 hours
   *
   * @param applicationId - The application
   * @param options - Request options
   * @returns The application with its new secret, which is not shown again
   */
  rotateSecret(
    applicationId: string,
    options?: RequestOptions,
  ): APIPromise<InAppApplicationWithSecret> {
    return this.request('POST', this.path`/in-app-applications/${applicationId}/rotate-secret`, {
      options,
    });
  }

  /**
   * Issue a new publishable key; the old one keeps working until `revokePreviousKey`
   *
   * @param applicationId - The application
   * @param options - Request options
   * @returns The application with its new key
   */
  rotateKey(applicationId: string, options?: RequestOptions): APIPromise<InAppApplication> {
    return this.request('POST', this.path`/in-app-applications/${applicationId}/rotate-key`, {
      options,
    });
  }

  /**
   * Stop accepting the publishable key replaced by `rotateKey`
   *
   * @param applicationId - The application
   * @param options - Request options
   * @returns The application
   */
  revokePreviousKey(applicationId: string, options?: RequestOptions): APIPromise<InAppApplication> {
    return this.request(
      'POST',
      this.path`/in-app-applications/${applicationId}/revoke-previous-key`,
      { options },
    );
  }

  /**
   * Show a test message to one app user
   *
   * @param applicationId - The application
   * @param params - The user and the design
   * @param options - Request options
   * @returns The test message's id
   */
  testSend(
    applicationId: string,
    params: { externalId: string; design: InAppDesign; inbox?: InAppInboxSettings },
    options?: RequestOptions,
  ): APIPromise<{ messageId: string }> {
    return this.request('POST', this.path`/in-app-applications/${applicationId}/test-send`, {
      body: params,
      options,
    });
  }
}
