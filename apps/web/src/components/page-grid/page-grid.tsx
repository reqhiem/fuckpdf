/**
 * The page grid (PRD §3). Organize, remove-pages, extract-pages and crop all render this
 * and differ only in `capabilities` — the component itself has no idea which tool it is
 * standing in.
 *
 * Thumbnails come from the PDFium worker (AGENTS.md invariant 3); this file only ever
 * holds object URLs and page numbers.
 */
import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { Button } from '@fuckpdf/ui'
import { FilePlus2 } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { BLANK_PAGE_SOURCE_INDEX } from './blank'
import type { CropRect } from './crop'
import { PageCell, type SelectModifiers } from './page-cell'
import type { PageGridCapabilities, PageGridProps, PageRef } from './types'
import { useThumbnails } from './use-thumbnails'

/** The grid's crop rectangle: one page at a time, reported in PDF points. */
export type PageGridCrop = { pageId: string; rect: CropRect }

/**
 * Crop is not in the frozen `PageGridProps` contract, so it rides alongside it: passing
 * `onCropChange` is what turns the overlay on, and a caller that knows nothing about crop
 * is unaffected.
 */
export type PageGridCropProps = {
  crop?: PageGridCrop | null
  onCropChange?: (crop: PageGridCrop | null) => void
}

/** Everything on unless a tool says otherwise — a grid with no capabilities is a picture. */
const DEFAULT_CAPABILITIES: Required<PageGridCapabilities> = {
  reorder: true,
  select: true,
  rotate: true,
  remove: true,
  duplicate: true,
  insertBlank: true,
}

const renumber = (pages: PageRef[]): PageRef[] =>
  pages.map((page, index) => (page.number === index + 1 ? page : { ...page, number: index + 1 }))

export function PageGrid({
  bytes,
  password,
  pages,
  onChange,
  selected,
  onSelectedChange,
  capabilities,
  crop,
  onCropChange,
}: PageGridProps & PageGridCropProps) {
  const { t } = useTranslation()
  const store = useThumbnails(bytes, password)
  const active = useMemo(() => ({ ...DEFAULT_CAPABILITIES, ...capabilities }), [capabilities])
  const ids = useMemo(() => pages.map((page) => page.id), [pages])
  const anchor = useRef<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const numberOf = (id: string | number) =>
    pages.find((page) => page.id === id)?.number ?? Number(id)

  const announcements: Announcements = {
    onDragStart: ({ active: dragged }) =>
      t('pageGrid.dnd.picked', { number: numberOf(dragged.id) }),
    onDragOver: ({ active: dragged, over }) =>
      over
        ? t('pageGrid.dnd.moved', { number: numberOf(dragged.id), over: numberOf(over.id) })
        : undefined,
    onDragEnd: ({ active: dragged, over }) =>
      over
        ? t('pageGrid.dnd.dropped', { number: numberOf(dragged.id), over: numberOf(over.id) })
        : undefined,
    onDragCancel: ({ active: dragged }) =>
      t('pageGrid.dnd.cancelled', { number: numberOf(dragged.id) }),
  }

  const dragEnd = ({ active: dragged, over }: DragEndEvent) => {
    if (!over || dragged.id === over.id) return
    const from = pages.findIndex((page) => page.id === dragged.id)
    const to = pages.findIndex((page) => page.id === over.id)
    if (from < 0 || to < 0) return
    onChange(renumber(arrayMove(pages, from, to)))
  }

  const select = (id: string, modifiers: SelectModifiers) => {
    if (!onSelectedChange) return
    const next = new Set(selected ?? [])
    const to = pages.findIndex((page) => page.id === id)
    const from = anchor.current ? pages.findIndex((page) => page.id === anchor.current) : -1

    if (modifiers.shiftKey && from >= 0 && to >= 0) {
      const [low, high] = from < to ? [from, to] : [to, from]
      for (const page of pages.slice(low, high + 1)) next.add(page.id)
      onSelectedChange(next)
      return
    }
    anchor.current = id
    if (modifiers.metaKey || modifiers.ctrlKey) {
      if (next.has(id)) next.delete(id)
      else next.add(id)
      onSelectedChange(next)
      return
    }
    // A plain click on the only selected page clears it; otherwise it selects just that one.
    onSelectedChange(next.size === 1 && next.has(id) ? new Set() : new Set([id]))
  }

  const rotate = (id: string) =>
    onChange(
      pages.map((page) =>
        page.id === id ? { ...page, rotation: (page.rotation + 90) % 360 } : page,
      ),
    )

  const remove = (id: string) => {
    onChange(renumber(pages.filter((page) => page.id !== id)))
    if (selected?.has(id) && onSelectedChange) {
      const next = new Set(selected)
      next.delete(id)
      onSelectedChange(next)
    }
    if (crop?.pageId === id) onCropChange?.(null)
  }

  const duplicate = (id: string) => {
    const index = pages.findIndex((page) => page.id === id)
    const page = pages[index]
    if (!page) return
    const copied: PageRef = { ...page, id: crypto.randomUUID() }
    onChange(renumber([...pages.slice(0, index + 1), copied, ...pages.slice(index + 1)]))
  }

  const insertBlank = () =>
    onChange([
      ...pages,
      {
        id: crypto.randomUUID(),
        number: pages.length + 1,
        rotation: 0,
        sourceIndex: BLANK_PAGE_SOURCE_INDEX,
      },
    ])

  const setCrop = (pageId: string, rect: CropRect | null) =>
    onCropChange?.(rect ? { pageId, rect } : null)

  const count = selected?.size ?? 0

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="mr-auto text-sm text-muted">
          {t('pageGrid.count', { count: pages.length })}
          {active.select && count ? ` · ${t('pageGrid.selected', { count })}` : ''}
        </p>
        {onCropChange ? <p className="text-sm text-muted">{t('pageGrid.cropHint')}</p> : null}
        {active.insertBlank ? (
          <Button onClick={insertBlank} variant="ghost">
            <FilePlus2 aria-hidden="true" size={16} />
            {t('pageGrid.insertBlank')}
          </Button>
        ) : null}
      </div>

      <DndContext
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: t('pageGrid.dnd.instructions') },
        }}
        collisionDetection={closestCenter}
        onDragEnd={dragEnd}
        sensors={sensors}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <ul
            aria-label={t('pageGrid.grid')}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {pages.map((page) => (
              <PageCell
                capabilities={active}
                cropActive={crop?.pageId === page.id}
                cropEnabled={!!onCropChange}
                key={page.id}
                onCrop={setCrop}
                onDuplicate={duplicate}
                onRemove={remove}
                onRotate={rotate}
                onSelect={select}
                page={page}
                selected={selected?.has(page.id) ?? false}
                store={store}
                total={pages.length}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {pages.length === 0 ? <p className="text-muted">{t('pageGrid.empty')}</p> : null}
    </div>
  )
}
