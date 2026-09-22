import { TOOL_IDS } from '@fuckpdf/tools'
import { createBrowserRouter } from 'react-router'
import { Landing } from './shell/Landing'
import { Shell } from './shell/Shell'
import { StaticPage } from './shell/StaticPage'

// The tool page is lazy so it stays out of the shell bundle.
export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <Landing /> },
      ...TOOL_IDS.map((id) => ({ path: id, lazy: () => import('./tool/ToolPage') })),
      { path: 'privacy', element: <StaticPage page="privacy" /> },
      { path: 'about', element: <StaticPage page="about" /> },
      { path: 'licenses', element: <StaticPage page="licenses" /> },
    ],
  },
])
