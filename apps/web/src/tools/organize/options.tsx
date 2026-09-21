import type { OrganizeOptions } from '@fuckpdf/tools'
import { useTranslation } from 'react-i18next'
import type { OptionsPanelProps } from '../../tool/options-panel'

export default function OrganizeOptionsPanel({ value, onChange }: OptionsPanelProps) {
  const { t } = useTranslation()
  const options = value as OrganizeOptions

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        onClick={() =>
          onChange({ ...options, operations: [...(options.operations || []), { type: 'blank' }] })
        }
      >
        {t('options.organize.addBlank')}
      </button>
    </div>
  )
}
