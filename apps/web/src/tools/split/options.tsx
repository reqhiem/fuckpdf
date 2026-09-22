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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

const MODES = [
  { id: 'all', label: 'modeAll' },
  { id: 'custom', label: 'modeCustom' },
  { id: 'every-n', label: 'modeEveryN' },
  { id: 'size', label: 'modeSize' },
] as const

const MB = 1_000_000
const EVERY_N = 2

export default function SplitOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as SplitOptions
  const mode = options.mode ?? 'all'
  // Local text: re-joining the parsed list would swallow a comma the moment it is typed.
  const [ranges, setRanges] = useState(() => options.ranges?.join(', ') ?? '')

  return (
    <div className="flex flex-col gap-4">
      <Select
        // Seeded so the step receives the value the field displays, not `undefined`.
        onChange={(key) =>
          onChange({
            ...options,
            mode: String(key ?? mode) as SplitMode,
            everyN: options.everyN ?? EVERY_N,
            maxSize: options.maxSize ?? MB,
          })
        }
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
          onChange={(text) => {
            setRanges(text)
            onChange({
              ...options,
              ranges: text
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }}
          value={ranges}
        >
          <Label>{t('options.split.ranges')}</Label>
          <Input className="measure" placeholder="1-3, 4-6, 7" />
          <Description>{t('options.split.rangesHint')}</Description>
        </TextField>
      )}

      {mode === 'every-n' && (
        <NumberField
          minValue={1}
          onChange={(everyN) => onChange({ ...options, everyN: everyN || EVERY_N })}
          value={options.everyN ?? EVERY_N}
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
          formatOptions={{ maximumFractionDigits: 1 }}
          minValue={0.1}
          onChange={(mb) => onChange({ ...options, maxSize: Math.round((mb || 1) * MB) })}
          step={0.1}
          value={(options.maxSize ?? MB) / MB}
        >
          <Label>{t('options.split.maxSize')}</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="measure" />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description>{t('options.split.maxSizeHint')}</Description>
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
