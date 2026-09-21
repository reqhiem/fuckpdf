import type { ExtractPagesOptions } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function ExtractPagesOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as ExtractPagesOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.extract-pages.pages')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="text"
          value={options.pages ?? ''}
          onChange={(e) => onChange({ ...options, pages: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={options.split ?? false}
          onChange={(e) => onChange({ ...options, split: e.target.checked })}
        />
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.extract-pages.split')}
        </span>
      </label>
    </div>
  )
}
