import type { RotateOptions } from '@fuckpdf/tools'
import {
  Description,
  Fieldset,
  Input,
  Label,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

const ANGLES = [90, 180, 270]

export default function RotateOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as RotateOptions
  const angle = options.angle ?? 90

  return (
    <div className="flex flex-col gap-4">
      <Fieldset>
        <Fieldset.Legend>{t('options.rotate.angle')}</Fieldset.Legend>
        <ToggleButtonGroup
          aria-label={t('options.rotate.angle')}
          disallowEmptySelection
          fullWidth
          onSelectionChange={(keys) =>
            onChange({ ...options, angle: Number([...keys][0] ?? angle) })
          }
          selectedKeys={[String(angle)]}
        >
          {ANGLES.map((deg) => (
            <ToggleButton className="measure" id={String(deg)} key={deg}>
              {t(`options.rotate.angle${deg}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Description>{t('options.rotate.angleHint')}</Description>
      </Fieldset>

      <TextField onChange={(pages) => onChange({ ...options, pages })} value={options.pages ?? ''}>
        <Label>{t('options.rotate.pages')}</Label>
        <Input className="measure" />
        <Description>{t('options.rotate.pagesHint')}</Description>
      </TextField>
    </div>
  )
}
