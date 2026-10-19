import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type { ContactFormLanguage, ContactFormTheme } from '../contact-forms/types';
import type { Timestamp } from '../shared';

/**
 * A website popup forms are placed on. Mirrors `WebsiteTransformer`.
 */
export interface Website {
  id: string;
  organizationId: string;
  name: string;
  /** The origins the forms loader runs on, such as `https://example.com`. */
  allowedOrigins: string[];
  /** The key the forms loader snippet is installed with. */
  siteKey: string;
  lastSeenAt: Timestamp | null;
  installVerifiedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WebsiteParams {
  /** 1 to 120 characters. */
  name: string;
  /** Up to 20 origins. */
  allowedOrigins?: string[];
}

/**
 * Websites, where popup forms are placed
 *
 * Requires the `forms:read` scope to read and `forms:write` to change.
 */
export class Websites extends APIResource {
  /**
   * Add a website
   *
   * @param params - The name and allowed origins
   * @param options - Request options
   * @returns The website with its site key
   */
  create(params: WebsiteParams, options?: RequestOptions): APIPromise<Website> {
    return this.request('POST', '/websites', { body: params, options });
  }

  /**
   * Fetch a website
   *
   * @param websiteId - The website
   * @param options - Request options
   * @returns The website
   */
  retrieve(websiteId: string, options?: RequestOptions): APIPromise<Website> {
    return this.request('GET', this.path`/websites/${websiteId}`, { options });
  }

  /**
   * Change a website
   *
   * @param websiteId - The website
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated website
   */
  update(
    websiteId: string,
    params: Partial<WebsiteParams>,
    options?: RequestOptions,
  ): APIPromise<Website> {
    return this.request('PATCH', this.path`/websites/${websiteId}`, { body: params, options });
  }

  /**
   * List websites
   *
   * @param params - Search and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every website
   */
  list(
    params: OffsetPageParams & { search?: string } = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<Website>, Website> {
    return this.offsetList('/websites', { query: params, options });
  }

  /**
   * Delete a website; one with placements fails with code `E_WEBSITE_HAS_PLACEMENTS`
   *
   * @param websiteId - The website
   * @param options - Request options
   * @returns A promise that resolves once the website is deleted
   */
  delete(websiteId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/websites/${websiteId}`, { options });
  }
}

/**
 * The page contacts manage their subscriptions on
 */
export interface PreferenceCenter {
  /** The lists contacts can join and leave. */
  listIds: string[];
  /** The tags contacts can pick. */
  tagIds: string[];
  /** `first_name`, `last_name`, `phone` or a custom field id. */
  editableFields: string[];
  heading: string | null;
  body: string | null;
  successMessage: string | null;
  unsubscribeHeading: string | null;
  unsubscribeBody: string | null;
  sendGoodbyeEmail: boolean;
  goodbyeSubject: string | null;
  goodbyeBody: string | null;
  theme: ContactFormTheme | null;
  language: ContactFormLanguage;
  updatedAt: string | null;
}

export type PreferenceCenterUpdateParams = {
  [K in Exclude<keyof PreferenceCenter, 'updatedAt'>]?: PreferenceCenter[K];
};

/**
 * The organization's preference center
 *
 * Requires the `forms:read` scope to read and `forms:write` to change.
 */
export class PreferenceCenterResource extends APIResource {
  /**
   * Fetch the preference center's settings
   *
   * @param options - Request options
   * @returns The settings
   */
  retrieve(options?: RequestOptions): APIPromise<PreferenceCenter> {
    return this.request('GET', '/preference-center', { options });
  }

  /**
   * Save the preference center's settings; fields left out are kept
   *
   * @param params - The settings to change
   * @param options - Request options
   * @returns The saved settings
   */
  update(
    params: PreferenceCenterUpdateParams,
    options?: RequestOptions,
  ): APIPromise<PreferenceCenter> {
    return this.request('PUT', '/preference-center', { body: params, options });
  }
}
