import { type EditElement, TEXT_LINE_HEIGHT } from '@fuckpdf/tools'
import { Skeleton } from '@fuckpdf/ui'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { boundsOf, ElementView, FONT_STACK, type Handle } from './element'
import { type EditorTool, useEditorStore } from './store'

const DEFAULT_BOX = { width: 160, height: 90 }
const MIN_SIZE = 4
const NUDGE = 1
const NUDGE_FAST = 10

const INK = '1a1a1a'
const HIGHLIGHT = 'ffe14d'
const STROKE_WIDTH = 2
const TEXT_SIZE = 14

type Point = { x: number; y: number }
type DrawTool = Exclude<EditorTool, 'select' | 'image'>

type Gesture =
  | { kind: 'create'; tool: DrawTool; id: string; origin: Point; points: number[] }
  | { kind: 'move'; start: EditElement; origin: Point }
  | { kind: 'resize'; start: EditElement; handle: Handle; origin: Point }

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high)

const evens = (values: number[]) => values.filter((_, index) => index % 2 === 0)
const odds = (values: number[]) => values.filter((_, index) => index % 2 === 1)

function useImageUrls(elements: EditElement[]): Map<string, string> {
  const key = elements
    .filter((element) => element.type === 'image')
    .map((element) => element.id)
    .join(',')

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the image id list because bytes never change once placed; `elements` would re-create every URL per drag frame. ponytail: one new image re-creates them all, which is fine for a handful
  const urls = useMemo(() => {
    const map = new Map<string, string>()
    for (const element of elements)
      if (element.type === 'image')
        map.set(
          element.id,
          URL.createObjectURL(
            new Blob([element.bytes.slice().buffer as ArrayBuffer], { type: element.mime }),
          ),
        )
    return map
  }, [key])

  useEffect(
    () => () => {
      for (const url of urls.values()) URL.revokeObjectURL(url)
    },
    [urls],
  )

  return urls
}

export type CanvasProps = {
  pageUrl: string | undefined
  displayWidth: number
  width: number
  height: number
  failed: boolean
}

