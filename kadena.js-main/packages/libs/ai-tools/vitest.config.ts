import baseConfig from '@kadena-dev/shared-config/vitest.config';
import { defineConfig, mergeConfig } from 'vitest/config';

const localConfig = defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      enabled: false,
      thresholds: {
        lines: 80,
        statements: 80,
      },
    },
  },
});

export default mergeConfig(baseConfig, localConfig);
