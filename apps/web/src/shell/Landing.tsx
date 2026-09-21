import type { ToolId } from '@fuckpdf/tools'
import { Button } from '@fuckpdf/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { groups } from './groups'
import { ToolCard } from './ToolCard'

export function Landing() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const visible = (ids: ToolId[]) =>
    ids.filter((id) => t(`tools.${id}.name`).toLowerCase().includes(query.toLowerCase()))
  return (
    <>
      <section className="hero-grid border-y border-ink/10 py-20 dark:border-paper/10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-5 text-sm font-medium tracking-wide text-muted">{t('landing.kicker')}</p>
          <h1 className="max-w-3xl text-6xl font-bold leading-[0.88] tracking-tighter sm:text-8xl">
            <span>{t('brand.fuck')}</span>
            <span className="text-accent">{t('brand.pdf')}</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted">{t('landing.dek')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={() =>
                document.getElementById('tool-grid')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              {t('landing.primary')}
            </Button>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-ink/15 px-4 font-medium dark:border-paper/20"
              to="/privacy"
            >
              {t('landing.secondary')}
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16" id="tool-grid">
        <label className="sr-only" htmlFor="tool-search">
          {t('landing.search')}
        </label>
        <input
          className="mb-12 w-full rounded-xl border border-ink/15 bg-transparent px-4 py-3 text-ink placeholder:text-muted dark:border-paper/20 dark:text-paper"
          id="tool-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('landing.search')}
          type="search"
          value={query}
        />
        {groups.map((group) => {
          const tools = visible(group.tools)
          return tools.length ? (
            <section className="mb-12" key={group.name}>
              <h2 className="mb-5 text-xl font-bold">{t(`groups.${group.name}`)}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((id) => (
                  <ToolCard id={id} key={id} />
                ))}
              </div>
            </section>
          ) : null
        })}
      </section>
    </>
  )
}
