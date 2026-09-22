import type { CropOptions } from '@fuckpdf/tools'
import { Description, Fieldset, Input, Label, NumberField, TextField } from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

type Box = CropOptions['box']

const FIELDS: { key: keyof Box; label: string; min: number }[] = [
  { key: 'x', label: 'boxX', min: 0 },
  { key: 'y', label: 'boxY', min: 0 },
  { key: 'width', label: 'boxWidth', min: 1 },
  { key: 'height', label: 'boxHeight', min: 1 },
]

// No flatten switch: the step's flatten path throws unconditionally, so offering it only
// guarantees an error.
export default function CropOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as CropOptions
  const box = options.box || { x: 0, y: 0, width: 100, height: 100 }

  return (
    <div className="flex flex-col gap-5">
      <Fieldset>
        <Fieldset.Legend>{t('options.crop.box')}</Fieldset.Legend>
        <Description>{t('options.crop.boxHint')}</Description>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((field) => (
            <NumberField
              key={field.key}
              minValue={field.min}
              onChange={(next) =>
                onChange({ ...options, box: { ...box, [field.key]: next ?? field.min } })
              }
              value={box[field.key]}
            >
              <Label>{t(`options.crop.${field.label}`)}</Label>
              <NumberField.Group>
                <NumberField.Input className="measure" />
              </NumberField.Group>
            </NumberField>
          ))}
        </div>
      </Fieldset>

      <TextField onChange={(pages) => onChange({ ...options, pages })} value={options.pages ?? ''}>
        <Label>{t('options.crop.pages')}</Label>
        <Input className="measure" />
        <Description>{t('options.crop.pagesHint')}</Description>
      </TextField>
    </div>
  )
}
