import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions, Transport } from '../../core/transport';
import type {
  ContactForm,
  ContactFormAnalytics,
  ContactFormCreateParams,
  ContactFormField,
  ContactFormFieldInput,
  ContactFormKind,
  ContactFormListParams,
  ContactFormPlacement,
  ContactFormPlacementAnalytics,
  ContactFormPlacementCreateParams,
  ContactFormPlacementUpdateParams,
  ContactFormReadiness,
  ContactFormSchema,
  ContactFormStatistics,
  ContactFormSubmission,
  ContactFormSubmissionCreateParams,
  ContactFormSubmissionListParams,
  ContactFormUpdateParams,
} from './types';

/**
 * Contact forms: signup forms and questionnaire pages
 *
 * Requires the `forms:read` scope to read and `forms:write` to change; submissions and uploads
 * need `form_submissions:read` and `form_submissions:write` instead.
 */
export class ContactForms extends APIResource {
  readonly fields: ContactFormFields;
  readonly submissions: ContactFormSubmissions;
  readonly uploads: ContactFormUploads;
  readonly placements: ContactFormPlacements;

  constructor(transport: Transport) {
    super(transport);
    this.fields = new ContactFormFields(transport);
    this.submissions = new ContactFormSubmissions(transport);
    this.uploads = new ContactFormUploads(transport);
    this.placements = new ContactFormPlacements(transport);
  }

  /**
   * Create a draft form
   *
   * @param params - The form
   * @param options - Request options
   * @returns The new form
   */
  create(params: ContactFormCreateParams, options?: RequestOptions): APIPromise<ContactForm> {
    return this.request('POST', '/contact-forms', { body: params, options });
  }

  /**
   * Fetch a form with its fields and list
   *
   * @param formId - The form
   * @param options - Request options
   * @returns The form
   */
  retrieve(formId: string, options?: RequestOptions): APIPromise<ContactForm> {
    return this.request('GET', this.path`/contact-forms/${formId}`, { options });
  }

  /**
   * Change a form's settings; fields have their own method
   *
   * @param formId - The form
   * @param params - The settings to change
   * @param options - Request options
   * @returns The updated form
   */
  update(
    formId: string,
    params: ContactFormUpdateParams,
    options?: RequestOptions,
  ): APIPromise<ContactForm> {
    return this.request('PATCH', this.path`/contact-forms/${formId}`, { body: params, options });
  }

