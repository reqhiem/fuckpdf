import { useTranslation } from 'react-i18next'

export function StaticPage({ page }: { page: 'privacy' | 'about' | 'licenses' }) {
  const { t } = useTranslation()
  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">{t(`${page}.title`)}</h1>
      <p className="mt-6 leading-8 text-muted">{t(`${page}.body`)}</p>
    </article>
  )
}
