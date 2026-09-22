import type { SplitMode, SplitOptions } from '@fuckpdf/tools'
import {
  Description,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Switch,
  TextField,
} from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

const MODES = [
  { id: 'all', label: 'modeAll' },
  { id: 'custom', label: 'modeCustom' },
  { id: 'every-n', label: 'modeEveryN' },
  { id: 'size', label: 'modeSize' },
] as const

export default function SplitOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as SplitOptions
  const mode = options.mode ?? 'all'

  return (
    <div className="flex flex-col gap-4">
      {/* Four modes with sentence-length labels: a popover reads better than a row of
          segments, and only one of them is ever relevant at a time. */}
      <Select
        onChange={(key) => onChange({ ...options, mode: String(key ?? mode) as SplitMode })}
        value={mode}
      >
        <Label>{t('options.split.mode')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {MODES.map((option) => (
              <ListBox.Item
                id={option.id}
                key={option.id}
                textValue={t(`options.split.${option.label}`)}
              >
                {t(`options.split.${option.label}`)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {mode === 'custom' && (
        <TextField
          onChange={(text) =>
            onChange({
              ...options,
              ranges: text
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          value={options.ranges?.join(',') ?? ''}
        >
          <Label>{t('options.split.ranges')}</Label>
          <Input />
          <Description>{t('options.split.rangesHint')}</Description>
        </TextField>
      )}

      {mode === 'every-n' && (
        <NumberField
          minValue={1}
          onChange={(everyN) => onChange({ ...options, everyN: everyN ?? 1 })}
          value={options.everyN ?? 1}
        >
          <Label>{t('options.split.everyN')}</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="measure" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
      )}

      {mode === 'size' && (
        <NumberField
          minValue={1}
          onChange={(maxSize) => onChange({ ...options, maxSize: maxSize ?? 1_000_000 })}
          value={options.maxSize ?? 1_000_000}
        >
          <Label>{t('options.split.maxSize')}</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="measure" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
      )}

      <Switch isSelected={options.zip ?? false} onChange={(zip) => onChange({ ...options, zip })}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>{t('options.split.zip')}</Label>
        </Switch.Content>
      </Switch>
    </div>
  )
}
