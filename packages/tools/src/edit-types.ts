/**
 * Geometry is in PDF points with the origin at the page's top-left and y growing downward,
 * which is what the editor's DOM sees. `edit.ts` flips it once, at the drawing call.
 */

export type EditFont = 'helvetica' | 'times' | 'courier'

export const TEXT_LINE_HEIGHT = 1.2
export const TEXT_ASCENT = 0.8

type Base = {
  id: string
  /** 1-based. */
  page: number
  x: number
  y: number
  /** 0..1, absent means 1. */
  opacity?: number
}

/** `rrggbb`, no leading `#`. */
type Hex = string

export type EditText = Base & {
  type: 'text'
  text: string
  size: number
  font: EditFont
  color: Hex
}

export type EditImage = Base & {
  type: 'image'
  bytes: Uint8Array
  mime: 'image/png' | 'image/jpeg'
  width: number
  height: number
}

export type EditRect = Base & {
  type: 'rect'
  width: number
  height: number
  fill?: Hex
  stroke?: Hex
  strokeWidth?: number
}

export type EditEllipse = Base & {
  type: 'ellipse'
  width: number
  height: number
  fill?: Hex
  stroke?: Hex
  strokeWidth?: number
}

export type EditLine = Base & {
  type: 'line'
  x2: number
  y2: number
  stroke: Hex
  strokeWidth: number
}

export type EditInk = Base & {
  type: 'ink'
  /** Flat `[x, y, x, y, ...]` in absolute page coordinates. */
  points: number[]
  stroke: Hex
  strokeWidth: number
}

export type EditHighlight = Base & {
  type: 'highlight'
  width: number
  height: number
  color: Hex
}

export type EditElement =
  | EditText
  | EditImage
  | EditRect
  | EditEllipse
  | EditLine
  | EditInk
  | EditHighlight

export type EditElementType = EditElement['type']

export type EditOptions = {
  elements: EditElement[]
}
