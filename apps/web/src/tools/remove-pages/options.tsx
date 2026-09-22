import type { RemovePagesOptions } from '@fuckpdf/tools'
import { Input, Label, TextField } from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function RemovePagesOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as RemovePagesOptions

  return (
    <TextField onChange={(pages) => onChange({ ...options, pages })} value={options.pages ?? ''}>
      <Label>{t('options.remove-pages.pages')}</Label>
      <Input />
    </TextField>
  )
}
