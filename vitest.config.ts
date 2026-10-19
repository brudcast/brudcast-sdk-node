import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/resources/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        'src/core/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/webhooks/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/internal/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
      },
    },
  },
});
