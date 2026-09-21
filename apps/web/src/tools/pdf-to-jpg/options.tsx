import type { PdfToJpgOptions } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function PdfToJpgOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as PdfToJpgOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.pdf-to-jpg.dpi')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="number"
          min={72}
          max={300}
          value={options.dpi ?? 150}
          onChange={(e) => onChange({ ...options, dpi: Number(e.target.value) })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.pdf-to-jpg.format')}
        </span>
        <select
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.format ?? 'jpeg'}
          onChange={(e) =>
            onChange({ ...options, format: e.target.value as 'jpeg' | 'png' | 'webp' })
          }
        >
          <option value="jpeg">JPEG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
        </select>
      </label>
    </div>
  )
}
