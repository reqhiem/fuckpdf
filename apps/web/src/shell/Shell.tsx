import { ThemeToggle } from '@fuckpdf/ui'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'

/** Tailwind reads `.dark`, HeroUI reads `data-theme`. Both, or half the UI flips. */
const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function Shell() {
  const { t } = useTranslation()
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const enabled = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    setDark(enabled)
    applyTheme(enabled)
  }, [])
  const toggle = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    applyTheme(next)
  }
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Not sticky: a sticky bar would end up over a tool's option fields. */}
      <header className="hairline border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link aria-label={t('nav.home')} className="text-xl font-bold tracking-[-0.04em]" to="/">
            <span>{t('brand.fuck')}</span>
            <span className="text-accent">{t('brand.pdf')}</span>
          </Link>
          <ThemeToggle dark={dark} label={t('theme.toggle')} onToggle={toggle} />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="hairline mt-20 border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-2 text-sm leading-6 text-muted">
            <p>{t('footer.privacy')}</p>
            <p>{t('footer.source')}</p>
          </div>
          <nav
            aria-label={t('footer.nav')}
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium"
          >
            <Link className="transition-colors hover:text-accent" to="/privacy">
              {t('nav.privacy')}
            </Link>
            <Link className="transition-colors hover:text-accent" to="/about">
              {t('nav.about')}
            </Link>
            <Link className="transition-colors hover:text-accent" to="/licenses">
              {t('nav.licenses')}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
