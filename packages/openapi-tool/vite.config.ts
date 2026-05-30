import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const packageRoot = fileURLToPath(new URL('.', import.meta.url))
const runtimeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
])

export default defineConfig({
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    reportCompressedSize: false,
    lib: {
      entry: resolve(packageRoot, 'src/cli.ts'),
      formats: ['es'],
      fileName: () => 'openapi-tool.mjs',
    },
    rollupOptions: {
      external: (id) => runtimeBuiltins.has(id),
      output: {
        banner: '#!/usr/bin/env bun',
        inlineDynamicImports: true,
      },
    },
  },
})
