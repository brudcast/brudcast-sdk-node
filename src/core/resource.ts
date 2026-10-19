import { APIPromise, type RawReply } from './api-promise';
import {
  CursorPage,
  OffsetPage,
  PagePromise,
  type CursorPageMeta,
  type OffsetPageMeta,
} from './pagination';
import type { FinalRequest, HTTPMethod, Host, RequestOptions, Transport } from './transport';
import { pathSegment } from '../internal/utils';

/**
 * The parts of a request a resource method fills in
 */
export interface RequestParts {
  query?: Record<string, unknown> | object | undefined;
  body?: unknown;
  options?: RequestOptions | undefined;
  host?: Host;
}

/**
 * The base of every resource: sends requests through the client's transport and unwraps the
 * API's `{ success, message, data }` envelope
 */
export abstract class APIResource {
  constructor(protected readonly transport: Transport) {}

  /**
   * Send a request and resolve to the envelope's `data`
   *
   * @param method - The HTTP method
   * @param path - The path below the service's prefix, from `this.path`
   * @param parts - The query, body, options and host
   * @param select - Picks the result out of `data`, for the few replies that wrap it in a key
   * @returns The pending result
   */
  protected request<T>(
    method: HTTPMethod,
    path: string,
    parts: RequestParts = {},
    select?: (data: never) => T,
  ): APIPromise<T> {
    return new APIPromise(this.sendRequest(method, path, parts), (reply) => {
      const data = unwrapData<T>(reply);

      return select && data !== undefined ? select(data as never) : data;
    });
  }

  /**
   * Send a request whose parts have to be prepared first, such as a multipart upload
   *
   * @param method - The HTTP method
   * @param path - The path
   * @param parts - Resolves to the query, body, options and host
   * @param select - Picks the result out of `data`
   * @returns The pending result
   */
  protected requestAsync<T>(
    method: HTTPMethod,
    path: string,
    parts: Promise<RequestParts>,
    select?: (data: never) => T,
  ): APIPromise<T> {
    return new APIPromise(
      parts.then((ready) => this.sendRequest(method, path, ready)),
      (reply) => {
        const data = unwrapData<T>(reply);

        return select && data !== undefined ? select(data as never) : data;
      },
    );
  }

  /**
   * Send a request whose reply carries nothing worth returning, such as a delete
   *
   * @param method - The HTTP method
   * @param path - The path
   * @param parts - The query, body and options
   * @returns A promise that resolves when the API accepts the request
   */
  protected requestVoid(
    method: HTTPMethod,
    path: string,
    parts: RequestParts = {},
  ): APIPromise<void> {
    return new APIPromise(this.sendRequest(method, path, parts), () => undefined);
  }

  /**
   * Send a request for one page of an offset-paged list
   *
   * @param path - The path
   * @param parts - The query and options
   * @returns The first page, which is also iterable over every item
   */
  protected offsetList<Item, Meta extends OffsetPageMeta = OffsetPageMeta>(
    path: string,
    parts: RequestParts = {},
  ): PagePromise<OffsetPage<Item, Meta>, Item> {
    const request = this.finalRequest('GET', path, parts);

    return new PagePromise(
      this.transport.request(request),
      (reply) => new OffsetPage<Item, Meta>(this.transport, request, reply.body),
    );
  }

  /**
   * Send a request for one page of a cursor-paged list
   *
   * @param path - The path
   * @param parts - The query and options
   * @returns The first page, which is also iterable over every item
   */
  protected cursorList<Item, Meta extends CursorPageMeta = CursorPageMeta>(
    path: string,
    parts: RequestParts = {},
  ): PagePromise<CursorPage<Item, Meta>, Item> {
    const request = this.finalRequest('GET', path, parts);

    return new PagePromise(
      this.transport.request(request),
      (reply) => new CursorPage<Item, Meta>(this.transport, request, reply.body),
    );
  }

  /**
   * Build a path from literal parts and parameters, encoding each parameter
   *
   * @param strings - The literal parts
   * @param params - The ids and slugs between them
   * @returns The path
   * @throws {BrudcastError} When a parameter is not a non-empty string
   */
  protected path(strings: TemplateStringsArray, ...params: unknown[]): string {
    return strings.reduce(
      (path, part, index) =>
        path + part + (index < params.length ? pathSegment(params[index]) : ''),
      '',
    );
  }

  /**
   * Send a request through the transport
   *
   * @param method - The HTTP method
   * @param path - The path
   * @param parts - The query, body, options and host
   * @returns The pending reply
   */
  private sendRequest(method: HTTPMethod, path: string, parts: RequestParts): Promise<RawReply> {
    return this.transport.request(this.finalRequest(method, path, parts));
  }

  /**
   * Assemble a request
   *
   * @param method - The HTTP method
   * @param path - The path
   * @param parts - The query, body, options and host
   * @returns The request the transport sends
   */
  private finalRequest(method: HTTPMethod, path: string, parts: RequestParts): FinalRequest {
    return {
      method,
      host: parts.host ?? 'core',
      path,
      query: parts.query as Record<string, unknown> | undefined,
      body: parts.body,
      options: parts.options,
    };
  }
}

/**
 * Take `data` out of the API's envelope
 *
 * @param reply - The reply
 * @returns The envelope's `data`
 */
function unwrapData<T>(reply: RawReply): T {
  return (reply.body as { data?: T } | undefined)?.data as T;
}
