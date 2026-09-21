import type { MergeOptions } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function MergeOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as MergeOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.merge.order')}
        </span>
        <textarea
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.order?.join('\n') ?? ''}
          onChange={(e) =>
            onChange({ ...options, order: e.target.value.split('\n').filter(Boolean) })
          }
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.merge.ranges')}
        </span>
        <textarea
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={Object.entries(options.ranges ?? {})
            .map(([k, v]) => `${k}=${v}`)
            .join('\n')}
          onChange={(e) => {
            const ranges: Record<string, string> = {}
            for (const line of e.target.value.split('\n')) {
              const [k, v] = line.split('=')
              if (k && v) ranges[k.trim()] = v.trim()
            }
            onChange({ ...options, ranges })
          }}
        />
      </label>
    </div>
  )
}
