import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'src/config': 'src/config.ts',
    'bin/cli': 'bin/cli.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node20',
  shims: false,
});
