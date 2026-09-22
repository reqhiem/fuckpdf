import {
  Button,
  cx,
  Dropdown,
  Link as ExternalLink,
  Hint,
  Label,
  RouterProvider,
  ThemeToggle,
} from '@fuckpdf/ui'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, Outlet, useHref, useLocation, useNavigate } from 'react-router'
import { groups } from './groups'
import { icons } from './icons'

const repo = 'https://github.com/reqhiem/fuckpdf'
const primary = ['edit', 'merge', 'split', 'organize'] as const
const converters = groups.flatMap((g) => (g.name === 'convert' ? [...g.half, ...g.third] : []))
const navItem =
  'inline-flex h-9 items-center gap-1 rounded-3xl px-3 text-sm font-medium no-underline transition-colors hover:bg-default hover:no-underline'

const useRouterHref = (href: string) => {
  const resolved = useHref(href)
  return /^[a-z]+:/i.test(href) ? href : resolved
}

function PrimaryNav() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const current = pathname.slice(1)
  return (
    <nav aria-label={t('nav.primary')} className="hidden items-center gap-1 md:flex">
      {primary.map((id) => (
        <ExternalLink
          aria-current={current === id ? 'page' : undefined}
          className={cx(navItem, current === id ? 'bg-default text-accent' : 'text-foreground')}
          href={`/${id}`}
          key={id}
        >
          {t(`nav.${id}`)}
        </ExternalLink>
      ))}
      <Dropdown>
        <Button
          className={cx(
            navItem,
            converters.some((id) => id === current) ? 'bg-default text-accent' : 'text-foreground',
          )}
          variant="ghost"
        >
          {t('groups.convert')}
          <ChevronDown aria-hidden="true" size={14} />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu>
            {converters.map((id) => {
              const Icon = icons[id]
              return (
                <Dropdown.Item
                  aria-current={current === id ? 'page' : undefined}
                  href={`/${id}`}
                  id={id}
                  key={id}
                  textValue={t(`tools.${id}.name`)}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" />
                  <Label className={cx(current === id && 'text-accent')}>
                    {t(`tools.${id}.name`)}
                  </Label>
                </Dropdown.Item>
              )
            })}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </nav>
  )
}

/** Tailwind reads `.dark`, HeroUI reads `data-theme`. Both, or half the UI flips. */
const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function Shell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
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
    <RouterProvider navigate={navigate} useHref={useRouterHref}>
      <div className="flex min-h-dvh flex-col">
        <header className="hairline border-b">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:grid md:grid-cols-[1fr_auto_1fr]">
            <Link
              aria-label={t('nav.home')}
              className="text-xl font-bold tracking-[-0.04em]"
              to="/"
            >
              <span>{t('brand.fuck')}</span>
              <span className="text-accent">{t('brand.pdf')}</span>
            </Link>
            <PrimaryNav />
            <div className="flex items-center justify-end gap-1">
              <Hint label={t('nav.source')}>
                <ExternalLink
                  aria-label={t('nav.source')}
                  className="inline-flex size-9 items-center justify-center rounded-3xl text-foreground no-underline transition-colors hover:bg-default"
                  href={repo}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <svg
                    aria-hidden="true"
                    fill="currentColor"
                    height="18"
                    viewBox="0 0 16 16"
                    width="18"
                  >
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                  </svg>
                </ExternalLink>
              </Hint>
              <ThemeToggle dark={dark} label={t('theme.toggle')} onToggle={toggle} />
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="hairline mt-20 border-t">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md space-y-2 text-sm leading-6 text-muted">
              <p>{t('footer.privacy')}</p>
              <p>
                <Trans
                  components={[
                    // biome-ignore lint/a11y/useAnchorContent: Trans injects the text
                    <a
                      className="underline underline-offset-4 transition-colors hover:text-accent"
                      href={repo}
                      key="repo"
                      rel="noopener noreferrer"
                      target="_blank"
                    />,
                  ]}
                  i18nKey="footer.source"
                />
              </p>
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
    </RouterProvider>
  )
}
