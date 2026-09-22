import type { PageNumbersOptions, PositionAnchor } from '@fuckpdf/tools'
import {
  Description,
  Fieldset,
  Input,
  Label,
  NumberField,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

/**
 * Nine standalone `ToggleButton`s rather than a `ToggleButtonGroup`: React Aria's group
 * turns single-select children into `role="radio"` and deletes their `aria-pressed`, and
 * the group itself becomes `role="radiogroup"`. The picker's contract — a `group` named
 * "Position" holding nine pressable buttons — is what the e2e suite asserts, so the
 * grouping stays a real `<fieldset>`/`<legend>` and the buttons stay buttons.
 */
const POSITIONS: { id: PositionAnchor; align: string }[] = [
  { id: 'top-left', align: 'items-start justify-start' },
  { id: 'top-center', align: 'items-start justify-center' },
  { id: 'top-right', align: 'items-start justify-end' },
  { id: 'middle-left', align: 'items-center justify-start' },
  { id: 'middle-center', align: 'items-center justify-center' },
  { id: 'middle-right', align: 'items-center justify-end' },
  { id: 'bottom-left', align: 'items-end justify-start' },
  { id: 'bottom-center', align: 'items-end justify-center' },
  { id: 'bottom-right', align: 'items-end justify-end' },
]

const FONTS = [
  { id: 'Helvetica', label: 'fontHelvetica' },
  { id: 'Times-Roman', label: 'fontTimesRoman' },
] as const

const HEX = /^[0-9a-fA-F]{6}$/

export default function PageNumbersOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as PageNumbersOptions
  const font = options.font ?? 'Helvetica'
  const color = options.color ?? '000000'

  return (
    <div className="flex flex-col gap-4">
      <Fieldset>
        <Fieldset.Legend>{t('options.page-numbers.position')}</Fieldset.Legend>
        {/* Squared off on purpose: each button is a miniature page, and a circle has no
            corners for the dot to sit in, which makes "top left" unreadable. */}
        <div className="grid w-fit grid-cols-3 gap-1">
          {POSITIONS.map((pos) => (
            <ToggleButton
              aria-label={t(`options.page-numbers.anchors.${pos.id}`)}
              className={`flex rounded-[0.25rem] p-2 ${pos.align}`}
              isIconOnly
              isSelected={options.position === pos.id}
              key={pos.id}
              onChange={() => onChange({ ...options, position: pos.id })}
            >
              {/* Not `bg-current`: HeroUI's selected foreground is the accent mixed toward
                  ink, which comes out quieter than the unselected ink dots and makes the
                  selection read backwards. The selected dot has to be the loudest one. */}
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${
                  options.position === pos.id ? 'bg-accent' : 'bg-muted'
                }`}
              />
            </ToggleButton>
          ))}
        </div>
      </Fieldset>

      <NumberField
        onChange={(firstNumber) => onChange({ ...options, firstNumber: firstNumber ?? 1 })}
        value={options.firstNumber ?? 1}
      >
        <Label>{t('options.page-numbers.firstNumber')}</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="measure" />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>

      <TextField onChange={(pages) => onChange({ ...options, pages })} value={options.pages ?? ''}>
        <Label>{t('options.page-numbers.pages')}</Label>
        <Input />
        <Description>{t('options.page-numbers.pagesHint')}</Description>
      </TextField>

      <TextField
        onChange={(format) => onChange({ ...options, format })}
        value={options.format ?? '{n}'}
      >
        <Label>{t('options.page-numbers.format')}</Label>
        <Input />
        <Description>{t('options.page-numbers.formatHint')}</Description>
      </TextField>

      <Fieldset>
        <Fieldset.Legend>{t('options.page-numbers.font')}</Fieldset.Legend>
        <ToggleButtonGroup
          aria-label={t('options.page-numbers.font')}
          disallowEmptySelection
          onSelectionChange={(keys) =>
            onChange({
              ...options,
              font: String([...keys][0] ?? font) as PageNumbersOptions['font'],
            })
          }
          selectedKeys={[font]}
        >
          {FONTS.map((option) => (
            <ToggleButton id={option.id} key={option.id}>
              {t(`options.page-numbers.${option.label}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Fieldset>

      <NumberField
        minValue={1}
        onChange={(size) => onChange({ ...options, size: size ?? 12 })}
        value={options.size ?? 12}
      >
        <Label>{t('options.page-numbers.size')}</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="measure" />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>

      <TextField onChange={(next) => onChange({ ...options, color: next })} value={color}>
        <Label>{t('options.page-numbers.color')}</Label>
        <div className="flex items-center gap-2">
          <Input className="measure" />
          {/* The native colour input is the platform's picker; nothing here rebuilds one. */}
          <input
            aria-label={t('options.page-numbers.colorSwatch')}
            className="size-9 shrink-0 cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-transparent"
            onChange={(event) => onChange({ ...options, color: event.target.value.slice(1) })}
            type="color"
            value={HEX.test(color) ? `#${color}` : '#000000'}
          />
        </div>
        <Description>{t('options.page-numbers.colorHint')}</Description>
      </TextField>

      <NumberField
        minValue={0}
        onChange={(margin) => onChange({ ...options, margin: margin ?? 20 })}
        value={options.margin ?? 20}
      >
        <Label>{t('options.page-numbers.margin')}</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="measure" />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
    </div>
  )
}