export function Canvas({ pageUrl, displayWidth, width, height, failed }: CanvasProps) {
  const { t } = useTranslation()
  const elements = useEditorStore((state) => state.elements)
  const selectedId = useEditorStore((state) => state.selectedId)
  const page = useEditorStore((state) => state.page)
  const store = useEditorStore.getState

  const frame = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const stop = useRef<(() => void) | null>(null)
  // A gesture in flight lives here and reaches the store only on pointerup: writing per
  // pointermove would re-render every element on the page. `ElementView` is memoised behind
  // the ref-stable callbacks below for the same reason.
  const draftRef = useRef<EditElement | null>(null)
  const [draft, setDraft] = useState<EditElement | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)

  const onPage = useMemo(
    () => elements.filter((element) => element.page === page),
    [elements, page],
  )
  const urls = useImageUrls(elements)

  useEffect(() => {
    const node = frame.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [width])

  useEffect(() => () => stop.current?.(), [])

  const apply = (element: EditElement | null) => {
    draftRef.current = element
    setDraft(element)
  }

  const toPoint = (event: { clientX: number; clientY: number }): Point => {
    const box = svg.current?.getBoundingClientRect()
    if (!box?.width) return { x: 0, y: 0 }
    const factor = box.width / width
    return {
      x: clamp((event.clientX - box.left) / factor, 0, width),
      y: clamp((event.clientY - box.top) / factor, 0, height),
    }
  }

  const build = (
    tool: DrawTool,
    elementId: string,
    from: Point,
    to: Point,
    points: number[],
  ): EditElement => {
    const drawn = {
      x: Math.min(from.x, to.x),
      y: Math.min(from.y, to.y),
      width: Math.abs(to.x - from.x),
      height: Math.abs(to.y - from.y),
    }
    const tiny = drawn.width < MIN_SIZE && drawn.height < MIN_SIZE
    const box = tiny
      ? {
          x: from.x,
          y: from.y,
          width: Math.min(DEFAULT_BOX.width, width - from.x),
          height: Math.min(DEFAULT_BOX.height, height - from.y),
        }
      : drawn
    const base = { id: elementId, page }

    switch (tool) {
      case 'rect':
        return { ...base, ...box, type: 'rect', stroke: INK, strokeWidth: STROKE_WIDTH }
      case 'ellipse':
        return { ...base, ...box, type: 'ellipse', stroke: INK, strokeWidth: STROKE_WIDTH }
      case 'highlight':
        return { ...base, ...box, type: 'highlight', color: HIGHLIGHT }
      case 'line':
        return {
          ...base,
          type: 'line',
          x: from.x,
          y: from.y,
          x2: tiny ? Math.min(from.x + DEFAULT_BOX.width, width) : to.x,
          y2: tiny ? from.y : to.y,
          stroke: INK,
          strokeWidth: STROKE_WIDTH,
        }
      case 'ink':
        return {
          ...base,
          type: 'ink',
          x: Math.min(...evens(points)),
          y: Math.min(...odds(points)),
          points,
          stroke: INK,
          strokeWidth: STROKE_WIDTH,
        }
      case 'text':
        return {
          ...base,
          type: 'text',
          x: from.x,
          y: from.y,
          text: t('edit.newText'),
          size: TEXT_SIZE,
          font: 'helvetica',
          color: INK,
        }
    }
  }

  const project = (current: Gesture, to: Point): EditElement | null => {
    if (current.kind === 'create') {
      if (current.tool === 'ink' && current.points.at(-2) !== to.x) current.points.push(to.x, to.y)
      return build(current.tool, current.id, current.origin, to, current.points)
    }

    const start = current.start
    if (current.kind === 'move') {
      const bounds = boundsOf(start)
      const dx = clamp(to.x - current.origin.x, -bounds.x, width - bounds.x - bounds.width)
      const dy = clamp(to.y - current.origin.y, -bounds.y, height - bounds.y - bounds.height)
      return shift(start, dx, dy)
    }

    if (start.type === 'line')
      return current.handle === 'start'
        ? { ...start, x: to.x, y: to.y }
        : { ...start, x2: to.x, y2: to.y }
    if (start.type === 'ink' || start.type === 'text') return start

    const left = current.handle === 'nw' || current.handle === 'sw'
    const top = current.handle === 'nw' || current.handle === 'ne'
    const right = left ? start.x + start.width : to.x
    const bottom = top ? start.y + start.height : to.y
    const x = Math.min(left ? to.x : start.x, right - MIN_SIZE)
    const y = Math.min(top ? to.y : start.y, bottom - MIN_SIZE)
    return {
      ...start,
      x,
      y,
      width: Math.max(right - x, MIN_SIZE),
      height: Math.max(bottom - y, MIN_SIZE),
    }
  }

  const listen = () => {
    const move = (event: PointerEvent) => {
      const current = gesture.current
      if (current) apply(project(current, toPoint(event)))
    }
    const detach = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', cancel)
      stop.current = null
    }
    const cancel = () => {
      gesture.current = null
      apply(null)
      detach()
    }
    const finish = () => {
      const current = gesture.current
      const result = draftRef.current
      cancel()
      if (!current || !result) return
      if (current.kind !== 'create') {
        store().update(result.id, result)
        return
      }
      if (current.tool === 'ink' && current.points.length < 4) return
      store().add(result)
      if (current.tool === 'text') {
        store().setTool('select')
        setEditingId(result.id)
      }
    }

    stop.current = detach
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', cancel)
  }

  const pressPage = (event: ReactPointerEvent) => {
    if (event.button !== 0) return
    const tool = store().activeTool
    setEditingId(null)
    if (tool === 'select') {
      store().select(null)
      return
    }
    if (tool === 'image') return
    const origin = toPoint(event)
    const elementId = crypto.randomUUID()
    if (tool === 'text') {
      // Otherwise mousedown's default focuses the canvas and blurs the new text box at once.
      event.preventDefault()
      store().add(build('text', elementId, origin, origin, []))
      store().setTool('select')
      setEditingId(elementId)
      return
    }
    gesture.current = { kind: 'create', tool, id: elementId, origin, points: [origin.x, origin.y] }
    apply(build(tool, elementId, origin, origin, [origin.x, origin.y]))
    listen()
  }

  const grab = (event: ReactPointerEvent, element: EditElement, handle: Handle | null) => {
    if (event.button !== 0 || store().activeTool !== 'select') return
    event.stopPropagation()
    store().select(element.id)
    setEditingId(null)
    const origin = toPoint(event)
    gesture.current = handle
      ? { kind: 'resize', start: element, handle, origin }
      : { kind: 'move', start: element, origin }
    apply(element)
    listen()
  }

  const nudge = (element: EditElement, dx: number, dy: number) => {
    const bounds = boundsOf(element)
    const moved = shift(
      element,
      clamp(dx, -bounds.x, width - bounds.x - bounds.width),
      clamp(dy, -bounds.y, height - bounds.y - bounds.height),
    )
    store().update(element.id, moved)
  }

  const keyDown = (event: ReactKeyboardEvent, element: EditElement | null) => {
    if (event.key === 'Escape') {
      store().select(null)
      setEditingId(null)
      return
    }
    const target = element ?? onPage.find((item) => item.id === selectedId)
    if (!target) return
    const step = event.shiftKey ? NUDGE_FAST : NUDGE
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        store().remove(target.id)
        break
      case 'ArrowLeft':
        nudge(target, -step, 0)
        break
      case 'ArrowRight':
        nudge(target, step, 0)
        break
      case 'ArrowUp':
        nudge(target, 0, -step)
        break
      case 'ArrowDown':
        nudge(target, 0, step)
        break
      case 'Enter':
        if (target.type !== 'text') return
        setEditingId(target.id)
        break
      default:
        return
    }
    event.preventDefault()
  }

  const canvasKeyDown = (event: ReactKeyboardEvent) => {
    const tool = store().activeTool
    if (event.key !== 'Enter' || tool === 'select' || tool === 'image' || selectedId) {
      keyDown(event, null)
      return
    }
    event.preventDefault()
    const centre = {
      x: Math.max(width / 2 - DEFAULT_BOX.width / 2, 0),
      y: Math.max(height / 2 - DEFAULT_BOX.height / 2, 0),
    }
    const elementId = crypto.randomUUID()
    const placed = build(tool, elementId, centre, centre, [
      centre.x,
      centre.y,
      centre.x + DEFAULT_BOX.width,
      centre.y + DEFAULT_BOX.height,
    ])
    store().add(placed)
    store().setTool('select')
    if (placed.type === 'text') setEditingId(elementId)
  }

  const latest = useRef({ grab, keyDown })
  latest.current = { grab, keyDown }
  const onGrab = useCallback(
    (event: ReactPointerEvent, element: EditElement, handle: Handle | null) =>
      latest.current.grab(event, element, handle),
    [],
  )
  const onElementKeyDown = useCallback(
    (event: ReactKeyboardEvent, element: EditElement) => latest.current.keyDown(event, element),
    [],
  )

  const shown = !draft
    ? onPage
    : onPage.some((element) => element.id === draft.id)
      ? onPage.map((element) => (element.id === draft.id ? draft : element))
      : [...onPage, draft]

  const editing = shown.find((element) => element.id === editingId)

  return (
    <div
      className="relative bg-white shadow-[0_1px_3px_rgb(0_0_0/0.18)] ring-1 ring-ink/15"
      ref={frame}
      style={{ width: displayWidth, aspectRatio: `${width} / ${height}` }}
    >
      {pageUrl ? (
        <img
          alt={t('edit.pageAlt', { page })}
          className="block h-full w-full select-none"
          draggable={false}
          src={pageUrl}
        />
      ) : failed ? (
        <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-ink/60">
          {t('edit.failed')}
        </p>
      ) : (
        <Skeleton className="h-full w-full" />
      )}

      <svg
        aria-label={t('edit.canvas')}
        className="absolute inset-0 h-full w-full touch-none outline-none"
        onKeyDown={canvasKeyDown}
        onPointerDown={pressPage}
        ref={svg}
        role="application"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the overlay is the editing surface and has to take focus for the keyboard path (FR-11)
        tabIndex={0}
        viewBox={`0 0 ${width} ${height}`}
      >
        {shown.map((element) => (
          <ElementView
            editing={element.id === editingId}
            element={element}
            imageUrl={urls.get(element.id)}
            key={element.id}
            label={t('edit.elementLabel', {
              type: t(`edit.tools.${element.type}`),
              x: Math.round(element.x),
              y: Math.round(element.y),
            })}
            onGrab={onGrab}
            onKeyDown={onElementKeyDown}
            onSelect={store().select}
            scale={scale}
            selected={element.id === selectedId}
          />
        ))}
      </svg>

      {editing?.type === 'text' ? (
        <TextEditor
          element={editing}
          key={editing.id}
          onDone={() => setEditingId(null)}
          pageWidth={width}
          scale={scale}
        />
      ) : null}
    </div>
  )
}

