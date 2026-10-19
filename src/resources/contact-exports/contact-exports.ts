import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type { Timestamp } from '../shared';

export type ContactExportFormat = 'csv' | 'json';
export type ContactExportStatus = 'processing' | 'completed' | 'failed';

export interface ContactExportFilter {
  type: 'all' | 'active' | 'list' | 'segment';
  /** Required when `type` is `list`. */
  listId?: string;
  /** Required when `type` is `segment`. */
  segmentId?: string;
}

/**
 * An export. Mirrors the `ContactExport` model.
 */
export interface ContactExport {
  id: string;
  organizationId: string;
  format: ContactExportFormat;
  filter: ContactExportFilter;
  fields: string[];
  description: string | null;
  totalContacts: number;
  status: ContactExportStatus;
  /** The file's storage path once the export completes; use `download` for a link. */
  downloadUrl: string | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

export interface ContactExportCreateParams {
  format: ContactExportFormat;
  filter: ContactExportFilter;
  /** The contact fields to include, at least one. */
  fields: string[];
}

/**
 * Contact exports: a file of contacts, built in the background
 *
 * Requires the `contacts:read` scope to read and `contacts:write` to start one.
 */
export class ContactExports extends APIResource {
  /**
   * Start an export
   *
   * @param params - The format, the contacts to include and their fields
   * @param options - Request options
   * @returns The export, which runs in the background
   */
  create(params: ContactExportCreateParams, options?: RequestOptions): APIPromise<ContactExport> {
    return this.request(
      'POST',
      '/contact-exports',
      { body: params, options },
      (data: { export: ContactExport }) => data.export,
    );
  }

  /**
   * Fetch an export, to follow its progress
   *
   * @param exportId - The export
   * @param options - Request options
   * @returns The export
   */
  retrieve(exportId: string, options?: RequestOptions): APIPromise<ContactExport> {
    return this.request(
      'GET',
      this.path`/contact-exports/${exportId}`,
      { options },
      (data: { export: ContactExport }) => data.export,
    );
  }

  /**
   * List exports, newest first
   *
   * @param params - Page and page size
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every export
   */
  list(
    params: OffsetPageParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<ContactExport>, ContactExport> {
    return this.offsetList('/contact-exports', { query: params, options });
  }

  /**
   * Get a link to a completed export's file
   *
   * The link is signed and expires after two minutes; fetch it without an `Authorization`
   * header. An export that is still running answers `NotFoundError`, so poll `retrieve` until
   * its `status` is `completed` first.
   *
   * @param exportId - The export
   * @param options - Request options
   * @returns The signed URL
   */
  download(exportId: string, options?: RequestOptions): APIPromise<{ url: string }> {
    return this.request('GET', this.path`/contact-exports/${exportId}/download`, { options });
  }
}
