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

export type PageGridCrop = { pageId: string; rect: CropRect }

/** Separate from `PageGridProps`: passing `onCropChange` is what turns the overlay on. */
export type PageGridCropProps = {
  crop?: PageGridCrop | null
  onCropChange?: (crop: PageGridCrop | null) => void
}

const NO_CAPABILITIES: Required<PageGridCapabilities> = {
  reorder: false,
  select: false,
  rotate: false,
  remove: false,
  duplicate: false,
  insertBlank: false,
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
  const active = useMemo(() => ({ ...NO_CAPABILITIES, ...capabilities }), [capabilities])
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
          <Button onPress={insertBlank} size="sm" variant="ghost">
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
            // auto-fill, not auto-fit: a four-page file keeps small cells instead of four
            // posters stretched across the column.
            className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3"
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
