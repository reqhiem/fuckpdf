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
  PencilLine,
  RotateCw,
  Scissors,
  Stamp,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type ToolIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

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
  edit: PencilLine,
  'jpg-to-pdf': FileImage,
  'pdf-to-jpg': Images,
}
