/**
 * Anything the SDK accepts as a file to upload
 *
 * A `File` or `Blob` as is; bytes as a `Uint8Array` (a Node `Buffer` is one) or `ArrayBuffer`;
 * a web `ReadableStream` or any async iterable of bytes, such as `fs.createReadStream(path)`.
 */
export type Uploadable =
  | File
  | Blob
  | Uint8Array
  | ArrayBuffer
  | ReadableStream<Uint8Array>
  | AsyncIterable<Uint8Array | string>;

/**
 * Turn an upload into a `File` with a name and a type
 *
 * A stream is read into memory first, since the upload limits of the API are small enough for
 * that. A stream from `fs.createReadStream` lends its file name when none is given.
 *
 * @param input - The upload
 * @param name - The file name sent to the API; defaults to the input's own name, else `upload`
 * @param options - The MIME type, when the input's own is missing or wrong
 * @returns A `File` ready to put in a `FormData`
 * @throws {TypeError} When the input is none of the accepted kinds
 */
export async function toFile(
  input: Uploadable,
  name?: string,
  options: { type?: string } = {},
): Promise<File> {
  const fileName = name ?? nameOf(input) ?? 'upload';

  if (input instanceof Blob) {
    const type = options.type ?? input.type;

    return input instanceof File && name === undefined && options.type === undefined
      ? input
      : new File([input], fileName, type ? { type } : {});
  }

  const parts = await partsOf(input);

  return new File(parts, fileName, options.type ? { type: options.type } : {});
}

/**
 * Read the bytes of an upload that is not a `Blob`
 *
 * @param input - The upload
 * @returns Its content as parts for the `File` constructor
 * @throws {TypeError} When the input is none of the accepted kinds
 */
async function partsOf(input: Exclude<Uploadable, Blob>): Promise<BlobPart[]> {
  if (input instanceof Uint8Array) return [input as Uint8Array<ArrayBuffer>];
  if (input instanceof ArrayBuffer) return [input];

  if (typeof (input as ReadableStream).getReader === 'function') {
    const reader = (input as ReadableStream<Uint8Array>).getReader();
    const parts: BlobPart[] = [];

    for (;;) {
      const { done, value } = await reader.read();
      if (done) return parts;
      parts.push(value as Uint8Array<ArrayBuffer>);
    }
  }

  if (typeof (input as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function') {
    const parts: BlobPart[] = [];

    for await (const chunk of input as AsyncIterable<Uint8Array | string>) {
      parts.push(chunk as BlobPart);
    }

    return parts;
  }

  throw new TypeError(
    'Expected a File, Blob, Uint8Array, ArrayBuffer, ReadableStream or async iterable to upload.',
  );
}

/**
 * Find the name an upload carries with it
 *
 * @param input - The upload
 * @returns The base name of a `File` or a file stream's path, or undefined
 */
function nameOf(input: Uploadable): string | undefined {
  if (input instanceof File && input.name) return input.name;

  const path = (input as { path?: unknown }).path;
  if (typeof path === 'string' && path !== '') return path.split(/[\\/]/).pop();

  return undefined;
}
