import { expect, test } from 'vitest'
import { run } from './jpg-to-pdf'

test('jpg-to-pdf throws on bad input', async () => {
  await expect(
    run([{ name: '1.jpg', bytes: new Uint8Array([1, 2, 3]) }], {
      pageSize: 'A4',
      orientation: 'portrait',
      margin: 0,
      fitMode: 'contain',
    }),
  ).rejects.toThrow()
})
