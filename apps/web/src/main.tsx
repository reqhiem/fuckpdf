import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import './styles/tokens.css'
import './i18n'
import { routes } from './router'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root')

const router = createBrowserRouter(routes)
const app = (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
// The dev server serves an empty #root. An unknown path gets the landing's markup through the
// SPA fallback, and the router's 404 cannot hydrate over that.
const start = () =>
  root.hasChildNodes() && !router.state.errors
    ? hydrateRoot(root, app)
    : createRoot(root).render(app)

// A lazy tool route renders an empty outlet until it resolves, which would not match the
// prerendered markup. No top-level await: it makes every lazy chunk that shares a module with
// the entry deadlock on it, so the bundler splits the shell into a dozen extra requests.
if (router.state.initialized) start()
else {
  const stop = router.subscribe((state) => {
    if (!state.initialized) return
    stop()
    start()
  })
}
