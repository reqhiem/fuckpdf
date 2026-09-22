import type { MergeOptions } from '@fuckpdf/tools'
import { Label, TextArea, TextField } from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function MergeOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as MergeOptions

  return (
    <TextField
      onChange={(text) => {
        const ranges: Record<string, string> = {}
        for (const line of text.split('\n')) {
          const [k, v] = line.split('=')
          if (k && v) ranges[k.trim()] = v.trim()
        }
        onChange({ ...options, ranges })
      }}
      value={Object.entries(options.ranges ?? {})
        .map(([k, v]) => `${k}=${v}`)
        .join('\n')}
    >
      <Label>{t('options.merge.ranges')}</Label>
      <TextArea />
    </TextField>
  )
}
