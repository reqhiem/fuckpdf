import type { MergeOptions } from '@fuckpdf/tools'
import { Description, Label, TextArea, TextField } from '@fuckpdf/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

const parse = (text: string) => {
  const ranges: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const at = line.lastIndexOf('=')
    const name = line.slice(0, at).trim()
    const range = line.slice(at + 1).trim()
    if (at > 0 && name && range) ranges[name] = range
  }
  return ranges
}

export default function MergeOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as MergeOptions
  // Local text: deriving it from the parsed ranges would erase a line mid-typing.
  const [text, setText] = useState(() =>
    Object.entries(options.ranges ?? {})
      .map(([name, range]) => `${name}=${range}`)
      .join('\n'),
  )

  return (
    <TextField
      onChange={(next) => {
        setText(next)
        onChange({ ...options, ranges: parse(next) })
      }}
      value={text}
    >
      <Label>{t('options.merge.ranges')}</Label>
      <TextArea placeholder={t('options.merge.rangesPlaceholder')} rows={3} />
      <Description>{t('options.merge.rangesHint')}</Description>
    </TextField>
  )
}
