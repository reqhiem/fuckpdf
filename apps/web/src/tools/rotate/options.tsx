import type { RotateOptions } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function RotateOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as RotateOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.rotate.angle')}
        </span>
        <select
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.angle ?? 90}
          onChange={(e) => onChange({ ...options, angle: Number(e.target.value) })}
        >
          <option value={90}>90°</option>
          <option value={180}>180°</option>
          <option value={270}>270°</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.rotate.pages')}
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
