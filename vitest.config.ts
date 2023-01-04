// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // options: https://vitest.dev/config/
    // includeSource: ['src/**/*.{js,ts}'],
    setupFiles: ['dotenv/config', './tests/env.setup.ts'], // load variables from .env file
    globals: true,
  },
});
