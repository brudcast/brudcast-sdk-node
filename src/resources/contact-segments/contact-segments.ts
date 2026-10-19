import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions, Transport } from '../../core/transport';
import type { Contact } from '../contacts/types';
import type { Timestamp } from '../shared';

export type ContactSegmentType = 'dynamic' | 'static';
export type ContactSegmentMatchMode = 'all' | 'any';

/** Mirrors `SegmentRuleField`. */
export type SegmentRuleField =
  | 'email_status'
  | 'sms_status'
  | 'contact_status'
  | 'tag'
  | 'language'
  | 'timezone'
  | 'created_at'
  | 'last_activity'
  | 'custom_field';

/** Mirrors `SegmentRuleOperator`. */
export type SegmentRuleOperator =
  | 'is'
  | 'is_not'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_set'
  | 'is_not_set'
  | 'before'
  | 'after'
  | 'on'
  | 'between'
  | 'in_last'
  | 'greater_than'
  | 'less_than';

export interface SegmentRule {
  id: string;
  segmentId: string;
  field: SegmentRuleField;
  operator: SegmentRuleOperator;
  value: unknown;
  customFieldKey: string | null;
  sortOrder: number;
}

/**
 * A segment. Mirrors `ContactSegmentTransformer`; `rules` is present when the API loaded them.
 */
export interface ContactSegment {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  type: ContactSegmentType;
  matchMode: ContactSegmentMatchMode;
  contactCount: number;
  /** When a static segment's members were last frozen. */
  frozenAt: Timestamp | null;
  /** The dynamic segment a snapshot was taken from. */
  sourceSegmentId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  rules?: SegmentRule[];
  sourceSegment?: ContactSegment | null;
}

export interface SegmentRuleInput {
  field: SegmentRuleField;
  operator: SegmentRuleOperator;
  value?: unknown;
  /** Required when `field` is `custom_field`. */
  customFieldKey?: string;
}

export interface ContactSegmentCreateParams {
  /** 1 to 255 characters. */
  name: string;
  description?: string;
  type: ContactSegmentType;
  matchMode: ContactSegmentMatchMode;
  rules?: SegmentRuleInput[];
}

export type ContactSegmentUpdateParams = Partial<Omit<ContactSegmentCreateParams, 'type'>>;

export interface ContactSegmentListParams extends OffsetPageParams {
  search?: string;
  type?: ContactSegmentType;
}

export interface ContactSegmentPreviewCountParams {
  matchMode: ContactSegmentMatchMode;
  /** Up to 50 rules. */
  rules: SegmentRuleInput[];
}

export interface ContactSegmentStatistics {
  totalSegments: number;
  dynamicSegments: number;
  staticSegments: number;
}

type SegmentReply = { segment: ContactSegment };
const selectSegment = (data: SegmentReply): ContactSegment => data.segment;

/**
 * Contact segments: audiences defined by rules (dynamic) or by a fixed membership (static)
 *
 * Requires the `contacts:read` scope to read and `contacts:write` to change.
 */
export class ContactSegments extends APIResource {
  readonly contacts: ContactSegmentContacts;

  constructor(transport: Transport) {
    super(transport);
    this.contacts = new ContactSegmentContacts(transport);
  }

  /**
   * Create a segment
   *
   * @param params - The segment and its rules
   * @param options - Request options
   * @returns The new segment with its rules
   */
  create(params: ContactSegmentCreateParams, options?: RequestOptions): APIPromise<ContactSegment> {
    return this.request('POST', '/contact-segments', { body: params, options }, selectSegment);
  }

  /**
   * Fetch a segment with its rules and source segment
   *
   * @param segmentId - The segment
   * @param options - Request options
   * @returns The segment
   */
  retrieve(segmentId: string, options?: RequestOptions): APIPromise<ContactSegment> {
    return this.request(
      'GET',
      this.path`/contact-segments/${segmentId}`,
      { options },
      selectSegment,
    );
  }

  /**
   * Change a segment; its type is fixed
   *
   * @param segmentId - The segment
   * @param params - The fields to change; `rules` replaces every rule
   * @param options - Request options
   * @returns The updated segment with its rules
   */
  update(
    segmentId: string,
    params: ContactSegmentUpdateParams,
    options?: RequestOptions,
  ): APIPromise<ContactSegment> {
    return this.request(
      'PATCH',
      this.path`/contact-segments/${segmentId}`,
      { body: params, options },
      selectSegment,
    );
  }

