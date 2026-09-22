import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { seoFor } from '../seo'

// Updates the tags the prerendered page shipped with, so a route never carries two sets.
export function Seo() {
  const { pathname } = useLocation()
  useEffect(() => {
    const page = seoFor(pathname)
    document.title = page.title
    for (const { tag, key, attrs } of page.tags) {
      let node = document.head.querySelector(key)
      if (!node) node = document.head.appendChild(document.createElement(tag))
      for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value)
    }
    let ld = document.getElementById('ld')
    if (!ld) {
      ld = document.head.appendChild(document.createElement('script'))
      ld.id = 'ld'
      ld.setAttribute('type', 'application/ld+json')
    }
    ld.textContent = page.jsonLd
  }, [pathname])
  return null
}
