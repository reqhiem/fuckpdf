import type { ExtractPagesOptions } from '@fuckpdf/tools'
import { Label, Switch } from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

// No page field: ToolPage overwrites `pages` with the grid selection on run.
export default function ExtractPagesOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as ExtractPagesOptions

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t('options.pickHint')}</p>
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
