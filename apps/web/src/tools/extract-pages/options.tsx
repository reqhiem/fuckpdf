import type { ExtractPagesOptions } from '@fuckpdf/tools'
import { Input, Label, Switch, TextField } from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function ExtractPagesOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as ExtractPagesOptions

  return (
    <div className="flex flex-col gap-4">
      <TextField onChange={(pages) => onChange({ ...options, pages })} value={options.pages ?? ''}>
        <Label>{t('options.extract-pages.pages')}</Label>
        <Input />
      </TextField>

      <Switch
        isSelected={options.split ?? false}
        onChange={(split) => onChange({ ...options, split })}
      >
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>{t('options.extract-pages.split')}</Label>
        </Switch.Content>
      </Switch>
    </div>
  )
}
