import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router'
import './i18n'
import { routes } from './router'

export async function renderRoute(pathname: string) {
  const { query, dataRoutes } = createStaticHandler(routes)
  const context = await query(new Request(`http://localhost${pathname}`))
  if (context instanceof Response) throw new Error(`${pathname} answered ${context.status}`)
  // The CSP blocks inline scripts, so nothing here may emit one: hydrate={false} drops the
  // router's hydration data, and an unbounded chunk size stops React from outlining a large
  // Suspense boundary behind its $RC reveal script.
  const { prelude } = await prerender(
    <StrictMode>
      <StaticRouterProvider
        context={context}
        hydrate={false}
        router={createStaticRouter(dataRoutes, context)}
      />
    </StrictMode>,
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  )
  return new Response(prelude).text()
}
