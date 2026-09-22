// `value`/`onChange` are ignored: the editor store owns the elements, and a copy through
// the options object would be a second source of truth.
import type { EditElement, EditFont } from '@fuckpdf/tools'
import {
  Button,
  CloseButton,
  Description,
  Fieldset,
  IconButton,
  Kbd,
  Label,
  ListBox,
  NumberField,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@fuckpdf/ui'
import { ColorChoice } from '@fuckpdf/ui/color-choice'
import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { type EditPatch, useEditorStore } from '../../components/pdf-editor/store'
import { TOOLS } from '../../components/pdf-editor/toolbar'
import type { OptionsPanelProps } from '../../tool/options-panel'

const FONTS: EditFont[] = ['helvetica', 'times', 'courier']
const PDF_MAX_POINTS = 14400
const SWATCHES = ['1a1a1a', 'ffffff', 'e03131', 'f08c00', 'ffe14d', '2f9e44', '1971c2', '7048e8']
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform)

const round = (value: number) => Math.round(value * 10) / 10

function Icon({ type }: { type: EditElement['type'] }) {
  const Glyph = TOOLS.find((tool) => tool.id === type)?.Icon
  return Glyph ? <Glyph aria-hidden={true} size={14} /> : null
}

export default function EditOptionsPanel(_props: OptionsPanelProps) {
  const { t } = useTranslation()
  const selectedId = useEditorStore((state) => state.selectedId)
  const element = useEditorStore((state) =>
    state.elements.find((item) => item.id === state.selectedId),
  )

  if (!element || !selectedId) return <Overview />

  const patch = (changes: EditPatch) => useEditorStore.getState().update(selectedId, changes)
  const name = t(`edit.tools.${element.type}`)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Icon type={element.type} />
        <span className="font-medium">{name}</span>
        <span className="measure text-xs text-muted">
          {t('edit.inspector.onPage', { page: element.page })}
        </span>
        <CloseButton
          aria-label={t('edit.inspector.deselect')}
          className="ml-auto"
          onPress={() => useEditorStore.getState().select(null)}
        />
      </div>

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
              size="sm"
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
            optional
            value={element.fill ?? ''}
          />
          <Colour
            label={t('edit.inspector.stroke')}
            onChange={(stroke) => patch({ stroke })}
            optional
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

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <Button
        onPress={() => useEditorStore.getState().remove(selectedId)}
        size="sm"
        variant="outline"
      >
        {t('edit.inspector.delete', { type: name })}
      </Button>
    </div>
  )
}

function Overview() {
  const { t } = useTranslation()
  const page = useEditorStore((state) => state.page)
  const elements = useEditorStore((state) => state.elements)
  const onPage = useMemo(
    () => elements.filter((element) => element.page === page),
    [elements, page],
  )
  const mod = IS_MAC ? <Kbd.Abbr keyValue="command" /> : <Kbd.Content>Ctrl</Kbd.Content>
  const arrows = (
    <>
      <Kbd.Abbr keyValue="left" />
      <Kbd.Abbr keyValue="up" />
      <Kbd.Abbr keyValue="right" />
      <Kbd.Abbr keyValue="down" />
    </>
  )

  return (
    <div className="flex flex-col gap-5">
      {onPage.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{t('edit.inspector.nothing')}</p>
          <p className="flex justify-between text-xs text-muted">
            {t('edit.inspector.onThisPage')}
            <span className="measure">{onPage.length}</span>
          </p>
          <ListBox
            aria-label={t('edit.inspector.onThisPage')}
            className="-mx-2 text-sm"
            onAction={(key) => useEditorStore.getState().select(String(key))}
          >
            {onPage.map((element) => {
              const name = t(`edit.tools.${element.type}`)
              const x = Math.round(element.x)
              const y = Math.round(element.y)
              return (
                <ListBox.Item
                  id={element.id}
                  key={element.id}
                  textValue={t('edit.elementLabel', { type: name, x, y })}
                >
                  <Icon type={element.type} />
                  <span className="truncate">
                    {element.type === 'text' ? element.text.split('\n')[0] || name : name}
                  </span>
                  <span className="measure ml-auto shrink-0 text-xs text-muted">
                    {x}, {y}
                  </span>
                </ListBox.Item>
              )
            })}
          </ListBox>
        </div>
      ) : (
        <p className="text-sm text-muted">
          <span className="text-foreground">{t('edit.inspector.nothing')}</span>{' '}
          {t('edit.inspector.blank', { page })}
        </p>
      )}

      <section aria-labelledby="edit-keys" className="flex flex-col gap-2">
        <p className="text-xs text-muted" id="edit-keys">
          {t('edit.inspector.keys')}
        </p>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-xs">
          <Shortcut label={t('edit.inspector.keyNudge')}>
            <Kbd>{arrows}</Kbd>
          </Shortcut>
          <Shortcut label={t('edit.inspector.keyNudgeFast')}>
            <Kbd>
              <Kbd.Abbr keyValue="shift" />
              {arrows}
            </Kbd>
          </Shortcut>
          <Shortcut label={t('edit.inspector.keyDelete')}>
            <Kbd>
              <Kbd.Abbr keyValue="delete" />
            </Kbd>
          </Shortcut>
          <Shortcut label={t('edit.inspector.keyEdit')}>
            <Kbd>
              <Kbd.Content>Enter</Kbd.Content>
            </Kbd>
          </Shortcut>
          <Shortcut label={t('edit.inspector.keyDeselect')}>
            <Kbd>
              <Kbd.Content>Esc</Kbd.Content>
            </Kbd>
          </Shortcut>
          <Shortcut label={t('edit.inspector.keyUndo')}>
            <Kbd>
              {mod}
              <Kbd.Content>Z</Kbd.Content>
            </Kbd>
          </Shortcut>
          <Shortcut label={t('edit.inspector.keyZoom')}>
            <span className="flex gap-1">
              <Kbd>
                <Kbd.Content>+</Kbd.Content>
              </Kbd>
              <Kbd>
                <Kbd.Content>−</Kbd.Content>
              </Kbd>
              <Kbd>
                <Kbd.Content>0</Kbd.Content>
              </Kbd>
            </span>
          </Shortcut>
        </dl>
      </section>
    </div>
  )
}

function Shortcut({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{children}</dt>
      <dd className="text-muted">{label}</dd>
    </>
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
        <NumberField.Input className="measure" />
      </NumberField.Group>
    </NumberField>
  )
}

type ColourProps = {
  label: string
  value: string
  optional?: boolean
  onChange: (value: string) => void
}

function Colour({ label, value, optional = false, onChange }: ColourProps) {
  const { t } = useTranslation()

  return (
    <ColorChoice
      action={
        optional ? (
          value ? (
            <IconButton
              label={t('edit.inspector.remove', { label: label.toLowerCase() })}
              onPress={() => onChange('')}
            >
              <Minus aria-hidden={true} size={14} />
            </IconButton>
          ) : (
            <IconButton
              label={t('edit.inspector.add', { label: label.toLowerCase() })}
              onPress={() => onChange(SWATCHES[0] as string)}
            >
              <Plus aria-hidden={true} size={14} />
            </IconButton>
          )
        ) : null
      }
      empty={<p className="text-xs text-muted">{t('edit.inspector.none')}</p>}
      label={label}
      labels={{
        custom: t('edit.inspector.custom', { label: label.toLowerCase() }),
        area: t('options.colour.area'),
        hue: t('options.colour.hue'),
        hex: t('edit.inspector.hex', { label }),
      }}
      onChange={onChange}
      swatches={SWATCHES}
      value={value}
    />
  )
}
