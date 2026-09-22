// Everything here is in PDF points: the overlay's `viewBox` is the page in points, and
// `scale` is only for what must not scale with it. What this draws is what `edit.ts`
// flattens into the page, down to the two text constants.
import { type EditElement, TEXT_ASCENT, TEXT_LINE_HEIGHT } from '@fuckpdf/tools'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'

export type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'start' | 'end'

export type Box = { x: number; y: number; width: number; height: number }

const HANDLE_PX = 9
const HIT_PX = 12

const hex = (value: string | undefined) => (value ? `#${value}` : 'none')

export const FONT_STACK = {
  helvetica: 'Helvetica, Arial, "Liberation Sans", sans-serif',
  times: '"Times New Roman", Times, "Liberation Serif", serif',
  courier: '"Courier New", Courier, "Liberation Mono", monospace',
} as const

export const baselineOf = (size: number, index: number) =>
  size * TEXT_ASCENT + index * size * TEXT_LINE_HEIGHT

export const linesOf = (text: string) => text.split('\n')

export function boundsOf(element: EditElement): Box {
  switch (element.type) {
    case 'line':
      return {
        x: Math.min(element.x, element.x2),
        y: Math.min(element.y, element.y2),
        width: Math.abs(element.x2 - element.x),
        height: Math.abs(element.y2 - element.y),
      }
    case 'ink': {
      const xs = element.points.filter((_, index) => index % 2 === 0)
      const ys = element.points.filter((_, index) => index % 2 === 1)
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
    }
    case 'text':
      return {
        x: element.x,
        y: element.y,
        width: 0,
        height: linesOf(element.text).length * element.size * TEXT_LINE_HEIGHT,
      }
    default:
      return { x: element.x, y: element.y, width: element.width, height: element.height }
  }
}

export type ElementViewProps = {
  element: EditElement
  selected: boolean
  scale: number
  imageUrl: string | undefined
  editing: boolean
  label: string
  onSelect: (id: string) => void
  onGrab: (event: ReactPointerEvent, element: EditElement, handle: Handle | null) => void
  onKeyDown: (event: ReactKeyboardEvent, element: EditElement) => void
}

export const ElementView = memo(function ElementView({
  element,
  selected,
  scale,
  imageUrl,
  editing,
  label,
  onSelect,
  onGrab,
  onKeyDown,
}: ElementViewProps) {
  const [measured, setMeasured] = useState<Box | null>(null)
  // A no-op when the box has not moved, so the measuring effect below cannot loop.
  const measure = useCallback(
    (box: Box) =>
      setMeasured((previous) =>
        previous &&
        previous.x === box.x &&
        previous.y === box.y &&
        previous.width === box.width &&
        previous.height === box.height
          ? previous
          : box,
      ),
    [],
  )
  const box = element.type === 'text' ? (measured ?? boundsOf(element)) : boundsOf(element)
  const opacity = element.opacity ?? 1

  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG has no <button>, and a foreignObject wrapper would break the geometry this element exists to be faithful to
    <g
      aria-label={label}
      className="cursor-move outline-none"
      onFocus={() => onSelect(element.id)}
      onKeyDown={(event) => onKeyDown(event, element)}
      onPointerDown={(event) => onGrab(event, element, null)}
      role="button"
      tabIndex={0}
    >
      <g opacity={opacity} style={editing ? { visibility: 'hidden' } : undefined}>
        <Shape element={element} imageUrl={imageUrl} onMeasure={measure} />
      </g>
      <Hit element={element} scale={scale} box={box} />
      {selected ? <Selection box={box} element={element} onGrab={onGrab} scale={scale} /> : null}
    </g>
  )
})

