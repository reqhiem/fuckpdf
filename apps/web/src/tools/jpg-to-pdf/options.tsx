import type { JpgToPdfOptions } from '@fuckpdf/tools'
import { Fieldset, Label, NumberField, ToggleButton, ToggleButtonGroup } from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

const PAGE_SIZES = [
  { id: 'A4', label: 'pageSizeA4' },
  { id: 'Letter', label: 'pageSizeLetter' },
  { id: 'fit-image', label: 'pageSizeFitImage' },
] as const

const ORIENTATIONS = [
  { id: 'portrait', label: 'orientationPortrait' },
  { id: 'landscape', label: 'orientationLandscape' },
] as const

const FIT_MODES = [
  { id: 'contain', label: 'fitModeContain' },
  { id: 'cover', label: 'fitModeCover' },
  { id: 'fill', label: 'fitModeFill' },
] as const

export default function JpgToPdfOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as JpgToPdfOptions
  const pageSize = options.pageSize ?? 'A4'
  const orientation = options.orientation ?? 'portrait'
  const fitMode = options.fitMode ?? 'contain'

  return (
    <div className="flex flex-col gap-4">
      <Fieldset>
        <Fieldset.Legend>{t('options.jpg-to-pdf.pageSize')}</Fieldset.Legend>
        <ToggleButtonGroup
          aria-label={t('options.jpg-to-pdf.pageSize')}
          disallowEmptySelection
          onSelectionChange={(keys) =>
            onChange({
              ...options,
              pageSize: String([...keys][0] ?? pageSize) as JpgToPdfOptions['pageSize'],
            })
          }
          selectedKeys={[pageSize]}
        >
          {PAGE_SIZES.map((option) => (
            <ToggleButton id={option.id} key={option.id}>
              {t(`options.jpg-to-pdf.${option.label}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>{t('options.jpg-to-pdf.orientation')}</Fieldset.Legend>
        <ToggleButtonGroup
          aria-label={t('options.jpg-to-pdf.orientation')}
          disallowEmptySelection
          onSelectionChange={(keys) =>
            onChange({
              ...options,
              orientation: String([...keys][0] ?? orientation) as JpgToPdfOptions['orientation'],
            })
          }
          selectedKeys={[orientation]}
        >
          {ORIENTATIONS.map((option) => (
            <ToggleButton id={option.id} key={option.id}>
              {t(`options.jpg-to-pdf.${option.label}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Fieldset>

      <NumberField
        minValue={0}
        onChange={(margin) => onChange({ ...options, margin: margin ?? 0 })}
        value={options.margin ?? 0}
      >
        <Label>{t('options.jpg-to-pdf.margin')}</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="measure" />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>

      <Fieldset>
        <Fieldset.Legend>{t('options.jpg-to-pdf.fitMode')}</Fieldset.Legend>
        <ToggleButtonGroup
          aria-label={t('options.jpg-to-pdf.fitMode')}
          disallowEmptySelection
          onSelectionChange={(keys) =>
            onChange({
              ...options,
              fitMode: String([...keys][0] ?? fitMode) as JpgToPdfOptions['fitMode'],
            })
          }
          selectedKeys={[fitMode]}
        >
          {FIT_MODES.map((option) => (
            <ToggleButton id={option.id} key={option.id}>
              {t(`options.jpg-to-pdf.${option.label}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Fieldset>
    </div>
  )
}
