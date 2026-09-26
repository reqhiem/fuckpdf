import { expect, test } from 'vitest'
import html from '../index.html?raw'
import headers from '../public/_headers?raw'

test('the CSP allows the inline theme script by its hash', async () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(script))
  const hash = btoa(String.fromCharCode(...new Uint8Array(digest)))
  expect(script).toContain('localStorage')
  expect(headers).toContain(`'sha256-${hash}'`)
})
