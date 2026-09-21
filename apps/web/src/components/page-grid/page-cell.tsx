/**
 * One page in the grid: a worker-rendered thumbnail, its per-page actions, and the crop
 * rectangle. The only thing a cell allocates is its object URL, and the store releases it
 * when the cell scrolls away or unmounts (PRD NFR-3).
 */
import { useSortable } from '@dnd-kit/sortable'
import { cx } from '@fuckpdf/ui'
import {
  Copy,
  Crop as CropIcon,
  FileText,
  GripVertical,
  ImageOff,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react'
import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { BLANK_PAGE_SOURCE_INDEX } from './blank'
import { type CropRect, type DragRect, toPdfPoints } from './crop'
import type { PageGridCapabilities, PageRef } from './types'
import type { ThumbnailStore } from './use-thumbnails'

/** Under this many pixels, a pointer drag on a thumbnail was a click, not a crop. */
const DRAG_THRESHOLD = 4

export type SelectModifiers = { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }

export type PageCellProps = {
  page: PageRef
  total: number
  selected: boolean
  capabilities: Required<PageGridCapabilities>
  store: ThumbnailStore
  cropEnabled: boolean
  /** True when this page is the one currently holding the grid's crop rectangle. */
  cropActive: boolean
  onSelect: (id: string, modifiers: SelectModifiers) => void
  onRotate: (id: string) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onCrop: (id: string, rect: CropRect | null) => void
}

type Point = { x: number; y: number }

const normalize = (a: Point, b: Point): DragRect => ({
  left: Math.min(a.x, b.x),
  top: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x),
  height: Math.abs(a.y - b.y),
})