function shift(element: EditElement, dx: number, dy: number): EditElement {
  if (element.type === 'line')
    return {
      ...element,
      x: element.x + dx,
      y: element.y + dy,
      x2: element.x2 + dx,
      y2: element.y2 + dy,
    }
  if (element.type === 'ink')
    return {
      ...element,
      x: element.x + dx,
      y: element.y + dy,
      points: element.points.map((value, index) => value + (index % 2 === 0 ? dx : dy)),
    }
  return { ...element, x: element.x + dx, y: element.y + dy }
}

type TextEditorProps = {
  element: Extract<EditElement, { type: 'text' }>
  scale: number
  pageWidth: number
  onDone: () => void
}

function TextEditor({ element, scale, pageWidth, onDone }: TextEditorProps) {
  const { t } = useTranslation()
  const area = useRef<HTMLTextAreaElement>(null)
  const started = useRef(false)

  useEffect(() => {
    // One history entry per edit, and exactly one under StrictMode's double-invoked effects.
    if (!started.current) {
      started.current = true
      useEditorStore.getState().snapshot()
    }
    area.current?.focus()
    area.current?.select()
  }, [])

  // A CSS line box centres its text, putting the first baseline half a leading below where
  // the step puts it.
  const halfLeading = ((TEXT_LINE_HEIGHT - 1) / 2) * element.size

  return (
    <textarea
      aria-label={t('edit.editText')}
      className="absolute resize-none border border-accent border-dashed bg-transparent p-0 outline-none"
      onBlur={onDone}
      onChange={(event) =>
        useEditorStore.getState().update(element.id, { text: event.target.value }, false)
      }
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape') onDone()
      }}
      ref={area}
      rows={element.text.split('\n').length}
      spellCheck={false}
      style={{
        left: element.x * scale,
        top: (element.y - halfLeading) * scale,
        width: Math.max((pageWidth - element.x) * scale, 60),
        color: `#${element.color}`,
        fontFamily: FONT_STACK[element.font],
        fontSize: element.size * scale,
        lineHeight: TEXT_LINE_HEIGHT,
        whiteSpace: 'pre',
        overflow: 'auto',
      }}
      value={element.text}
      wrap="off"
    />
  )
}