  /**
   * List forms
   *
   * @param params - Filters, sort and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every form
   */
  list(
    params: ContactFormListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactForm>, ContactForm> {
    return this.offsetList('/contact-forms', { query: params, options });
  }

  /**
   * Archive a form; its submissions are kept
   *
   * @param formId - The form
   * @param options - Request options
   * @returns A promise that resolves once the form is archived
   */
  delete(formId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/contact-forms/${formId}`, { options });
  }

  /**
   * Count forms, submissions and confirmations per kind of form
   *
   * @param options - Request options
   * @returns The counts for signup forms and for pages
   */
  statistics(options?: RequestOptions): APIPromise<Record<ContactFormKind, ContactFormStatistics>> {
    return this.request(
      'GET',
      '/contact-forms/statistics',
      { options },
      (data: { statistics: Record<ContactFormKind, ContactFormStatistics> }) => data.statistics,
    );
  }

  /**
   * Daily views, submissions and confirmations of a form
   *
   * @param formId - The form
   * @param params - How many days back, up to 365
   * @param options - Request options
   * @returns The totals and one point per day
   */
  analytics(
    formId: string,
    params: { days?: number } = {},
    options?: RequestOptions,
  ): APIPromise<ContactFormAnalytics> {
    return this.request(
      'GET',
      this.path`/contact-forms/${formId}/analytics`,
      { query: params, options },
      (data: { analytics: ContactFormAnalytics }) => data.analytics,
    );
  }

  /**
   * The fields `submissions.create` accepts for a form, by key
   *
   * @param formId - The form
   * @param options - Request options
   * @returns The schema
   */
  schema(formId: string, options?: RequestOptions): APIPromise<ContactFormSchema> {
    return this.request('GET', this.path`/contact-forms/${formId}/schema`, { options });
  }

  /**
   * Check whether a form can be published, and what is missing if not
   *
   * @param formId - The form
   * @param options - Request options
   * @returns The checks
   */
  readiness(formId: string, options?: RequestOptions): APIPromise<ContactFormReadiness> {
    return this.request(
      'GET',
      this.path`/contact-forms/${formId}/readiness`,
      { options },
      (data: { readiness: ContactFormReadiness }) => data.readiness,
    );
  }

  /**
   * Publish a form
   *
   * @param formId - The form
   * @param options - Request options
   * @returns The published form
   */
  publish(formId: string, options?: RequestOptions): APIPromise<ContactForm> {
    return this.request('POST', this.path`/contact-forms/${formId}/publish`, { options });
  }

  /**
   * Take a form offline
   *
   * @param formId - The form
   * @param options - Request options
   * @returns The form
   */
  unpublish(formId: string, options?: RequestOptions): APIPromise<ContactForm> {
    return this.request('POST', this.path`/contact-forms/${formId}/unpublish`, { options });
  }

  /**
   * Copy a form into a new draft
   *
   * @param formId - The form
   * @param params - The copy's name; defaults to the original's with a suffix
   * @param options - Request options
   * @returns The copy
   */
  duplicate(
    formId: string,
    params: { name?: string } = {},
    options?: RequestOptions,
  ): APIPromise<ContactForm> {
    return this.request('POST', this.path`/contact-forms/${formId}/duplicate`, {
      body: params,
      options,
    });
  }
}

/**
 * A form's fields: `/contact-forms/:formId/fields`
 */
export class ContactFormFields extends APIResource {
  /**
   * List a form's fields in order
   *
   * @param formId - The form
   * @param options - Request options
   * @returns The fields
   */
  list(formId: string, options?: RequestOptions): APIPromise<ContactFormField[]> {
    return this.request('GET', this.path`/contact-forms/${formId}/fields`, { options });
  }

  /**
   * Replace every field of a form, in the order given
   *
   * @param formId - The form
   * @param params - 1 to 50 fields; keep a field's `id` to keep its answers linked
   * @param options - Request options
   * @returns The saved fields
   */
  replace(
    formId: string,
    params: { fields: ContactFormFieldInput[] },
    options?: RequestOptions,
  ): APIPromise<ContactFormField[]> {
    return this.request('PUT', this.path`/contact-forms/${formId}/fields`, {
      body: params,
      options,
    });
  }
}

/**
 * A form's submissions: `/contact-forms/:formId/submissions`
 */
export class ContactFormSubmissions extends APIResource {
  /**
   * Submit a form from your own code, as if the person filled it in
   *
   * A repeat with the same `idempotencyKey` returns the first submission instead of a second.
   *
   * @param formId - The published form
   * @param params - The answers by field key, and the person's request context
   * @param options - Request options
   * @returns The submission
   */
  create(
    formId: string,
    params: ContactFormSubmissionCreateParams,
    options?: RequestOptions,
  ): APIPromise<ContactFormSubmission> {
    return this.request('POST', this.path`/contact-forms/${formId}/submissions`, {
      body: params,
      options,
    });
  }

  /**
   * List a form's submissions; a page form's carry their answers
   *
   * @param formId - The form
   * @param params - Filters, sort and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every submission
   */
  list(
    formId: string,
    params: ContactFormSubmissionListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactFormSubmission>, ContactFormSubmission> {
    return this.offsetList(this.path`/contact-forms/${formId}/submissions`, {
      query: params,
      options,
    });
  }

  /**
   * Send a pending submission's confirmation email again
   *
   * @param formId - The form
   * @param submissionId - The submission
   * @param options - Request options
   * @returns A promise that resolves once the email is queued
   */
  resend(formId: string, submissionId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid(
      'POST',
      this.path`/contact-forms/${formId}/submissions/${submissionId}/resend`,
      { options },
    );
  }

  /**
   * Delete a submission and its uploads
   *
   * @param formId - The form
   * @param submissionId - The submission
   * @param options - Request options
   * @returns A promise that resolves once the submission is deleted
   */
  delete(formId: string, submissionId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid(
      'DELETE',
      this.path`/contact-forms/${formId}/submissions/${submissionId}`,
      {
        options,
      },
    );
  }
}

/**
 * Files uploaded through a form's file fields
 */
export class ContactFormUploads extends APIResource {
  /**
   * Get a short-lived link to an uploaded file
   *
   * @param formId - The form
   * @param uploadId - The upload
   * @param params - `inline` to open in a browser, `attachment` (the default) to download
   * @param options - Request options
   * @returns The signed URL and the file's details
   */
  downloadUrl(
    formId: string,
    uploadId: string,
    params: { disposition?: 'inline' | 'attachment' } = {},
    options?: RequestOptions,
  ): APIPromise<{ url: string; fileName: string; contentType: string; byteSize: number }> {
    return this.request(
      'GET',
      this.path`/contact-forms/${formId}/uploads/${uploadId}/download-url`,
      {
        query: params,
        options,
      },
    );
  }
}

/**
 * Where and when a popup form shows: `/contact-forms/:formId/placements`
 */
export class ContactFormPlacements extends APIResource {
  /**
   * Create a draft placement on a website
   *
   * @param formId - The popup form
   * @param params - The website, format, trigger, targeting and frequency
   * @param options - Request options
   * @returns The new placement
   */
  create(
    formId: string,
    params: ContactFormPlacementCreateParams,
    options?: RequestOptions,
  ): APIPromise<ContactFormPlacement> {
    return this.request('POST', this.path`/contact-forms/${formId}/placements`, {
      body: params,
      options,
    });
  }

  /**
   * Fetch a placement
   *
   * @param formId - The form
   * @param placementId - The placement
   * @param options - Request options
   * @returns The placement
   */
  retrieve(
    formId: string,
    placementId: string,
    options?: RequestOptions,
  ): APIPromise<ContactFormPlacement> {
    return this.request('GET', this.path`/contact-forms/${formId}/placements/${placementId}`, {
      options,
    });
  }

  /**
   * Change a placement
   *
   * @param formId - The form
   * @param placementId - The placement
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated placement
   */
  update(
    formId: string,
    placementId: string,
    params: ContactFormPlacementUpdateParams,
    options?: RequestOptions,
  ): APIPromise<ContactFormPlacement> {
    return this.request('PATCH', this.path`/contact-forms/${formId}/placements/${placementId}`, {
      body: params,
      options,
    });
  }

  /**
   * List a form's placements, with their impressions and submissions
   *
   * @param formId - The form
   * @param params - Page and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every placement
   */
  list(
    formId: string,
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactFormPlacement>, ContactFormPlacement> {
    return this.offsetList(this.path`/contact-forms/${formId}/placements`, {
      query: params,
      options,
    });
  }

  /**
   * Delete a placement
   *
   * @param formId - The form
   * @param placementId - The placement
   * @param options - Request options
   * @returns A promise that resolves once the placement is deleted
   */
  delete(formId: string, placementId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid(
      'DELETE',
      this.path`/contact-forms/${formId}/placements/${placementId}`,
      {
        options,
      },
    );
  }

  /**
   * Put a placement live
   *
   * @param formId - The form, which must be published
   * @param placementId - The placement
   * @param options - Request options
   * @returns The live placement
   */
  publish(
    formId: string,
    placementId: string,
    options?: RequestOptions,
  ): APIPromise<ContactFormPlacement> {
    return this.request(
      'POST',
      this.path`/contact-forms/${formId}/placements/${placementId}/publish`,
      {
        options,
      },
    );
  }

  /**
   * Stop showing a placement
   *
   * @param formId - The form
   * @param placementId - The placement
   * @param options - Request options
   * @returns The paused placement
   */
  pause(
    formId: string,
    placementId: string,
    options?: RequestOptions,
  ): APIPromise<ContactFormPlacement> {
    return this.request(
      'POST',
      this.path`/contact-forms/${formId}/placements/${placementId}/pause`,
      {
        options,
      },
    );
  }

  /**
   * Copy a placement as an A/B variant of it
   *
   * @param formId - The form
   * @param placementId - The placement
   * @param options - Request options
   * @returns The variant
   */
  variant(
    formId: string,
    placementId: string,
    options?: RequestOptions,
  ): APIPromise<ContactFormPlacement> {
    return this.request(
      'POST',
      this.path`/contact-forms/${formId}/placements/${placementId}/variant`,
      {
        options,
      },
    );
  }

  /**
   * Daily impressions, submissions and closes of a placement
   *
   * @param formId - The form
   * @param placementId - The placement
   * @param params - How many days back, up to 365
   * @param options - Request options
   * @returns The totals and one point per day
   */
  analytics(
    formId: string,
    placementId: string,
    params: { days?: number } = {},
    options?: RequestOptions,
  ): APIPromise<ContactFormPlacementAnalytics> {
    return this.request(
      'GET',
      this.path`/contact-forms/${formId}/placements/${placementId}/analytics`,
      {
        query: params,
        options,
      },
    );
  }
}
