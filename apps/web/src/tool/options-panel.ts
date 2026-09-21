import type { ToolId } from '@fuckpdf/tools'
import { type LazyExoticComponent, lazy } from 'react'

/**
 * Every tool's options panel gets its tool's own options object and hands back a new one.
 * The registry below has to be uniform, so each panel narrows `value` to its own exported
 * `<Tool>Options` type internally — that single cast is the seam, and it lives inside the
 * panel rather than at every call site.
 */
export type OptionsPanelProps = {
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

export type OptionsPanel = LazyExoticComponent<(props: OptionsPanelProps) => React.ReactNode>

/** Lazy so a tool's options code never lands in the shell bundle (NFR-5). */
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
  'jpg-to-pdf': lazy(() => import('../tools/jpg-to-pdf/options')),
  'pdf-to-jpg': lazy(() => import('../tools/pdf-to-jpg/options')),
}
