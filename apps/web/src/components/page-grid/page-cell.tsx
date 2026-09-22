import { useSortable } from '@dnd-kit/sortable'
import { cx, IconButton, Skeleton } from '@fuckpdf/ui'
import {
  Check,
  Copy,
  Crop as CropIcon,
  FileText,
  GripVertical,
  ImageOff,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react'
import type { CSSProperties, MouseEvent, PointerEvent as ReactPointerEvent, Ref } from 'react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { BLANK_PAGE_SOURCE_INDEX } from './blank'
import { type CropRect, type DragRect, toPdfPoints } from './crop'
import type { PageGridCapabilities, PageRef } from './types'
import type { ThumbnailStore } from './use-thumbnails'

const DRAG_THRESHOLD = 4

export type SelectModifiers = { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }

export type PageCellProps = {
  page: PageRef
  total: number
  selected: boolean
  capabilities: Required<PageGridCapabilities>
  store: ThumbnailStore
  cropEnabled: boolean
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

  // Render on approach, release on departure: 300 pages must not hold 300 renders.
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
  const dragged = useRef(false)
  const [drag, setDrag] = useState<DragRect | null>(null)
  const [inset, setInset] = useState<Point>({ x: 0, y: 0 })
  useEffect(() => {
    if (!cropActive) setDrag(null)
  }, [cropActive])

  // Window listeners, not pointer capture: the rectangle re-renders this cell on every
  // move, and a re-render drops an element's capture.
  const stopGesture = useRef<(() => void) | null>(null)
  useEffect(() => () => stopGesture.current?.(), [])

  const canCrop = cropEnabled && !blank && !!thumbnail?.size

  const startCrop = (event: ReactPointerEvent<HTMLElement>) => {
    const box = image.current?.getBoundingClientRect()
    if (!canCrop || event.button !== 0 || !box) return
    const frame = event.currentTarget.getBoundingClientRect()
    setInset({ x: box.left - frame.left, y: box.top - frame.top })
    dragged.current = false

    const origin: Point = { x: event.clientX - box.left, y: event.clientY - box.top }
    let rect: DragRect | null = null
    const size = thumbnail?.size

    const move = (moved: PointerEvent) => {
      const current = image.current?.getBoundingClientRect()
      if (!current) return
      const next = normalize(origin, {
        x: moved.clientX - current.left,
        y: moved.clientY - current.top,
      })
      if (next.width < DRAG_THRESHOLD && next.height < DRAG_THRESHOLD) return
      dragged.current = true
      rect = next
      setDrag(next)
    }
    const detach = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', detach)
      stopGesture.current = null
    }
    const finish = () => {
      const current = image.current?.getBoundingClientRect()
      detach()
      if (!rect || !current || !size) return
      onCrop(page.id, toPdfPoints(rect, current, size, page.rotation))
    }

    stopGesture.current = detach
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', detach)
  }

  const click = (event: MouseEvent<HTMLElement>) => {
    if (dragged.current) {
      // The pointerup that ended a crop drag also fires a click. Not a selection.
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
  const { 'aria-pressed': _pressed, ...grip } = sortable.attributes

  const interactive =
    cropEnabled ||
    capabilities.select ||
    capabilities.reorder ||
    capabilities.rotate ||
    capabilities.remove ||
    capabilities.duplicate
  const Frame = interactive ? 'button' : 'div'

  return (
    <li
      className={cx('relative', sortable.isDragging && 'z-10 opacity-80')}
      ref={(node) => {
        cell.current = node
        sortable.setNodeRef(node)
      }}
      style={style}
    >
      <Frame
        aria-pressed={capabilities.select ? selected : undefined}
        className={cx(
          'group relative flex aspect-[3/4] w-full touch-none select-none items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent',
          (capabilities.select || canCrop) && 'cursor-pointer',
          canCrop && 'cursor-crosshair',
        )}
        onClick={interactive ? click : undefined}
        onPointerDown={interactive ? startCrop : undefined}
        type={interactive ? 'button' : undefined}
      >
        <Thumbnail
          blank={blank}
          error={thumbnail?.error}
          label={label}
          number={page.number}
          ref={image}
          rotation={page.rotation}
          selected={capabilities.select && selected}
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
      </Frame>

      <div className="mt-1 flex h-8 items-center">
        <span
          className={cx(
            'measure mr-auto flex items-center gap-1 pl-1 text-xs',
            selected && capabilities.select ? 'font-semibold text-foreground' : 'text-muted',
          )}
        >
          {/* Without the tick, selection would be a colour-only signal. */}
          {capabilities.select && selected ? (
            <Check aria-hidden="true" size={14} strokeWidth={3} />
          ) : null}
          {page.number}
        </span>
        {capabilities.reorder ? (
          <IconButton
            className="cursor-grab"
            label={t('pageGrid.reorder', { number: page.number })}
            ref={sortable.setActivatorNodeRef}
            {...grip}
            {...sortable.listeners}
          >
            <GripVertical aria-hidden="true" size={16} />
          </IconButton>
        ) : null}
        {capabilities.rotate ? (
          <IconButton
            label={t('pageGrid.rotate', { number: page.number })}
            onPress={() => onRotate(page.id)}
          >
            <RotateCw aria-hidden="true" size={16} />
          </IconButton>
        ) : null}
        {capabilities.duplicate ? (
          <IconButton
            label={t('pageGrid.duplicate', { number: page.number })}
            onPress={() => onDuplicate(page.id)}
          >
            <Copy aria-hidden="true" size={16} />
          </IconButton>
        ) : null}
        {capabilities.remove ? (
          <IconButton
            className="hover:text-danger"
            label={t('pageGrid.remove', { number: page.number })}
            onPress={() => onRemove(page.id)}
          >
            <Trash2 aria-hidden="true" size={16} />
          </IconButton>
        ) : null}
      </div>

      {cropActive ? (
        <div className="flex items-center gap-1 pl-1 text-muted">
          <CropIcon aria-hidden="true" size={14} />
          <span className="mr-auto text-xs">{t('pageGrid.cropped')}</span>
          <IconButton
            label={t('pageGrid.cropClear')}
            onPress={() => {
              setDrag(null)
              onCrop(page.id, null)
            }}
          >
            <X aria-hidden="true" size={14} />
          </IconButton>
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
  ref: Ref<HTMLImageElement>
  rotation: number
  selected: boolean
  url: string | undefined
}

/** White is page stock (DESIGN.md): text on the sheet is ink, `text-muted` fails there. */
const SHEET =
  'bg-white shadow-[0_1px_3px_rgb(0_0_0/0.18)] transition-shadow duration-150 group-hover:shadow-[0_4px_12px_rgb(0_0_0/0.18)]'
const PICKED = 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--background)]'

function Thumbnail({ blank, error, label, number, ref, rotation, selected, url }: ThumbnailProps) {
  const { t } = useTranslation()
  const sheet = cx(SHEET, selected ? PICKED : 'ring-1 ring-ink/15')
  if (blank)
    return (
      <span
        className={cx(
          sheet,
          'flex h-full w-[94%] flex-col items-center justify-center gap-2 text-ink/60',
        )}
      >
        <FileText aria-hidden="true" size={24} />
        <span className="text-xs">{t('pageGrid.blank')}</span>
      </span>
    )
  if (url)
    return (
      <img
        alt={label}
        className={cx(sheet, 'max-h-full max-w-full object-contain')}
        // Otherwise a native image drag cancels the crop gesture.
        draggable={false}
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
  // The cell may be a button, so the label stays even while there is nothing to show.
  return (
    <>
      <Skeleton className="h-full w-[94%] rounded-sm" />
      <span className="sr-only">{t('pageGrid.loading', { number })}</span>
    </>
  )
}
