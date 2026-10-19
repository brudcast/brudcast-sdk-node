import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { toFile } from '../../src/index';
import { envelope, json, mockClient } from '../helpers';

describe('toFile', () => {
  it('keeps a named File as it is', async () => {
    const file = new File(['a'], 'list.csv', { type: 'text/csv' });

    expect(await toFile(file)).toBe(file);
  });

  it('renames or retypes a File, and names a Blob', async () => {
    const renamed = await toFile(new File(['a'], 'list.csv'), 'other.csv');
    const retyped = await toFile(new File(['a'], 'list.csv'), undefined, { type: 'text/plain' });
    const blob = await toFile(new Blob(['a'], { type: 'text/csv' }));
    const untyped = await toFile(new Blob(['a']));

    expect(renamed.name).toBe('other.csv');
    expect(retyped.type).toBe('text/plain');
    expect(blob).toMatchObject({ name: 'upload', type: 'text/csv' });
    expect(untyped.type).toBe('');
  });

  it('reads bytes, buffers, web streams and async iterables', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('a,'));
        controller.enqueue(new TextEncoder().encode('b'));
        controller.close();
      },
    });
    async function* chunks() {
      yield 'x';
      yield new TextEncoder().encode('y');
    }

    expect(await (await toFile(new TextEncoder().encode('abc'))).text()).toBe('abc');
    expect(await (await toFile(new TextEncoder().encode('ab').buffer)).text()).toBe('ab');
    expect(await (await toFile(stream, 'a.csv', { type: 'text/csv' })).text()).toBe('a,b');
    expect(await (await toFile(chunks())).text()).toBe('xy');
  });

  it('takes the name of a file stream from its path', async () => {
    const stream = Object.assign(Readable.from([Buffer.from('a')]), {
      path: '/tmp/exports/people.csv',
    });

    expect((await toFile(stream)).name).toBe('people.csv');
  });

  it('refuses anything else', async () => {
    await expect(toFile(42 as never)).rejects.toThrow(TypeError);
  });
});

describe('contactImports.upload', () => {
  it('sends the file as multipart under "file", named .csv', async () => {
    const { client, requests } = mockClient(() =>
      json(envelope({ upload: { id: 'u1', fileName: 'people.csv' } }), { status: 201 }),
    );

    const upload = await client.contactImports.upload(new Blob(['email\na@example.com']));

    expect(upload).toEqual({ id: 'u1', fileName: 'people.csv' });
    const form = requests[0]?.body as FormData;
    const file = form.get('file') as File;
    expect(file.name).toBe('upload.csv');
    expect(file.type).toBe('text/csv');
    expect(requests[0]?.headers.get('content-type')).toBeNull();
  });

  it('keeps a name that already ends in .csv', async () => {
    const { client, requests } = mockClient(() => json(envelope({ upload: { id: 'u1' } })));

    await client.contactImports.upload(new File(['a'], 'people.csv'));

    expect(((requests[0]?.body as FormData).get('file') as File).name).toBe('people.csv');
  });
});
