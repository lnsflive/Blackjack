import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const violations: string[] = []
const sourceDirectories = ['app', 'game', 'scripts', 'tests']
const forbiddenExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs'])

async function inspect(path: string): Promise<void> {
  if (forbiddenExtensions.has(extname(path))) violations.push(`${path}: use TypeScript`)
  if (extname(path) === '.vue') {
    const content = await readFile(path, 'utf8')
    for (const match of content.matchAll(/<script\b([^>]*)>/g)) {
      const attributes = match[1] ?? ''
      if (!/\bsetup\b/.test(attributes) || !/\blang=["']ts["']/.test(attributes)) {
        violations.push(`${path}: use <script setup lang="ts">`)
      }
    }
  }
}

async function walk(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path)
    else await inspect(path)
  }
}

for (const directory of sourceDirectories) await walk(directory)
for (const entry of await readdir('.', { withFileTypes: true })) {
  if (entry.isFile()) await inspect(entry.name)
}
if (violations.length) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else console.log('Source policy passed: TypeScript and Vue Composition API only.')
