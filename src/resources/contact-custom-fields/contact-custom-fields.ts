import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type { Timestamp } from '../shared';

export type ContactCustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select';

/**
 * A custom field definition. Mirrors `ContactCustomFieldTransformer`.
 */
export interface ContactCustomField {
  id: string;
  organizationId: string;
  name: string;
  /** The key contacts store the value under in `customFields`. */
  key: string;
  type: ContactCustomFieldType;
  description: string | null;
  defaultValue: string | null;
  isRequired: boolean;
  /** The choices of a `select` field. */
  options: string[] | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactCustomFieldCreateParams {
  /** 1 to 255 characters. */
  name: string;
  /** Lowercase letters, digits and `_`, starting with a letter; up to 100 characters. */
  key: string;
  type: ContactCustomFieldType;
  description?: string;
  defaultValue?: string;
  isRequired?: boolean;
  /** 1 to 50 choices, for a `select` field. */
  options?: string[];
}

export type ContactCustomFieldUpdateParams = Partial<
  Omit<ContactCustomFieldCreateParams, 'key' | 'type'>
>;

export interface ContactCustomFieldListParams extends OffsetPageParams {
  search?: string;
}

/**
 * Contact custom fields: the organization's own contact attributes
 *
 * Requires the `contacts:read` scope to read and `contacts:write` to change.
 */
export class ContactCustomFields extends APIResource {
  /**
   * Define a custom field
   *
   * @param params - The field
   * @param options - Request options
   * @returns The new field
   */
  create(
    params: ContactCustomFieldCreateParams,
    options?: RequestOptions,
  ): APIPromise<ContactCustomField> {
    return this.request(
      'POST',
      '/contact-custom-fields',
      { body: params, options },
      (data: { customField: ContactCustomField }) => data.customField,
    );
  }

  /**
   * Change a custom field; its key and type are fixed
   *
   * @param fieldId - The field
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated field
   */
  update(
    fieldId: string,
    params: ContactCustomFieldUpdateParams,
    options?: RequestOptions,
  ): APIPromise<ContactCustomField> {
    return this.request(
      'PATCH',
      this.path`/contact-custom-fields/${fieldId}`,
      { body: params, options },
      (data: { customField: ContactCustomField }) => data.customField,
    );
  }

  /**
   * List custom fields
   *
   * @param params - Search and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every field
   */
  list(
    params: ContactCustomFieldListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactCustomField>, ContactCustomField> {
    return this.offsetList('/contact-custom-fields', { query: params, options });
  }

  /**
   * List every custom field in one reply
   *
   * @param options - Request options
   * @returns All the organization's custom fields
   */
  listAll(options?: RequestOptions): APIPromise<ContactCustomField[]> {
    return this.request('GET', '/contact-custom-fields/all', { options });
  }

  /**
   * Delete a custom field
   *
   * @param fieldId - The field
   * @param options - Request options
   * @returns A promise that resolves once the field is deleted
   */
  delete(fieldId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/contact-custom-fields/${fieldId}`, { options });
  }
}
