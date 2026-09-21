import type { ToolId } from '@fuckpdf/tools'
import {
  Crop,
  FileImage,
  FileMinus2,
  FileOutput,
  FilePlus2,
  Hash,
  Images,
  LayoutGrid,
  RotateCw,
  Scissors,
  Stamp,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type ToolIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

/** One distinct lucide icon per tool. Two tools never share one. */
export const icons: Record<ToolId, ToolIcon> = {
  merge: FilePlus2,
  split: Scissors,
  'remove-pages': FileMinus2,
  'extract-pages': FileOutput,
  organize: LayoutGrid,
  rotate: RotateCw,
  'page-numbers': Hash,
  watermark: Stamp,
  crop: Crop,
  'jpg-to-pdf': FileImage,
  'pdf-to-jpg': Images,
}