function Shape({
  element,
  imageUrl,
  onMeasure,
}: {
  element: EditElement
  imageUrl: string | undefined
  onMeasure: (box: Box) => void
}) {
  switch (element.type) {
    case 'rect':
      return (
        <rect
          fill={hex(element.fill)}
          height={element.height}
          stroke={hex(element.stroke)}
          strokeWidth={element.strokeWidth ?? 1}
          width={element.width}
          x={element.x}
          y={element.y}
        />
      )
    case 'ellipse':
      return (
        <ellipse
          cx={element.x + element.width / 2}
          cy={element.y + element.height / 2}
          fill={hex(element.fill)}
          rx={element.width / 2}
          ry={element.height / 2}
          stroke={hex(element.stroke)}
          strokeWidth={element.strokeWidth ?? 1}
        />
      )
    case 'highlight':
      return (
        <rect
          fill={hex(element.color)}
          height={element.height}
          style={{ mixBlendMode: 'multiply' }}
          width={element.width}
          x={element.x}
          y={element.y}
        />
      )
    case 'line':
      return (
        <line
          stroke={hex(element.stroke)}
          strokeLinecap="round"
          strokeWidth={element.strokeWidth}
          x1={element.x}
          x2={element.x2}
          y1={element.y}
          y2={element.y2}
        />
      )
    case 'ink':
      return (
        <polyline
          fill="none"
          points={element.points.join(' ')}
          stroke={hex(element.stroke)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={element.strokeWidth}
        />
      )
    case 'image':
      return imageUrl ? (
        <image
          height={element.height}
          href={imageUrl}
          preserveAspectRatio="none"
          width={element.width}
          x={element.x}
          y={element.y}
        />
      ) : null
    case 'text':
      return <TextShape element={element} onMeasure={onMeasure} />
  }
}

function TextShape({
  element,
  onMeasure,
}: {
  element: Extract<EditElement, { type: 'text' }>
  onMeasure: (box: Box) => void
}) {
  const group = useRef<SVGGElement>(null)
  const { text, size, font } = element

  useLayoutEffect(() => {
    const node = group.current
    if (!node) return
    const bbox = node.getBBox()
    onMeasure({
      x: element.x,
      y: element.y,
      width: bbox.width,
      height: linesOf(text).length * size * TEXT_LINE_HEIGHT,
    })
  })

  return (
    <g ref={group}>
      {linesOf(text).map((line, index) => (
        <text
          fill={hex(element.color)}
          fontFamily={FONT_STACK[font]}
          fontSize={size}
          // biome-ignore lint/suspicious/noArrayIndexKey: line number is the identity.
          key={index}
          x={element.x}
          y={element.y + baselineOf(size, index)}
          xmlSpace="preserve"
        >
          {line}
        </text>
      ))}
    </g>
  )
}

function Hit({ element, box, scale }: { element: EditElement; box: Box; scale: number }) {
  const fat = HIT_PX / scale
  if (element.type === 'line')
    return (
      <line
        stroke="transparent"
        strokeWidth={Math.max(element.strokeWidth, fat)}
        x1={element.x}
        x2={element.x2}
        y1={element.y}
        y2={element.y2}
      />
    )
  if (element.type === 'ink')
    return (
      <polyline
        fill="none"
        points={element.points.join(' ')}
        stroke="transparent"
        strokeLinecap="round"
        strokeWidth={Math.max(element.strokeWidth, fat)}
      />
    )
  return <rect fill="transparent" height={box.height} width={box.width} x={box.x} y={box.y} />
}

const CORNERS: { handle: Handle; cursor: string }[] = [
  { handle: 'nw', cursor: 'nwse-resize' },
  { handle: 'ne', cursor: 'nesw-resize' },
  { handle: 'sw', cursor: 'nesw-resize' },
  { handle: 'se', cursor: 'nwse-resize' },
]

const cornerAt = (box: Box, handle: Handle) => ({
  x: handle === 'nw' || handle === 'sw' ? box.x : box.x + box.width,
  y: handle === 'nw' || handle === 'ne' ? box.y : box.y + box.height,
})

function Selection({
  box,
  element,
  scale,
  onGrab,
}: {
  box: Box
  element: EditElement
  scale: number
  onGrab: (event: ReactPointerEvent, element: EditElement, handle: Handle) => void
}) {
  const size = HANDLE_PX / scale
  const points: { handle: Handle; x: number; y: number; cursor: string }[] =
    element.type === 'line'
      ? [
          { handle: 'start', x: element.x, y: element.y, cursor: 'move' },
          { handle: 'end', x: element.x2, y: element.y2, cursor: 'move' },
        ]
      : element.type === 'ink' || element.type === 'text'
        ? []
        : CORNERS.map(({ handle, cursor }) => ({ handle, cursor, ...cornerAt(box, handle) }))

  return (
    <g>
      <rect
        className="fill-none stroke-accent"
        height={box.height}
        pointerEvents="none"
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
        width={box.width}
        x={box.x}
        y={box.y}
      />
      {points.map((point) => (
        <rect
          className="fill-accent"
          height={size}
          key={point.handle}
          onPointerDown={(event) => {
            event.stopPropagation()
            onGrab(event, element, point.handle)
          }}
          style={{ cursor: point.cursor }}
          width={size}
          x={point.x - size / 2}
          y={point.y - size / 2}
        />
      ))}
    </g>
  )
}
