import { expect, test } from 'vitest'
import { prerender, sitemap } from './seo'

test('a tool route prerenders its own head around the rendered body', () => {
  const html = prerender('<title>x</title><div id="root"></div>', '/merge', '<main>$&</main>')
  expect(html).toContain('<title>Merge PDF files online')
  expect(html).toContain('<link rel="canonical" href="https://fuckpdf.reqhiem.dev/merge" />')
  expect(html).toContain('"@type":"BreadcrumbList"')
  expect(html).toContain('<div id="root"><main>$&</main></div>')
  expect(sitemap()).toContain('<loc>https://fuckpdf.reqhiem.dev/pdf-to-jpg</loc>')
})
