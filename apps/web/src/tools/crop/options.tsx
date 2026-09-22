import type { CropOptions } from '@fuckpdf/tools'
import { Description, Input, Label, NumberField, Switch, TextField } from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function CropOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as CropOptions
  const box = options.box || { x: 0, y: 0, width: 100, height: 100 }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          minValue={0}
          onChange={(x) => onChange({ ...options, box: { ...box, x: x ?? 0 } })}
          value={box.x}
        >
          <Label>{t('options.crop.boxX')}</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="measure" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>

        <NumberField
          minValue={0}
          onChange={(y) => onChange({ ...options, box: { ...box, y: y ?? 0 } })}
          value={box.y}
        >
          <Label>{t('options.crop.boxY')}</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="measure" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>

        <NumberField
          minValue={1}
          onChange={(width) => onChange({ ...options, box: { ...box, width: width ?? 1 } })}
          value={box.width}
        >
          <Label>{t('options.crop.boxWidth')}</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="measure" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>

        <NumberField
          minValue={1}
          onChange={(height) => onChange({ ...options, box: { ...box, height: height ?? 1 } })}
          value={box.height}
        >
          <Label>{t('options.crop.boxHeight')}</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="measure" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
      </div>

      <TextField onChange={(pages) => onChange({ ...options, pages })} value={options.pages ?? ''}>
        <Label>{t('options.crop.pages')}</Label>
        <Input />
        <Description>{t('options.crop.pagesHint')}</Description>
      </TextField>

      <Switch
        isSelected={options.flatten ?? false}
        onChange={(flatten) => onChange({ ...options, flatten })}
      >
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>{t('options.crop.flatten')}</Label>
        </Switch.Content>
      </Switch>
    </div>
  )
}
