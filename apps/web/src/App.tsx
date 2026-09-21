import {
  loadTool,
  type Output,
  type PdfInput,
  TOOL_IDS,
  type ToolId,
  type ToolModule,
} from '@fuckpdf/tools'
import { Badge, Button, Card, Dropzone, Progress, Surface, ThemeToggle } from '@fuckpdf/ui'
import { zipSync } from 'fflate'
import {
  FileDown,
  FilePlus2,
  Image,
  Maximize2,
  Minimize2,
  Scissors,
  Stamp,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createBrowserRouter, Link, Outlet, useParams } from 'react-router'
import { RouterProvider } from 'react-router/dom'

const icons: Record<ToolId, typeof FilePlus2> = {
  merge: FilePlus2,
  split: Scissors,
  'remove-pages': Minimize2,
  'extract-pages': Maximize2,
  organize: Wrench,
  rotate: Wrench,
  'page-numbers': Stamp,
  watermark: Stamp,
  crop: Scissors,
  'jpg-to-pdf': Image,
  'pdf-to-jpg': FileDown,
}
const groups: Array<{ name: string; tools: ToolId[] }> = [
  { name: 'organize', tools: ['merge', 'split', 'remove-pages', 'extract-pages', 'organize'] },
  { name: 'edit', tools: ['rotate', 'page-numbers', 'watermark', 'crop'] },
  { name: 'convert', tools: ['jpg-to-pdf', 'pdf-to-jpg'] },
]
const formatBytes = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(bytes >= 104857600 ? 0 : 1)} MB`

function Shell() {
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
function Landing() {
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
function ToolCard({ id }: { id: ToolId }) {
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
function ToolPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const toolId = TOOL_IDS.find((item) => item === id)
  const [files, setFiles] = useState<File[]>([])
  const [module, setModule] = useState<ToolModule | null>(null)
  const [warning, setWarning] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  const [error, setError] = useState<{ message: string; detail: string } | null>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => {
    if (toolId) void loadTool[toolId]().then(setModule)
  }, [toolId])
  const total = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files])
  if (!toolId) return <Landing />
  const select = (next: File[]) => {
    const all = [...files, ...next].slice(0, module?.inputs.max ?? Number.MAX_SAFE_INTEGER)
    const bytes = all.reduce((sum, file) => sum + file.size, 0)
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    if (bytes > 524288000 || (memory !== undefined && memory <= 2 && bytes > 104857600)) {
      setWarning(t('tool.limitHard'))
      return
    }
    setFiles(all)
    setWarning(bytes > 104857600 ? t('tool.limitSoft') : '')
  }
  const run = async () => {
    if (!module || !files.length) return
    controller.current = new AbortController()
    setError(null)
    setOutputs([])
    setProgress(0)
    try {
      const inputs: PdfInput[] = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        })),
      )
      setOutputs(
        await module.run(inputs, module.defaultOptions, {
          signal: controller.current.signal,
          onProgress: ({ value }) => setProgress(value),
        }),
      )
      setProgress(1)
    } catch (caught) {
      const issue = caught instanceof Error ? caught : new Error(String(caught))
      setError({ message: issue.message, detail: issue.stack || issue.name })
      setProgress(null)
    } finally {
      controller.current = null
    }
  }
  const download = () => {
    if (!outputs.length) return
    const single = outputs[0]
    if (!single) return
    const blob =
      outputs.length === 1
        ? new Blob([single.bytes.buffer as ArrayBuffer], { type: single.mime })
        : new Blob(
            [zipSync(Object.fromEntries(outputs.map((output) => [output.name, output.bytes])))],
            { type: 'application/zip' },
          )
    const name = outputs.length === 1 ? single.name : `fuckpdf-${toolId}-${Date.now()}.zip`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link className="text-sm text-muted" to="/">
        {t('tool.back')}
      </Link>
      <h1 className="mt-5 text-4xl font-bold tracking-tight">{t(`tools.${toolId}.name`)}</h1>
      <p className="mt-3 max-w-xl text-muted">{t(`tools.${toolId}.description`)}</p>
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <Dropzone
            accept={module?.accept ?? ['application/pdf']}
            label={
              <>
                <p className="font-semibold">{t('tool.drop')}</p>
                <p className="mt-2 text-sm text-muted">{t('tool.dropHint')}</p>
              </>
            }
            multiple={(module?.inputs.max ?? 1) > 1}
            onFiles={select}
          />
          {warning ? <p className="mt-3 text-sm text-danger">{warning}</p> : null}
          {files.length ? (
            <Surface className="mt-5 divide-y divide-ink/10 p-4 dark:divide-paper/10">
              {files.map((file) => (
                <div
                  className="flex items-center justify-between py-3"
                  key={`${file.name}-${file.lastModified}`}
                >
                  <span>{file.name}</span>
                  <span className="font-mono text-xs text-muted">{formatBytes(file.size)}</span>
                </div>
              ))}
            </Surface>
          ) : null}
        </div>
        <aside className="space-y-5">
          <Surface className="p-5">
            <h2 className="font-semibold">{t('tool.options')}</h2>
            <ToolOptions id={toolId} />
          </Surface>
          {progress !== null ? <Progress label={t('tool.progress')} value={progress} /> : null}
          <Button
            className="sticky bottom-4 w-full"
            disabled={!files.length || !module}
            onClick={() => void run()}
          >
            {t('tool.run')}
          </Button>
          {progress !== null && progress < 1 ? (
            <Button className="w-full" onClick={() => controller.current?.abort()} variant="ghost">
              {t('tool.cancel')}
            </Button>
          ) : null}
        </aside>
      </div>
      {error ? (
        <Surface className="mt-8 p-6">
          <p>{error.message}</p>
          <code className="mt-3 block overflow-auto font-mono text-xs text-muted">
            {error.detail}
          </code>
        </Surface>
      ) : null}
      {outputs.length ? (
        <Surface className="mt-8 p-6">
          <h2 className="text-xl font-bold">{t('tool.results')}</h2>
          <p className="mt-2 text-muted">{t('tool.resultReady')}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={download}>{t('tool.download')}</Button>
            <Button
              onClick={() => {
                setFiles([])
                setProgress(null)
              }}
              variant="ghost"
            >
              {t('tool.startOver')}
            </Button>
          </div>
          <p className="mt-4 font-mono text-xs text-muted">
            {t('tool.beforeAfter', {
              before: formatBytes(total),
              after: formatBytes(outputs.reduce((sum, output) => sum + output.bytes.byteLength, 0)),
            })}
          </p>
        </Surface>
      ) : null}
    </div>
  )
}
function ToolOptions({ id }: { id: ToolId }) {
  const { t } = useTranslation()
  if (id === 'split')
    return (
      <label className="mt-4 block text-sm">
        <span>{t('options.splitMode')}</span>
        <select className="mt-2 w-full rounded-lg border border-ink/15 bg-transparent p-2 dark:border-paper/20">
          <option>{t('options.ranges')}</option>
          <option>{t('options.every')}</option>
        </select>
      </label>
    )
  return <p className="mt-3 text-sm text-muted">{t('options.default')}</p>
}
function StaticPage({ page }: { page: 'privacy' | 'about' | 'licenses' }) {
  const { t } = useTranslation()
  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">{t(`${page}.title`)}</h1>
      <p className="mt-6 leading-8 text-muted">{t(`${page}.body`)}</p>
    </article>
  )
}
const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <Landing /> },
      ...TOOL_IDS.map((id) => ({
        path: id,
        lazy: async () => ({ Component: ToolPage }),
      })),
      { path: 'privacy', element: <StaticPage page="privacy" /> },
      { path: 'about', element: <StaticPage page="about" /> },
      { path: 'licenses', element: <StaticPage page="licenses" /> },
    ],
  },
])
export function App() {
  return <RouterProvider router={router} />
}
