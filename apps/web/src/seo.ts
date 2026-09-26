import { TOOL_IDS, type ToolId } from '@fuckpdf/tools'
import en from './locales/en.json'

export const ORIGIN = 'https://fuckpdf.reqhiem.dev'

const STATIC_PAGES = ['about', 'privacy', 'licenses'] as const
type StaticPage = (typeof STATIC_PAGES)[number]

export const ROUTES = ['/', ...TOOL_IDS.map((id) => `/${id}`), ...STATIC_PAGES.map((p) => `/${p}`)]

type Tag = { tag: 'meta' | 'link'; key: string; attrs: Record<string, string> }

export type PageSeo = {
  title: string
  description: string
  url: string
  heading: string
  tags: Tag[]
  jsonLd: string
}

const isTool = (slug: string): slug is ToolId => (TOOL_IDS as readonly string[]).includes(slug)
const isStatic = (slug: string): slug is StaticPage =>
  (STATIC_PAGES as readonly string[]).includes(slug)

export function seoFor(pathname: string): PageSeo {
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  const key = isTool(slug) || isStatic(slug) ? slug : 'home'
  const { title, description } = en.seo.pages[key]
  const url = key === 'home' ? `${ORIGIN}/` : `${ORIGIN}/${key}`
  const heading = isTool(key) ? en.tools[key].name : isStatic(key) ? en[key].title : en.seo.site

  const meta = (attr: 'name' | 'property', name: string, content: string): Tag => ({
    tag: 'meta',
    key: `meta[${attr}="${name}"]`,
    attrs: { [attr]: name, content },
  })
  const tags: Tag[] = [
    meta('name', 'description', description),
    { tag: 'link', key: 'link[rel="canonical"]', attrs: { rel: 'canonical', href: url } },
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', en.seo.site),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', `${ORIGIN}/og/${isTool(key) ? key : 'home'}.png`),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
  ]

  const home = { '@type': 'ListItem', position: 1, name: en.seo.home, item: `${ORIGIN}/` }
  const graph: unknown[] = [
    {
      '@type': isTool(key) || key === 'home' ? 'WebApplication' : 'WebPage',
      name: key === 'home' ? en.seo.site : heading,
      url,
      description,
      ...(isTool(key) || key === 'home'
        ? {
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript and WebAssembly',
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          }
        : {}),
    },
  ]
  if (key !== 'home')
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [home, { '@type': 'ListItem', position: 2, name: heading, item: url }],
    })
  // `<` escaped so a string can never close the script element it sits in.
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
    /</g,
    '\\u003c',
  )

  return { title, description, url, heading, tags, jsonLd }
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function prerender(template: string, pathname: string, body: string): string {
  const page = seoFor(pathname)
  const head = [
    `<title>${escapeHtml(page.title)}</title>`,
    ...page.tags.map(
      ({ tag, attrs }) =>
        `<${tag} ${Object.entries(attrs)
          .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
          .join(' ')} />`,
    ),
    `<script type="application/ld+json" id="ld">${page.jsonLd}</script>`,
  ].join('\n    ')
  return template
    .replace(/<title>.*?<\/title>/, head)
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`)
}

export const sitemap = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ROUTES.map(
    (route) => `  <url><loc>${seoFor(route).url}</loc></url>`,
  ).join('\n')}\n</urlset>\n`
