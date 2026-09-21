import type { JpgToPdfOptions } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function JpgToPdfOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as JpgToPdfOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.jpg-to-pdf.pageSize')}
        </span>
        <select
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.pageSize ?? 'A4'}
          onChange={(e) =>
            onChange({ ...options, pageSize: e.target.value as 'A4' | 'Letter' | 'fit-image' })
          }
        >
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
          <option value="fit-image">Fit Image</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.jpg-to-pdf.orientation')}
        </span>
        <select
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.orientation ?? 'portrait'}
          onChange={(e) =>
            onChange({ ...options, orientation: e.target.value as 'portrait' | 'landscape' })
          }
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.jpg-to-pdf.margin')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="number"
          min={0}
          value={options.margin ?? 0}
          onChange={(e) => onChange({ ...options, margin: Number(e.target.value) })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.jpg-to-pdf.fitMode')}
        </span>
        <select
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.fitMode ?? 'contain'}
          onChange={(e) =>
            onChange({ ...options, fitMode: e.target.value as 'contain' | 'cover' | 'fill' })
          }
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="fill">Fill</option>
        </select>
      </label>
    </div>
  )
}
