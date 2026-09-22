import { Button, ToggleButton, ToggleButtonGroup } from '@fuckpdf/ui'
import {
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
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { type EditorTool, useEditorStore } from './store'

type IconProps = { size?: number; 'aria-hidden'?: boolean }

const TOOLS: { id: EditorTool; Icon: ComponentType<IconProps> }[] = [
  { id: 'select', Icon: MousePointer2 },
  { id: 'text', Icon: Type },
  { id: 'image', Icon: ImagePlus },
  { id: 'rect', Icon: Square },
  { id: 'ellipse', Icon: Circle },
  { id: 'line', Icon: Minus },
  { id: 'ink', Icon: PenLine },
  { id: 'highlight', Icon: Highlighter },
]

export type ToolbarProps = {
  onImage: (file: File) => void
  isDisabled: boolean
}

export function Toolbar({ onImage, isDisabled }: ToolbarProps) {
  const { t } = useTranslation()
  const activeTool = useEditorStore((state) => state.activeTool)
  const selectedId = useEditorStore((state) => state.selectedId)
  const canUndo = useEditorStore((state) => state.past.length > 0)
  const canRedo = useEditorStore((state) => state.future.length > 0)
  const store = useEditorStore.getState
  const picker = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
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
      >
        {TOOLS.map(({ id, Icon }) => (
          <ToggleButton aria-label={t(`edit.tools.${id}`)} id={id} isIconOnly key={id}>
            <Icon aria-hidden={true} size={16} />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <div className="ml-auto flex items-center gap-1">
        <Button
          aria-label={t('edit.undo')}
          isDisabled={!canUndo}
          isIconOnly
          onPress={() => store().undo()}
          variant="ghost"
        >
          <Undo2 aria-hidden={true} size={16} />
        </Button>
        <Button
          aria-label={t('edit.redo')}
          isDisabled={!canRedo}
          isIconOnly
          onPress={() => store().redo()}
          variant="ghost"
        >
          <Redo2 aria-hidden={true} size={16} />
        </Button>
        <Button
          aria-label={t('edit.delete')}
          isDisabled={!selectedId}
          isIconOnly
          onPress={() => selectedId && store().remove(selectedId)}
          variant="ghost"
        >
          <Trash2 aria-hidden={true} size={16} />
        </Button>
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
    </div>
  )
}
