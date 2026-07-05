import { readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8')) as {
  version: string
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    target: 'es2022',
    lib: {
      entry: resolve(rootDir, 'src/cli.ts'),
      formats: ['es'],
      fileName: () => 'cli.js'
    },
    rollupOptions: {
      external: [
        '@djd/game-core',
        ...builtinModules,
        ...builtinModules.map((module) => `node:${module}`)
      ],
      output: {
        banner: '#!/usr/bin/env bun',
        paths: {
          '@djd/game-core': './core/dist/index.js'
        }
      }
    },
    minify: false,
    sourcemap: true
  }
})
