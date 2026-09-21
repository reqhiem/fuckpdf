import { ThemeToggle } from '@fuckpdf/ui'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'

export function Shell() {
  const { t } = useTranslation()
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const enabled = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    setDark(enabled)
    document.documentElement.classList.toggle('dark', enabled)
  }, [])
  const toggle = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link aria-label={t('nav.home')} className="text-xl font-bold tracking-tighter" to="/">
          <span>{t('brand.fuck')}</span>
          <span className="text-accent">{t('brand.pdf')}</span>
        </Link>
        <ThemeToggle dark={dark} label={t('theme.toggle')} onToggle={toggle} />
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mx-auto mt-16 max-w-6xl border-t border-ink/10 px-6 py-8 text-sm text-muted dark:border-paper/10">
        <p>{t('footer.privacy')}</p>
        <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/privacy">{t('nav.privacy')}</Link>
          <Link to="/about">{t('nav.about')}</Link>
          <Link to="/licenses">{t('nav.licenses')}</Link>
        </nav>
      </footer>
    </div>
  )
}
