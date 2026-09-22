import type { ToolId } from '@fuckpdf/tools'
import { Button, SearchField } from '@fuckpdf/ui'
import { ArrowRight, Cpu, Network, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { groups, toolCount } from './groups'
import { ToolCard } from './ToolCard'

const proof = [
  { icon: Cpu, key: 'engine' },
  { icon: Network, key: 'network' },
  { icon: WifiOff, key: 'offline' },
]

export function Landing() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const matches = (id: ToolId) =>
    !needle ||
    `${t(`tools.${id}.name`)} ${t(`tools.${id}.description`)}`.toLowerCase().includes(needle)
  const found = groups.map((group) => ({
    name: group.name,
    half: group.half.filter(matches),
    third: group.third.filter(matches),
  }))
  const nothing = found.every((group) => !group.half.length && !group.third.length)
  const facts = [
    { label: t('landing.facts.tools'), value: String(toolCount) },
    { label: t('landing.facts.uploaded'), value: '0' },
    { label: t('landing.facts.requests'), value: '0' },
  ]
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="hero-grid grid-fade pointer-events-none absolute inset-0 -z-10"
        />
        <div className="mx-auto max-w-7xl px-6 pt-14 pb-16 sm:pt-20">
          <p className="text-sm font-medium text-muted">{t('landing.kicker')}</p>
          <h1 className="mt-4 text-[clamp(3.25rem,12vw,6rem)] font-bold leading-[0.85] tracking-[-0.04em]">
            <span>{t('brand.fuck')}</span>
            <span className="text-accent">{t('brand.pdf')}</span>
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 sm:text-2xl">{t('landing.dek')}</p>
          <p className="mt-4 max-w-2xl leading-7 text-muted">{t('landing.mechanism')}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              onPress={() => document.getElementById('tools')?.scrollIntoView({ block: 'start' })}
              size="lg"
            >
              {t('landing.primary')}
            </Button>
            <Link
              className="hairline inline-flex h-11 items-center gap-1.5 rounded-3xl border px-4 font-medium transition-colors hover:border-accent/60 md:h-10"
              to="/privacy"
            >
              {t('landing.secondary')}
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <ul className="hairline mt-12 flex flex-wrap gap-x-10 gap-y-4 border-t pt-6">
            {facts.map((fact) => (
              <li className="flex items-baseline gap-2" key={fact.label}>
                <span className="measure text-2xl font-medium">{fact.value}</span>
                <span className="text-sm text-muted">{fact.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="proof-title" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="surface p-6 sm:p-8">
          <h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl" id="proof-title">
            {t('proof.title')}
          </h2>
          <p className="mt-3 max-w-[68ch] leading-7 text-muted">{t('proof.lead')}</p>
          <ul className="mt-8">
            {proof.map(({ icon: Icon, key }) => (
              <li className="hairline flex gap-4 border-t py-5 last:pb-0" key={key}>
                <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-accent" size={18} />
                <div className="sm:flex sm:gap-8">
                  <h3 className="font-semibold sm:w-52 sm:shrink-0">{t(`proof.${key}.title`)}</h3>
                  <p className="mt-1.5 max-w-[68ch] leading-7 text-muted sm:mt-0">
                    {t(`proof.${key}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10" id="tools">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">{t('landing.toolsHint')}</p>
          <SearchField
            aria-label={t('landing.search')}
            className="w-full sm:w-72"
            onChange={setQuery}
            value={query}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('landing.searchPlaceholder')} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
        {nothing ? (
          <div className="hairline border-t py-16 text-center">
            <p className="text-lg font-semibold">{t('landing.empty', { query: query.trim() })}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              {t('landing.emptyHint')}
            </p>
          </div>
        ) : (
          found.map((group) =>
            group.half.length || group.third.length ? (
              <section className="mb-14 last:mb-0" key={group.name}>
                <h2 className="hairline mb-5 border-b pb-3 text-xl font-bold tracking-tight">
                  {t(`groups.${group.name}`)}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                  {group.half.map((id) => (
                    <ToolCard id={id} key={id} lead />
                  ))}
                  {group.third.map((id) => (
                    <ToolCard id={id} key={id} />
                  ))}
                </div>
              </section>
            ) : null,
          )
        )}
      </section>
    </>
  )
}
