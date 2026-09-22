import type { ToolId } from '@fuckpdf/tools'
import { Card, Chip, cx } from '@fuckpdf/ui'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { icons } from './icons'

/**
 * One card is one link with one accessible name, so nothing with a landmark role goes inside
 * the <Link>, because a landmark is skipped when the browser computes a link's name, and that
 * shipped broken here once.
 *
 * `lead` is the half-width treatment for the tools people actually arrive for.
 */
export function ToolCard({ id, lead = false }: { id: ToolId; lead?: boolean }) {
  const { t } = useTranslation()
  const Icon = icons[id]
  const rating = t(`tools.${id}.rating`, { defaultValue: '' })
  const heading = (
    <Card.Header className="flex-row flex-wrap items-center gap-2">
      {lead ? null : (
        <Icon
          aria-hidden="true"
          className="text-muted transition-colors group-hover:text-accent"
          size={16}
        />
      )}
      <Card.Title className={lead ? 'text-base' : 'text-sm'}>{t(`tools.${id}.name`)}</Card.Title>
      {rating ? (
        <Chip color="accent" size="sm" variant="soft">
          {rating}
        </Chip>
      ) : null}
    </Card.Header>
  )
  const description = (
    <Card.Description className="leading-6 text-muted">
      {t(`tools.${id}.description`)}
    </Card.Description>
  )
  return (
    <Link
      className={cx(
        'group block rounded-[var(--radius)]',
        lead ? 'lg:col-span-3' : 'lg:col-span-2',
      )}
      to={`/${id}`}
    >
      <Card
        className={cx(
          'h-full rounded-[var(--radius)] border border-[var(--border)] transition duration-200 ease-[var(--ease-reveal)] group-hover:-translate-y-0.5 group-hover:border-accent/50',
          lead ? 'p-6' : 'gap-2 p-5',
        )}
      >
        {lead ? (
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-[calc(var(--radius)-0.25rem)] bg-accent/12 text-accent"
            >
              <Icon size={20} />
            </span>
            <div className="min-w-0 flex-1">
              {heading}
              <div className="mt-1.5">{description}</div>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="mt-2.5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
              size={16}
            />
          </div>
        ) : (
          <>
            {heading}
            {description}
          </>
        )}
      </Card>
    </Link>
  )
}