export function PageCell({
  page,
  total,
  selected,
  capabilities,
  store,
  cropEnabled,
  cropActive,
  onSelect,
  onRotate,
  onRemove,
  onDuplicate,
  onCrop,
}: PageCellProps) {
  const { t } = useTranslation()
  const blank = page.sourceIndex === BLANK_PAGE_SOURCE_INDEX

  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(page.sourceIndex, listener),
    [store, page.sourceIndex],
  )
  const snapshot = useCallback(() => store.get(page.sourceIndex), [store, page.sourceIndex])
  const thumbnail = useSyncExternalStore(subscribe, snapshot)

  // Render on approach, release on departure: a 300-page document holds a screenful of
  // decoded pages, not 300.
  const cell = useRef<HTMLLIElement | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const node = cell.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setNear(entry.isIntersecting)
      },
      { rootMargin: '300px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!near || blank) return
    return store.acquire(page.sourceIndex)
  }, [near, blank, store, page.sourceIndex])

  const sortable = useSortable({ id: page.id, disabled: !capabilities.reorder })
  const { transform } = sortable
  const style: CSSProperties = {
    transition: sortable.transition,
    ...(transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`,
        }
      : {}),
  }

  const image = useRef<HTMLImageElement | null>(null)
  const origin = useRef<Point | null>(null)
  const dragged = useRef(false)
  const [drag, setDrag] = useState<DragRect | null>(null)
  // Where the painted image sits inside the square cell, so the overlay lands on it.
  const [inset, setInset] = useState<Point>({ x: 0, y: 0 })
  useEffect(() => {
    if (!cropActive) setDrag(null)
  }, [cropActive])

  const canCrop = cropEnabled && !blank && !!thumbnail?.size

  const startCrop = (event: PointerEvent<HTMLButtonElement>) => {
    const box = image.current?.getBoundingClientRect()
    if (!canCrop || event.button !== 0 || !box) return
    const frame = event.currentTarget.getBoundingClientRect()
    setInset({ x: box.left - frame.left, y: box.top - frame.top })
    origin.current = { x: event.clientX - box.left, y: event.clientY - box.top }
    dragged.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveCrop = (event: PointerEvent<HTMLButtonElement>) => {
    const from = origin.current
    const box = image.current?.getBoundingClientRect()
    if (!from || !box) return
    const rect = normalize(from, { x: event.clientX - box.left, y: event.clientY - box.top })
    if (rect.width < DRAG_THRESHOLD && rect.height < DRAG_THRESHOLD) return
    dragged.current = true
    setDrag(rect)
  }

  const endCrop = () => {
    if (!origin.current) return
    origin.current = null
    const box = image.current?.getBoundingClientRect()
    const size = thumbnail?.size
    if (!dragged.current || !drag || !box || !size) return
    onCrop(page.id, toPdfPoints(drag, box, size, page.rotation))
  }

  const click = (event: MouseEvent<HTMLButtonElement>) => {
    if (dragged.current) {
      // The pointerup that finished a crop drag also fires a click. Not a selection.
      dragged.current = false
      return
    }
    if (!capabilities.select) return
    onSelect(page.id, {
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
    })
  }

  const label = t('pageGrid.page', { number: page.number, total })
  const action =
    'inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink dark:hover:bg-paper/10 dark:hover:text-paper'

  return (
    <li
      className={cx(
        'surface relative p-2',
        selected && 'ring-2 ring-accent',
        sortable.isDragging && 'z-10 opacity-80',
      )}
      ref={(node) => {
        cell.current = node
        sortable.setNodeRef(node)
      }}
      style={style}
    >
      <button
        aria-pressed={capabilities.select ? selected : undefined}
        className="relative flex aspect-square w-full touch-none items-center justify-center overflow-hidden rounded-xl bg-ink/5 dark:bg-paper/5"
        onClick={click}
        onLostPointerCapture={endCrop}
        onPointerDown={startCrop}
        onPointerMove={moveCrop}
        onPointerUp={endCrop}
        type="button"
      >
        <Thumbnail
          blank={blank}
          error={thumbnail?.error}
          label={label}
          number={page.number}
          ref={image}
          rotation={page.rotation}
          url={thumbnail?.url}
        />
        {drag ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute border-2 border-accent border-dashed bg-accent/15"
            style={{
              left: drag.left + inset.x,
              top: drag.top + inset.y,
              width: drag.width,
              height: drag.height,
            }}
          />
        ) : null}
      </button>

      <div className="mt-2 flex items-center gap-1">
        <span className="mr-auto pl-1 font-mono text-xs text-muted">{page.number}</span>
        {capabilities.reorder ? (
          <button
            aria-label={t('pageGrid.reorder', { number: page.number })}
            className={cx(action, 'cursor-grab')}
            ref={sortable.setActivatorNodeRef}
            type="button"
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical aria-hidden="true" size={16} />
          </button>
        ) : null}
        {capabilities.rotate ? (
          <button
            aria-label={t('pageGrid.rotate', { number: page.number })}
            className={action}
            onClick={() => onRotate(page.id)}
            type="button"
          >
            <RotateCw aria-hidden="true" size={16} />
          </button>
        ) : null}
        {capabilities.duplicate ? (
          <button
            aria-label={t('pageGrid.duplicate', { number: page.number })}
            className={action}
            onClick={() => onDuplicate(page.id)}
            type="button"
          >
            <Copy aria-hidden="true" size={16} />
          </button>
        ) : null}
        {capabilities.remove ? (
          <button
            aria-label={t('pageGrid.remove', { number: page.number })}
            className={cx(action, 'hover:text-danger')}
            onClick={() => onRemove(page.id)}
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        ) : null}
      </div>

      {cropActive ? (
        <div className="mt-1 flex items-center gap-1 pl-1 text-muted">
          <CropIcon aria-hidden="true" size={14} />
          <span className="mr-auto text-[0.6875rem]">{t('pageGrid.cropped')}</span>
          <button
            aria-label={t('pageGrid.cropClear')}
            className={cx(action, 'size-7')}
            onClick={() => {
              setDrag(null)
              onCrop(page.id, null)
            }}
            type="button"
          >
            <X aria-hidden="true" size={14} />
          </button>
        </div>
      ) : null}
    </li>
  )
}

type ThumbnailProps = {
  blank: boolean
  error: Error | undefined
  label: string
  number: number
  ref: React.Ref<HTMLImageElement>
  rotation: number
  url: string | undefined
}

function Thumbnail({ blank, error, label, number, ref, rotation, url }: ThumbnailProps) {
  const { t } = useTranslation()
  if (blank)
    return (
      <span className="flex flex-col items-center gap-2 text-muted">
        <FileText aria-hidden="true" size={24} />
        <span className="text-xs">{t('pageGrid.blank')}</span>
      </span>
    )
  if (url)
    return (
      <img
        alt={label}
        className="max-h-full max-w-full object-contain"
        ref={ref}
        src={url}
        style={{ rotate: `${rotation}deg` }}
      />
    )
  if (error)
    return (
      <span className="flex flex-col items-center gap-2 px-2 text-center text-muted">
        <ImageOff aria-hidden="true" size={24} />
        <span className="text-xs">{t('pageGrid.failed')}</span>
      </span>
    )
  return <span className="text-xs text-muted">{t('pageGrid.loading', { number })}</span>
}
