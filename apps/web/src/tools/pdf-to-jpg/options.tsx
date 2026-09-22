import type { PdfToJpgOptions } from '@fuckpdf/tools'
import {
  Description,
  Fieldset,
  Label,
  NumberField,
  ToggleButton,
  ToggleButtonGroup,
} from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

const FORMATS = [
  { id: 'jpeg', label: 'formatJpeg' },
  { id: 'png', label: 'formatPng' },
  { id: 'webp', label: 'formatWebp' },
] as const

export default function PdfToJpgOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as PdfToJpgOptions
  const format = options.format ?? 'jpeg'

  return (
    <div className="flex flex-col gap-4">
      <NumberField
        maxValue={300}
        minValue={72}
        onChange={(dpi) => onChange({ ...options, dpi: dpi ?? 150 })}
        value={options.dpi ?? 150}
      >
        <Label>{t('options.pdf-to-jpg.dpi')}</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="measure" />
          <NumberField.IncrementButton />
        </NumberField.Group>
        <Description>{t('options.pdf-to-jpg.dpiHint')}</Description>
      </NumberField>

      <Fieldset>
        <Fieldset.Legend>{t('options.pdf-to-jpg.format')}</Fieldset.Legend>
        <ToggleButtonGroup
          aria-label={t('options.pdf-to-jpg.format')}
          disallowEmptySelection
          fullWidth
          onSelectionChange={(keys) =>
            onChange({
              ...options,
              format: String([...keys][0] ?? format) as PdfToJpgOptions['format'],
            })
          }
          selectedKeys={[format]}
        >
          {FORMATS.map((option) => (
            <ToggleButton id={option.id} key={option.id}>
              {t(`options.pdf-to-jpg.${option.label}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Fieldset>
    </div>
  )
}
