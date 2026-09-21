import type { PageNumbersOptions, PositionAnchor } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

const POSITIONS: PositionAnchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

export default function PageNumbersOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as PageNumbersOptions

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.page-numbers.position')}
        </span>
        <div
          aria-label={t('options.page-numbers.position')}
          className="grid grid-cols-3 gap-2 w-32"
          role="group"
        >
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              // The dot inside is decorative, so the name has to come from the label.
              aria-label={t(`options.page-numbers.anchors.${pos}`)}
              aria-pressed={options.position === pos}
              className={`flex h-10 w-10 items-center justify-center rounded-md border focus:outline-2 focus:outline-accent ${options.position === pos ? 'border-accent bg-accent/10' : 'border-ink/20 dark:border-paper/20'}`}
              onClick={() => onChange({ ...options, position: pos })}
            >
              <div
                aria-hidden="true"
                className={`h-2 w-2 bg-current ${pos.includes('left') ? 'mr-auto ml-1' : pos.includes('right') ? 'ml-auto mr-1' : ''} ${pos.includes('top') ? 'mb-auto mt-1' : pos.includes('bottom') ? 'mt-auto mb-1' : ''}`}
              />
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.page-numbers.firstNumber')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="number"
          value={options.firstNumber ?? 1}
          onChange={(e) => onChange({ ...options, firstNumber: Number(e.target.value) })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.page-numbers.pages')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="text"
          value={options.pages ?? ''}
          onChange={(e) => onChange({ ...options, pages: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.page-numbers.format')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="text"
          value={options.format ?? '{n}'}
          onChange={(e) => onChange({ ...options, format: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.page-numbers.font')}
        </span>
        <select
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.font ?? 'Helvetica'}
          onChange={(e) =>
            onChange({ ...options, font: e.target.value as 'Helvetica' | 'Times-Roman' })
          }
        >
          <option value="Helvetica">Helvetica</option>
          <option value="Times-Roman">Times Roman</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.page-numbers.size')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="number"
          min={1}
          value={options.size ?? 12}
          onChange={(e) => onChange({ ...options, size: Number(e.target.value) })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.page-numbers.color')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="text"
          value={options.color ?? '000000'}
          onChange={(e) => onChange({ ...options, color: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.page-numbers.margin')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="number"
          min={0}
          value={options.margin ?? 20}
          onChange={(e) => onChange({ ...options, margin: Number(e.target.value) })}
        />
      </label>
    </div>
  )
}
