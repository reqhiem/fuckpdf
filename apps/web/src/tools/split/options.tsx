import type { SplitMode, SplitOptions } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function SplitOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as SplitOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.split.mode')}
        </span>
        <select
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.mode ?? 'all'}
          onChange={(e) => onChange({ ...options, mode: e.target.value as SplitMode })}
        >
          <option value="all">{t('options.split.modeAll')}</option>
          <option value="custom">{t('options.split.modeCustom')}</option>
          <option value="every-n">{t('options.split.modeEveryN')}</option>
          <option value="size">{t('options.split.modeSize')}</option>
        </select>
      </label>

      {options.mode === 'custom' && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink dark:text-paper">
            {t('options.split.ranges')}
          </span>
          <input
            className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
            type="text"
            value={options.ranges?.join(',') ?? ''}
            onChange={(e) =>
              onChange({
                ...options,
                ranges: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      )}

      {options.mode === 'every-n' && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink dark:text-paper">
            {t('options.split.everyN')}
          </span>
          <input
            className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
            type="number"
            min={1}
            value={options.everyN ?? 1}
            onChange={(e) => onChange({ ...options, everyN: Number(e.target.value) })}
          />
        </label>
      )}

      {options.mode === 'size' && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink dark:text-paper">
            {t('options.split.maxSize')}
          </span>
          <input
            className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
            type="number"
            min={1}
            value={options.maxSize ?? 1000000}
            onChange={(e) => onChange({ ...options, maxSize: Number(e.target.value) })}
          />
        </label>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={options.zip ?? false}
          onChange={(e) => onChange({ ...options, zip: e.target.checked })}
        />
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.split.zip')}
        </span>
      </label>
    </div>
  )
}
