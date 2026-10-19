/**
 * A reply as the transport hands it over: the `Response` and its body, parsed when it was JSON
 */
export interface RawReply {
  response: Response;
  body: unknown;
}

/**
 * The promise every API method returns
 *
 * Awaiting it gives the parsed result. `.withResponse()` gives the result together with the raw
 * `Response`, for headers such as `X-RateLimit-Remaining` and `X-Request-Id`, and `.asResponse()`
 * gives the `Response` alone. The request is sent when the method is called, not when it is
 * awaited.
 */
export class APIPromise<T> implements PromiseLike<T> {
  private parsed: Promise<T> | undefined;

  /**
   * Wrap a pending reply
   *
   * The reply is marked handled at once, so a caller who awaits the promise later than the
   * request fails does not see an unhandled rejection; the failure still reaches them on await.
   *
   * @param replyPromise - The transport's pending reply
   * @param parse - Turns the reply into the method's result
   */
  constructor(
    protected readonly replyPromise: Promise<RawReply>,
    private readonly parse: (reply: RawReply) => T | Promise<T>,
  ) {
    replyPromise.catch(() => undefined);
  }

  /**
   * Resolve to the raw `Response`, without reading the result
   *
   * @returns The reply's `Response`; its body has already been read
   */
  asResponse(): Promise<Response> {
    return this.replyPromise.then((reply) => reply.response);
  }

  /**
   * Resolve to the result and the raw `Response` together
   *
   * @returns The parsed result as `data`, and the reply's `Response`
   */
  async withResponse(): Promise<{ data: T; response: Response }> {
    const [data, reply] = await Promise.all([this.result(), this.replyPromise]);

    return { data, response: reply.response };
  }

  /**
   * Parse the reply once, however many times the promise is awaited
   *
   * @returns The parsed result
   */
  private result(): Promise<T> {
    this.parsed ??= this.replyPromise.then(this.parse);

    return this.parsed;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.result().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult> {
    return this.result().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<T> {
    return this.result().finally(onfinally);
  }

  get [Symbol.toStringTag](): string {
    return 'APIPromise';
  }
}
