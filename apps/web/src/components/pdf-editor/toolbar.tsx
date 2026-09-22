import {
  Hint,
  IconButton,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar as ToolbarRoot,
} from '@fuckpdf/ui'
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Highlighter,
  ImagePlus,
  Minus,
  MousePointer2,
  PenLine,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  UnfoldHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { type EditorTool, useEditorStore } from './store'

type IconProps = { size?: number; 'aria-hidden'?: boolean }

export const TOOLS: { id: EditorTool; Icon: ComponentType<IconProps>; key?: string }[] = [
  { id: 'select', Icon: MousePointer2, key: 'V' },
  { id: 'text', Icon: Type, key: 'T' },
  { id: 'image', Icon: ImagePlus },
  { id: 'rect', Icon: Square, key: 'R' },
  { id: 'ellipse', Icon: Circle, key: 'O' },
  { id: 'line', Icon: Minus, key: 'L' },
  { id: 'ink', Icon: PenLine, key: 'P' },
  { id: 'highlight', Icon: Highlighter, key: 'H' },
]

export type ToolbarProps = {
  onImage: (file: File) => void
  isDisabled: boolean
  zoom: number
  isFit: boolean
  onZoom: (direction: 1 | -1) => void
  onFit: () => void
  page: number
  pageCount: number
  onTurn: (delta: number) => void
}

export function Toolbar({
  onImage,
  isDisabled,
  zoom,
  isFit,
  onZoom,
  onFit,
  page,
  pageCount,
  onTurn,
}: ToolbarProps) {
  const { t } = useTranslation()
  const activeTool = useEditorStore((state) => state.activeTool)
  const selectedId = useEditorStore((state) => state.selectedId)
  const canUndo = useEditorStore((state) => state.past.length > 0)
  const canRedo = useEditorStore((state) => state.future.length > 0)
  const store = useEditorStore.getState
  const picker = useRef<HTMLInputElement>(null)

  return (
    <ToolbarRoot
      aria-label={t('edit.toolbar')}
      className="flex w-full flex-wrap items-center gap-1 border-b border-[var(--separator)] px-2 py-1.5"
    >
      <ToggleButtonGroup
        aria-label={t('edit.toolsLabel')}
        disallowEmptySelection
        isDisabled={isDisabled}
        onSelectionChange={(keys) => {
          const next = String([...keys][0] ?? 'select') as EditorTool
          store().setTool(next)
          if (next === 'image') picker.current?.click()
        }}
        selectedKeys={[activeTool]}
        size="sm"
      >
        {TOOLS.map(({ id, Icon, key }) => (
          <Hint
            key={id}
            label={
              key ? t('edit.shortcut', { name: t(`edit.tools.${id}`), key }) : t(`edit.tools.${id}`)
            }
          >
            <ToggleButton aria-label={t(`edit.tools.${id}`)} id={id} isIconOnly>
              <Icon aria-hidden={true} size={16} />
            </ToggleButton>
          </Hint>
        ))}
      </ToggleButtonGroup>

      <Separator className="mx-1 h-5" />

      <IconButton isDisabled={!canUndo} label={t('edit.undo')} onPress={() => store().undo()}>
        <Undo2 aria-hidden={true} size={16} />
      </IconButton>
      <IconButton isDisabled={!canRedo} label={t('edit.redo')} onPress={() => store().redo()}>
        <Redo2 aria-hidden={true} size={16} />
      </IconButton>
      <IconButton
        isDisabled={!selectedId}
        label={t('edit.delete')}
        onPress={() => selectedId && store().remove(selectedId)}
      >
        <Trash2 aria-hidden={true} size={16} />
      </IconButton>

      <div className="ml-auto flex items-center gap-1">
        <IconButton isDisabled={isDisabled} label={t('edit.zoomOut')} onPress={() => onZoom(-1)}>
          <ZoomOut aria-hidden={true} size={16} />
        </IconButton>
        <span className="measure w-12 text-center text-xs" title={t('edit.zoom')}>
          {Math.round(zoom * 100)}%
        </span>
        <IconButton isDisabled={isDisabled} label={t('edit.zoomIn')} onPress={() => onZoom(1)}>
          <ZoomIn aria-hidden={true} size={16} />
        </IconButton>
        <IconButton isDisabled={isDisabled || isFit} label={t('edit.fit')} onPress={onFit}>
          <UnfoldHorizontal aria-hidden={true} size={16} />
        </IconButton>

        {pageCount > 1 ? (
          <>
            <Separator className="mx-1 h-5" />
            <IconButton
              isDisabled={page <= 1}
              label={t('edit.previousPage')}
              onPress={() => onTurn(-1)}
            >
              <ChevronLeft aria-hidden={true} size={16} />
            </IconButton>
            <span className="measure text-xs whitespace-nowrap">
              {t('edit.pageOf', { page, total: pageCount })}
            </span>
            <IconButton
              isDisabled={page >= pageCount}
              label={t('edit.nextPage')}
              onPress={() => onTurn(1)}
            >
              <ChevronRight aria-hidden={true} size={16} />
            </IconButton>
          </>
        ) : null}
      </div>

      <input
        accept="image/png,image/jpeg"
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onImage(file)
          event.target.value = ''
        }}
        ref={picker}
        tabIndex={-1}
        type="file"
      />
    </ToolbarRoot>
  )
}
