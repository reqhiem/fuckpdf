import { Button, cx } from '@fuckpdf/ui'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { groups } from './groups'

export const converters = groups.flatMap((g) =>
  g.name === 'convert' ? [...g.half, ...g.third] : [],
)
export const navItem =
  'inline-flex h-9 items-center gap-1 rounded-3xl px-3 text-sm font-medium no-underline transition-colors hover:bg-default hover:no-underline'

export function ConvertTrigger({ active }: { active: boolean }) {
  const { t } = useTranslation()
  return (
    <Button
      className={cx(navItem, active ? 'bg-default text-accent' : 'text-foreground')}
      variant="ghost"
    >
      {t('groups.convert')}
      <ChevronDown aria-hidden="true" size={14} />
    </Button>
  )
}
