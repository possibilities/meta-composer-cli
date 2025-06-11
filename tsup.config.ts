import { defineConfig } from 'tsup'
import { copyFileSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  entry: {
    cli: 'src/index.ts',
  },
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  dts: false,
  bundle: true,
  outExtension() {
    return {
      js: '.js',
    }
  },
  esbuildOptions(options) {
    options.banner = {
      js: '#!/usr/bin/env node',
    }
    // Ensure proper module resolution
    options.platform = 'node'
    options.format = 'esm'
  },
  onSuccess: async () => {
    // Copy meta.yaml to dist directory
    copyFileSync('meta.yaml', join('dist', 'meta.yaml'))
    console.log('Copied meta.yaml to dist/')
  },
})
