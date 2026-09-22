import type { ToolId } from '@fuckpdf/tools'
import { type LazyExoticComponent, lazy } from 'react'

/** The registry is uniform, so each panel narrows `value` to its own options type inside
 * itself rather than at every call site. */
export type OptionsPanelProps = {
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

export type OptionsPanel = LazyExoticComponent<(props: OptionsPanelProps) => React.ReactNode>

// Lazy: a tool's options code must not land in the shell bundle.
export const optionsPanels: Record<ToolId, OptionsPanel> = {
  merge: lazy(() => import('../tools/merge/options')),
  split: lazy(() => import('../tools/split/options')),
  'remove-pages': lazy(() => import('../tools/remove-pages/options')),
  'extract-pages': lazy(() => import('../tools/extract-pages/options')),
  organize: lazy(() => import('../tools/organize/options')),
  rotate: lazy(() => import('../tools/rotate/options')),
  'page-numbers': lazy(() => import('../tools/page-numbers/options')),
  watermark: lazy(() => import('../tools/watermark/options')),
  crop: lazy(() => import('../tools/crop/options')),
  edit: lazy(() => import('../tools/edit/options')),
  'jpg-to-pdf': lazy(() => import('../tools/jpg-to-pdf/options')),
  'pdf-to-jpg': lazy(() => import('../tools/pdf-to-jpg/options')),
}