  /**
   * List segments, newest first
   *
   * @param params - Search, type and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every segment
   */
  list(
    params: ContactSegmentListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactSegment>, ContactSegment> {
    return this.offsetList('/contact-segments', { query: params, options });
  }

  /**
   * Delete a segment; its contacts are kept
   *
   * @param segmentId - The segment
   * @param options - Request options
   * @returns A promise that resolves once the segment is deleted
   */
  delete(segmentId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/contact-segments/${segmentId}`, { options });
  }

  /**
   * Count the contacts a set of rules matches, without saving a segment
   *
   * @param params - The match mode and rules
   * @param options - Request options
   * @returns The number of matching contacts
   */
  previewCount(
    params: ContactSegmentPreviewCountParams,
    options?: RequestOptions,
  ): APIPromise<{ contactCount: number }> {
    return this.request('POST', '/contact-segments/preview-count', { body: params, options });
  }

  /**
   * Count the organization's segments by type
   *
   * @param options - Request options
   * @returns The counts
   */
  statistics(options?: RequestOptions): APIPromise<ContactSegmentStatistics> {
    return this.request(
      'GET',
      '/contact-segments/statistics',
      { options },
      (data: { statistics: ContactSegmentStatistics }) => data.statistics,
    );
  }

  /**
   * Freeze a dynamic segment's current members into a new static segment
   *
   * @param segmentId - The dynamic segment
   * @param options - Request options
   * @returns The new static segment
   */
  snapshot(segmentId: string, options?: RequestOptions): APIPromise<ContactSegment> {
    return this.action(segmentId, 'snapshot', options);
  }

  /**
   * Turn a dynamic segment into a static one, keeping its current members
   *
   * @param segmentId - The dynamic segment
   * @param options - Request options
   * @returns The converted segment
   */
  convert(segmentId: string, options?: RequestOptions): APIPromise<ContactSegment> {
    return this.action(segmentId, 'convert', options);
  }

  /**
   * Re-run a snapshot's source rules and replace its members
   *
   * @param segmentId - The static snapshot
   * @param options - Request options
   * @returns The refreshed segment
   */
  refresh(segmentId: string, options?: RequestOptions): APIPromise<ContactSegment> {
    return this.action(segmentId, 'refresh', options);
  }

  /**
   * Recount a segment's members
   *
   * @param segmentId - The segment
   * @param options - Request options
   * @returns The segment with its new `contactCount`
   */
  refreshCount(segmentId: string, options?: RequestOptions): APIPromise<ContactSegment> {
    return this.action(segmentId, 'refresh-count', options);
  }

  /**
   * Run one of the segment actions that answer with the segment
   *
   * @param segmentId - The segment
   * @param action - The action's path segment
   * @param options - Request options
   * @returns The segment
   */
  private action(
    segmentId: string,
    action: string,
    options?: RequestOptions,
  ): APIPromise<ContactSegment> {
    return this.request(
      'POST',
      `${this.path`/contact-segments/${segmentId}`}/${action}`,
      { options },
      selectSegment,
    );
  }
}

/**
 * A segment's members: `/contact-segments/:id/contacts`
 */
export class ContactSegmentContacts extends APIResource {
  /**
   * List a segment's contacts
   *
   * @param segmentId - The segment
   * @param params - Page and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every contact
   */
  list(
    segmentId: string,
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<Contact>, Contact> {
    return this.offsetList(this.path`/contact-segments/${segmentId}/contacts`, {
      query: params,
      options,
    });
  }

  /**
   * Add up to 1000 contacts to a static segment
   *
   * @param segmentId - The static segment
   * @param params - The contact ids
   * @param options - Request options
   * @returns How many were added
   */
  add(
    segmentId: string,
    params: { contactIds: string[] },
    options?: RequestOptions,
  ): APIPromise<{ addedCount: number }> {
    return this.request('POST', this.path`/contact-segments/${segmentId}/contacts`, {
      body: params,
      options,
    });
  }

  /**
   * Remove up to 1000 contacts from a static segment
   *
   * @param segmentId - The static segment
   * @param params - The contact ids
   * @param options - Request options
   * @returns How many were removed
   */
  remove(
    segmentId: string,
    params: { contactIds: string[] },
    options?: RequestOptions,
  ): APIPromise<{ removedCount: number }> {
    return this.request('POST', this.path`/contact-segments/${segmentId}/contacts/remove`, {
      body: params,
      options,
    });
  }
}
