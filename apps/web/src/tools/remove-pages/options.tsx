import { useTranslation } from 'react-i18next'

// The grid selection is the input; ToolPage overwrites `pages` with it on run.
export default function RemovePagesOptionsPanel() {
  const { t } = useTranslation()
  return <p className="text-sm text-muted">{t('options.pickHint')}</p>
}
