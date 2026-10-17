import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const authTest = fileURLToPath(new URL('../auth.cjs', import.meta.url))

describe('shared account integration', () => {
  test('passes the existing authentication scenarios', () => {
    const output = execFileSync(process.execPath, [authTest], { encoding: 'utf8' })

    expect(output).toContain('reserved-name protection passed')
  })
})
