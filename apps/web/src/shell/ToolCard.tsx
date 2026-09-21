import type { ToolId } from '@fuckpdf/tools'
import { Badge, Card } from '@fuckpdf/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { icons } from './icons'

export function ToolCard({ id }: { id: ToolId }) {
  const { t } = useTranslation()
  const Icon = icons[id]
  const rating = t(`tools.${id}.rating`, { defaultValue: '' })
  return (
    <Link className="group" to={`/${id}`}>
      <Card className="h-full p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-accent/40">
        <Icon
          aria-hidden="true"
          className="mb-8 text-muted transition-colors group-hover:text-accent"
          size={20}
        />
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{t(`tools.${id}.name`)}</h3>
          {rating ? <Badge tone="accent">{rating}</Badge> : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted">{t(`tools.${id}.description`)}</p>
      </Card>
    </Link>
  )
}
