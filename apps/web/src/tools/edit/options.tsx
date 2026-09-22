// `value`/`onChange` are ignored: the editor store owns the elements, and a copy through
// the options object would be a second source of truth.
import type { EditFont } from '@fuckpdf/tools'
import {
  Button,
  Description,
  Fieldset,
  Input,
  Label,
  NumberField,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@fuckpdf/ui'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type EditPatch, useEditorStore } from '../../components/pdf-editor/store'
import type { OptionsPanelProps } from '../../tool/options-panel'

const FONTS: EditFont[] = ['helvetica', 'times', 'courier']
const HEX = /^[0-9a-fA-F]{6}$/
const PDF_MAX_POINTS = 14400

const round = (value: number) => Math.round(value * 10) / 10

export default function EditOptionsPanel(_props: OptionsPanelProps) {
  const { t } = useTranslation()
  const selectedId = useEditorStore((state) => state.selectedId)
  const element = useEditorStore((state) =>
    state.elements.find((item) => item.id === state.selectedId),
  )

  if (!element || !selectedId)
    return <p className="text-sm text-muted">{t('edit.inspector.empty')}</p>

  const patch = (changes: EditPatch) => useEditorStore.getState().update(selectedId, changes)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {t(`edit.tools.${element.type}`)} ·{' '}
        <span className="measure">{t('edit.inspector.onPage', { page: element.page })}</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Num label={t('edit.inspector.x')} onChange={(x) => patch({ x })} value={element.x} />
        <Num label={t('edit.inspector.y')} onChange={(y) => patch({ y })} value={element.y} />
        {'width' in element ? (
          <>
            <Num
              label={t('edit.inspector.width')}
              min={1}
              onChange={(width) => patch({ width })}
              value={element.width}
            />
            <Num
              label={t('edit.inspector.height')}
              min={1}
              onChange={(height) => patch({ height })}
              value={element.height}
            />
          </>
        ) : null}
        {element.type === 'line' ? (
          <>
            <Num
              label={t('edit.inspector.x2')}
              onChange={(x2) => patch({ x2 })}
              value={element.x2}
            />
            <Num
              label={t('edit.inspector.y2')}
              onChange={(y2) => patch({ y2 })}
              value={element.y2}
            />
          </>
        ) : null}
      </div>

      {element.type === 'text' ? (
        <>
          <TextField onChange={(text) => patch({ text })} value={element.text}>
            <Label>{t('edit.inspector.text')}</Label>
            <TextArea rows={3} />
            <Description>{t('edit.inspector.textHint')}</Description>
          </TextField>
          <Num
            label={t('edit.inspector.size')}
            min={1}
            onChange={(size) => patch({ size })}
            value={element.size}
          />
          <Fieldset>
            <Fieldset.Legend>{t('edit.inspector.font')}</Fieldset.Legend>
            <ToggleButtonGroup
              aria-label={t('edit.inspector.font')}
              disallowEmptySelection
              onSelectionChange={(keys) =>
                patch({ font: String([...keys][0] ?? element.font) as EditFont })
              }
              selectedKeys={[element.font]}
            >
              {FONTS.map((font) => (
                <ToggleButton id={font} key={font}>
                  {t(`edit.inspector.font_${font}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Fieldset>
          <Colour
            label={t('edit.inspector.color')}
            onChange={(color) => patch({ color })}
            value={element.color}
          />
        </>
      ) : null}

      {element.type === 'highlight' ? (
        <Colour
          label={t('edit.inspector.color')}
          onChange={(color) => patch({ color })}
          value={element.color}
        />
      ) : null}

      {element.type === 'rect' || element.type === 'ellipse' ? (
        <>
          <Colour
            label={t('edit.inspector.fill')}
            onChange={(fill) => patch({ fill })}
            value={element.fill ?? ''}
          />
          <Colour
            label={t('edit.inspector.stroke')}
            onChange={(stroke) => patch({ stroke })}
            value={element.stroke ?? ''}
          />
        </>
      ) : null}

      {element.type === 'line' || element.type === 'ink' ? (
        <Colour
          label={t('edit.inspector.stroke')}
          onChange={(stroke) => patch({ stroke })}
          value={element.stroke}
        />
      ) : null}

      {element.type === 'rect' ||
      element.type === 'ellipse' ||
      element.type === 'line' ||
      element.type === 'ink' ? (
        <Num
          label={t('edit.inspector.strokeWidth')}
          min={0}
          onChange={(strokeWidth) => patch({ strokeWidth })}
          value={element.strokeWidth ?? 1}
        />
      ) : null}

      <Num
        label={t('edit.inspector.opacity')}
        max={100}
        min={0}
        onChange={(percent) => patch({ opacity: percent / 100 })}
        value={(element.opacity ?? 1) * 100}
      />

      <Button onPress={() => useEditorStore.getState().remove(selectedId)} variant="outline">
        {t('edit.inspector.delete', { type: t(`edit.tools.${element.type}`) })}
      </Button>
    </div>
  )
}

type NumProps = {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

function Num({ label, value, min = 0, max = PDF_MAX_POINTS, onChange }: NumProps) {
  return (
    <NumberField
      maxValue={max}
      minValue={min}
      onChange={(next) => onChange(next ?? 0)}
      value={round(value)}
    >
      <Label>{label}</Label>
      <NumberField.Group>
        <NumberField.DecrementButton />
        <NumberField.Input className="measure" />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  )
}

type ColourProps = { label: string; value: string; onChange: (value: string) => void }

function Colour({ label, value, onChange }: ColourProps) {
  const { t } = useTranslation()
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])

  const type = (next: string) => {
    setText(next)
    if (HEX.test(next)) onChange(next.toLowerCase())
  }

  return (
    <TextField onChange={type} value={text}>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input className="measure" />
        <input
          aria-label={t('edit.inspector.colorSwatch', { label })}
          className="size-9 shrink-0 cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-transparent"
          onChange={(event) => type(event.target.value.slice(1))}
          type="color"
          value={HEX.test(text) ? `#${text}` : '#000000'}
        />
      </div>
    </TextField>
  )
}
