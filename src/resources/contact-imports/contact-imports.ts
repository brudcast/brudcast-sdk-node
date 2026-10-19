import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import { toFile, type Uploadable } from '../../core/uploads';
import type { Timestamp } from '../shared';

export type ContactImportStatus = 'uploaded' | 'pending' | 'processing' | 'completed' | 'failed';
export type ContactImportDuplicateHandling = 'skip' | 'update' | 'create_new';

/**
 * Which contact field a CSV column fills. `brudcastField` is a contact field such as `email`
 * or `firstName`, or `custom_field:<key>`.
 */
export interface FieldMapping {
  csvHeader: string;
  brudcastField: string;
}

/**
 * An import. Mirrors the `ContactImport` model.
 */
export interface ContactImport {
  id: string;
  organizationId: string;
  fileName: string;
  filePath: string;
  status: ContactImportStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  newCount: number;
  duplicateCount: number;
  duplicateHandling: ContactImportDuplicateHandling;
  allowPartialUpload: boolean;
  listName: string | null;
  tags: string[];
  consentConfirmed: boolean;
  fieldMappings: FieldMapping[];
  errorsFilePath: string | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  reservedContacts?: number;
  reservationExpiresAt?: Timestamp | null;
}

/**
 * An uploaded file waiting to be imported, with the mappings the API suggests for its columns
 */
export interface ContactImportUpload {
  /** Pass as `uploadId` to `create`, and to `preview`. */
  id: string;
  fileName: string;
  totalRows: number;
  csvHeaders: string[];
  suggestedMappings: FieldMapping[];
}

export interface ContactImportPreview {
  totalRows: number;
  newCount: number;
  duplicateCount: number;
  errorCount: number;
  sampleErrors: { row: number; reason: string }[];
  contactsRemaining: number;
  exceedsContactLimit: boolean;
}

export interface ContactImportPreviewParams {
  fieldMappings: FieldMapping[];
  duplicateHandling: ContactImportDuplicateHandling;
  allowPartialUpload?: boolean;
}

export interface ContactImportCreateParams extends ContactImportPreviewParams {
  /** The `id` from `upload`. */
  uploadId: string;
  /** A list to create and add the imported contacts to. */
  listName?: string | null;
  tags?: string[];
  /** Must be `true`: you confirm you have consent to contact these people. */
  consentConfirmed: boolean;
}

/**
 * Contact imports from CSV: upload a file, preview the result, then start the import
 *
 * Requires the `contacts:read` scope to read and `contacts:write` to change.
 */
export class ContactImports extends APIResource {
  /**
   * Upload a CSV file of up to 10 MB
   *
   * @param file - The CSV, as a `File`, `Blob`, bytes or a stream such as `fs.createReadStream`
   * @param options - Request options; uploads are never retried after they may have arrived
   * @returns The upload, with its columns and suggested mappings
   */
  upload(file: Uploadable, options?: RequestOptions): APIPromise<ContactImportUpload> {
    const body = toFile(file, undefined, { type: 'text/csv' }).then((csv) => {
      const form = new FormData();
      form.append('file', csv, csv.name.endsWith('.csv') ? csv.name : `${csv.name}.csv`);

      return form;
    });

    return this.requestAsync(
      'POST',
      '/contact-imports/upload',
      body.then((form) => ({ body: form, options })),
      (data: { upload: ContactImportUpload }) => data.upload,
    );
  }

  /**
   * Count what an import would create, update and reject, without importing
   *
   * @param importId - The `id` from `upload`
   * @param params - The column mappings and duplicate handling
   * @param options - Request options
   * @returns The counts and a sample of row errors
   */
  preview(
    importId: string,
    params: ContactImportPreviewParams,
    options?: RequestOptions,
  ): APIPromise<ContactImportPreview> {
    return this.request(
      'POST',
      this.path`/contact-imports/${importId}/preview`,
      { body: params, options },
      (data: { preview: ContactImportPreview }) => data.preview,
    );
  }

  /**
   * Start importing an uploaded file
   *
   * @param params - The upload, mappings, duplicate handling and consent confirmation
   * @param options - Request options
   * @returns The import, which runs in the background
   */
  create(params: ContactImportCreateParams, options?: RequestOptions): APIPromise<ContactImport> {
    return this.request(
      'POST',
      '/contact-imports',
      { body: params, options },
      (data: { import: ContactImport }) => data.import,
    );
  }

  /**
   * Fetch an import, to follow its progress
   *
   * @param importId - The import
   * @param options - Request options
   * @returns The import
   */
  retrieve(importId: string, options?: RequestOptions): APIPromise<ContactImport> {
    return this.request(
      'GET',
      this.path`/contact-imports/${importId}`,
      { options },
      (data: { import: ContactImport }) => data.import,
    );
  }

  /**
   * List imports, newest first
   *
   * @param params - Page and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every import
   */
  list(
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactImport>, ContactImport> {
    return this.offsetList('/contact-imports', { query: params, options });
  }

  /**
   * Get a link to the CSV of rows an import rejected
   *
   * The link is signed and expires after two minutes; fetch it without an `Authorization`
   * header. An import with no rejected rows answers `NotFoundError`.
   *
   * @param importId - The import
   * @param options - Request options
   * @returns The signed URL and the file's storage path
   */
  errors(
    importId: string,
    options?: RequestOptions,
  ): APIPromise<{ url: string; errorsFilePath: string }> {
    return this.request('GET', this.path`/contact-imports/${importId}/errors`, { options });
  }
}
