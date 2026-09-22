import { useTranslation } from 'react-i18next'

type Page = 'privacy' | 'about' | 'licenses'

const sections: Record<Page, string[]> = {
  about: ['why', 'how', 'scope'],
  licenses: ['app', 'engines', 'fonts'],
  privacy: ['what', 'verify', 'offline', 'stored'],
}

export function StaticPage({ page }: { page: Page }) {
  const { t } = useTranslation()
  return (
    <article className="mx-auto max-w-6xl px-6 py-16">
      <div className="max-w-[68ch]">
        <h1 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">{t(`${page}.title`)}</h1>
        <p className="mt-6 text-lg leading-8">{t(`${page}.lead`)}</p>
        <div className="mt-12 space-y-10">
          {sections[page].map((key) => (
            <section className="hairline border-t pt-8" key={key}>
              <h2 className="text-xl font-semibold tracking-tight">
                {t(`${page}.sections.${key}.title`)}
              </h2>
              <p className="mt-3 leading-7 text-muted">{t(`${page}.sections.${key}.body`)}</p>
            </section>
          ))}
        </div>
      </div>
    </article>
  )
}
