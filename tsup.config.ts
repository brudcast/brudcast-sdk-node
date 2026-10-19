import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', webhooks: 'src/webhooks/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  target: 'node20',
});
