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
  useSortable,
} from '@dnd-kit/sortable'
import { cx, IconButton, Skeleton } from '@fuckpdf/ui'
import { FileText, GripVertical, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatBytes } from '../../lib/format'
import { isImage, SHEET } from './thumb'
import { type FileThumbnail, isRendered, useFileThumbnails } from './use-file-thumbnails'

export type FileStripProps = {
  files: File[]
  onChange: (files: File[]) => void
  reorderable?: boolean
  compact?: boolean
}

// Two identical files can be dropped twice, so a drag is keyed on identity, not name.
const identities = new WeakMap<File, string>()
const idOf = (file: File): string => {
  const known = identities.get(file)
  if (known) return known
  const made = crypto.randomUUID()
  identities.set(file, made)
  return made
}

export function FileStrip({
  files,
  onChange,
  reorderable = false,
  compact = false,
}: FileStripProps) {
  const { t } = useTranslation()
  const thumbnails = useFileThumbnails(files)
  const ids = useMemo(() => files.map(idOf), [files])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!files.length) return null

  const nameOf = (id: string | number) => files.find((file) => idOf(file) === id)?.name ?? ''
  const positionOf = (id: string | number) => files.findIndex((file) => idOf(file) === id) + 1

  const announcements: Announcements = {
    onDragStart: ({ active }) => t('preview.dnd.picked', { name: nameOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t('preview.dnd.moved', { name: nameOf(active.id), over: positionOf(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('preview.dnd.dropped', { name: nameOf(active.id), over: positionOf(over.id) })
        : undefined,
    onDragCancel: ({ active }) => t('preview.dnd.cancelled', { name: nameOf(active.id) }),
  }

  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = files.findIndex((file) => idOf(file) === active.id)
    const to = files.findIndex((file) => idOf(file) === over.id)
    if (from < 0 || to < 0) return
    onChange(arrayMove(files, from, to))
  }

  const remove = (file: File) => onChange(files.filter((item) => item !== file))

  if (compact)
    return (
      <ul aria-label={t('preview.files')} className="space-y-2">
        {files.map((file) => (
          <FileRow
            file={file}
            key={idOf(file)}
            onRemove={remove}
            thumbnail={thumbnails.get(file)}
          />
        ))}
      </ul>
    )

  const list = (
    <ul
      aria-label={t('preview.files')}
      className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(11rem,1fr))]"
    >
      {files.map((file, index) => {
        const card = {
          file,
          onRemove: remove,
          position: index + 1,
          reorderable,
          thumbnail: thumbnails.get(file),
          total: files.length,
        }
        return reorderable ? (
          <SortableFileCard key={idOf(file)} {...card} />
        ) : (
          <FileCard key={idOf(file)} {...card} />
        )
      })}
    </ul>
  )

  if (!reorderable) return list

  return (
    <DndContext
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t('preview.dnd.instructions') },
      }}
      collisionDetection={closestCenter}
      onDragEnd={dragEnd}
      sensors={sensors}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        {list}
      </SortableContext>
    </DndContext>
  )
}

type Sortable = ReturnType<typeof useSortable> & { style: CSSProperties }

type FileCardProps = {
  file: File
  onRemove: (file: File) => void
  position: number
  reorderable: boolean
  sortable?: Sortable
  thumbnail: FileThumbnail | undefined
  total: number
}

function SortableFileCard(props: FileCardProps) {
  const sortable = useSortable({ id: idOf(props.file) })
  const { transform } = sortable
  const style: CSSProperties = {
    transition: sortable.transition,
    ...(transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`,
        }
      : {}),
  }
  return <FileCard {...props} sortable={{ ...sortable, style }} />
}

// HeroUI's button types reject dnd-kit's `aria-pressed: undefined`.
const grip = ({ 'aria-pressed': _pressed, ...rest }: Sortable['attributes']) => rest

function FileCard({
  file,
  onRemove,
  position,
  reorderable,
  sortable,
  thumbnail,
  total,
}: FileCardProps) {
  const { t } = useTranslation()

  return (
    <li
      className={cx(sortable?.isDragging && 'z-10 opacity-80')}
      ref={sortable?.setNodeRef}
      style={sortable?.style}
    >
      <div className="flex aspect-[3/4] w-full items-center justify-center">
        <Preview file={file} thumbnail={thumbnail} />
      </div>

      <div className="mt-2 flex items-center gap-1">
        {reorderable ? (
          <span aria-hidden="true" className="measure shrink-0 pr-1 text-xs text-muted">
            {position}
          </span>
        ) : null}
        <div className="mr-auto min-w-0">
          <p className="truncate text-sm" title={file.name}>
            {file.name}
          </p>
          <p className="measure text-xs text-muted">{formatBytes(file.size)}</p>
        </div>
        {sortable ? (
          <IconButton
            className="cursor-grab"
            label={t('preview.reorder', { name: file.name, number: position, total })}
            ref={sortable.setActivatorNodeRef}
            {...grip(sortable.attributes)}
            {...sortable.listeners}
          >
            <GripVertical aria-hidden="true" size={16} />
          </IconButton>
        ) : null}
        <IconButton
          className="hover:text-danger"
          label={t('preview.remove', { name: file.name })}
          onPress={() => onRemove(file)}
        >
          <Trash2 aria-hidden="true" size={16} />
        </IconButton>
      </div>
    </li>
  )
}

function FileRow({
  file,
  onRemove,
  thumbnail,
}: Pick<FileCardProps, 'file' | 'onRemove' | 'thumbnail'>) {
  const { t } = useTranslation()
  const pages = isRendered(thumbnail) ? thumbnail.pages : undefined
  return (
    <li className="flex items-center gap-3">
      <div className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden p-0.5">
        <Preview file={file} thumbnail={thumbnail} />
      </div>
      <div className="mr-auto min-w-0">
        <p className="truncate text-sm" title={file.name}>
          {file.name}
        </p>
        <p className="measure text-xs text-muted">
          {formatBytes(file.size)}
          {pages ? ` · ${t('preview.pageCount', { count: pages })}` : ''}
        </p>
      </div>
      <IconButton
        className="hover:text-danger"
        label={t('preview.remove', { name: file.name })}
        onPress={() => onRemove(file)}
      >
        <Trash2 aria-hidden="true" size={16} />
      </IconButton>
    </li>
  )
}

function Preview({ file, thumbnail }: { file: File; thumbnail: FileThumbnail | undefined }) {
  const { t } = useTranslation()

  if (isRendered(thumbnail))
    return (
      <img
        alt={
          thumbnail.pages
            ? t('preview.pdfAlt', { name: file.name, total: thumbnail.pages })
            : t('preview.imageAlt', { name: file.name })
        }
        className={cx(SHEET, 'max-h-full max-w-full object-contain')}
        draggable={false}
        src={thumbnail.url}
      />
    )

  if (thumbnail)
    return (
      <span
        className={cx(
          SHEET,
          'flex h-full w-[72%] flex-col items-center justify-center gap-2 px-2 text-center text-ink/60',
        )}
      >
        <FileText aria-hidden="true" size={24} />
        <span className="w-full truncate text-xs">{file.name}</span>
      </span>
    )

  return (
    <>
      <Skeleton
        className={cx('h-full', isImage(file.type) ? 'w-[86%]' : 'w-[72%]', 'rounded-sm')}
      />
      <span className="sr-only">{t('preview.loading', { name: file.name })}</span>
    </>
  )
}
