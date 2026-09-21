import type { RemovePagesOptions } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function RemovePagesOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as RemovePagesOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.remove-pages.pages')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="text"
          value={options.pages ?? ''}
          onChange={(e) => onChange({ ...options, pages: e.target.value })}
        />
      </label>
    </div>
  )
}
