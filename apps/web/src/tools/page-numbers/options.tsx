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
import { ColorChoice } from '@fuckpdf/ui/color-choice'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

/** Standalone toggles, not a `ToggleButtonGroup`: React Aria's group would turn these
 * into radios and delete `aria-pressed`, which is what the e2e suite asserts on. */
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

export default function PageNumbersOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as PageNumbersOptions
  const font = options.font ?? 'Helvetica'
  const color = options.color ?? '000000'
  const colourLabels = {
    custom: t('options.colour.custom'),
    area: t('options.colour.area'),
    hue: t('options.colour.hue'),
    hex: t('options.colour.hex'),
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <Fieldset>
          <Fieldset.Legend>{t('options.page-numbers.position')}</Fieldset.Legend>
          {/* Squared off: each button is a miniature page, and a circle has no corners for
              the dot to sit in. */}
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
                {/* Not `bg-current`: HeroUI's selected foreground is quieter than the
                    unselected dots, which makes the selection read backwards. */}
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
          className="min-w-0 flex-1"
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

      <TextField
        onChange={(format) => onChange({ ...options, format })}
        value={options.format ?? '{n}'}
      >
        <Label>{t('options.page-numbers.format')}</Label>
        <Input />
        <Description>{t('options.page-numbers.formatHint')}</Description>
      </TextField>

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
        <Input className="measure" />
        <Description>{t('options.page-numbers.pagesHint')}</Description>
      </TextField>

      <Fieldset>
        <Fieldset.Legend>{t('options.page-numbers.font')}</Fieldset.Legend>
        <ToggleButtonGroup
          aria-label={t('options.page-numbers.font')}
          disallowEmptySelection
          fullWidth
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

      <ColorChoice
        label={t('options.page-numbers.color')}
        labels={colourLabels}
        onChange={(next) => onChange({ ...options, color: next })}
        value={color}
      />
    </div>
  )
}
