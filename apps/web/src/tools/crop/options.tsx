import type { CropOptions } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function CropOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as CropOptions
  const box = options.box || { x: 0, y: 0, width: 100, height: 100 }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink dark:text-paper">
            {t('options.crop.boxX')}
          </span>
          <input
            className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
            type="number"
            value={box.x}
            onChange={(e) => onChange({ ...options, box: { ...box, x: Number(e.target.value) } })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink dark:text-paper">
            {t('options.crop.boxY')}
          </span>
          <input
            className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
            type="number"
            value={box.y}
            onChange={(e) => onChange({ ...options, box: { ...box, y: Number(e.target.value) } })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink dark:text-paper">
            {t('options.crop.boxWidth')}
          </span>
          <input
            className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
            type="number"
            min={1}
            value={box.width}
            onChange={(e) =>
              onChange({ ...options, box: { ...box, width: Number(e.target.value) } })
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink dark:text-paper">
            {t('options.crop.boxHeight')}
          </span>
          <input
            className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
            type="number"
            min={1}
            value={box.height}
            onChange={(e) =>
              onChange({ ...options, box: { ...box, height: Number(e.target.value) } })
            }
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.crop.pages')}
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
          checked={options.flatten ?? false}
          onChange={(e) => onChange({ ...options, flatten: e.target.checked })}
        />
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.crop.flatten')}
        </span>
      </label>
    </div>
  )
}
