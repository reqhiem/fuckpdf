import type { WatermarkOptions } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function WatermarkOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as WatermarkOptions

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.watermark.type')}
        </span>
        <select
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.type ?? 'text'}
          onChange={(e) => onChange({ ...options, type: e.target.value as 'text' | 'image' })}
        >
          <option value="text">{t('options.watermark.typeText')}</option>
          <option value="image">{t('options.watermark.typeImage')}</option>
        </select>
      </label>

      {options.type === 'text' ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink dark:text-paper">
            {t('options.watermark.text')}
          </span>
          <input
            className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
            type="text"
            value={options.text ?? ''}
            onChange={(e) => onChange({ ...options, text: e.target.value })}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink dark:text-paper">
            {t('options.watermark.image')}
          </span>
          <input
            className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
            type="file"
            accept="image/png, image/jpeg"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) {
                const buffer = await file.arrayBuffer()
                onChange({ ...options, imageBytes: new Uint8Array(buffer), imageMime: file.type })
              }
            }}
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.watermark.mode')}
        </span>
        <select
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.mode ?? 'positioned'}
          onChange={(e) => onChange({ ...options, mode: e.target.value as 'positioned' | 'tiled' })}
        >
          <option value="positioned">{t('options.watermark.modePositioned')}</option>
          <option value="tiled">{t('options.watermark.modeTiled')}</option>
        </select>
      </label>

      {options.mode === 'positioned' && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink dark:text-paper">
            {t('options.watermark.position')}
          </span>
          <select
            className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
            value={options.position ?? 'center'}
            onChange={(e) =>
              onChange({
                ...options,
                position: e.target.value as
                  | 'center'
                  | 'top-left'
                  | 'top-right'
                  | 'bottom-left'
                  | 'bottom-right',
              })
            }
          >
            <option value="center">Center</option>
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.watermark.opacity')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={options.opacity ?? 0.5}
          onChange={(e) => onChange({ ...options, opacity: Number(e.target.value) })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.watermark.rotation')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="number"
          value={options.rotation ?? 45}
          onChange={(e) => onChange({ ...options, rotation: Number(e.target.value) })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.watermark.layer')}
        </span>
        <select
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          value={options.layer ?? 'over'}
          onChange={(e) => onChange({ ...options, layer: e.target.value as 'over' | 'under' })}
        >
          <option value="over">{t('options.watermark.layerOver')}</option>
          <option value="under">{t('options.watermark.layerUnder')}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink dark:text-paper">
          {t('options.watermark.pages')}
        </span>
        <input
          className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
          type="text"
          value={options.pages ?? ''}
          onChange={(e) => onChange({ ...options, pages: e.target.value })}
        />
      </label>

      {options.type === 'text' && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink dark:text-paper">
              {t('options.watermark.color')}
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
              {t('options.watermark.size')}
            </span>
            <input
              className="w-full rounded-md border border-ink/20 bg-transparent p-2 text-sm focus:outline-2 focus:outline-accent dark:border-paper/20"
              type="number"
              min={1}
              value={options.size ?? 48}
              onChange={(e) => onChange({ ...options, size: Number(e.target.value) })}
            />
          </label>
        </>
      )}
    </div>
  )
}
