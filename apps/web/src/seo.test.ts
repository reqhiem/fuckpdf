import { expect, test } from 'vitest'
import { prerender, sitemap } from './seo'

test('a tool route prerenders its own head and body', () => {
  const html = prerender('<title>x</title><div id="root"></div>', '/merge')
  expect(html).toContain('<title>Merge PDF files online')
  expect(html).toContain('<link rel="canonical" href="https://fuckpdf.reqhiem.dev/merge" />')
  expect(html).toContain('"@type":"BreadcrumbList"')
  expect(html).toContain('<h1>Merge PDF</h1>')
  expect(sitemap()).toContain('<loc>https://fuckpdf.reqhiem.dev/pdf-to-jpg</loc>')
})
