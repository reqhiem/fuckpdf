import {
  type EditElement,
  loadTool,
  type Output,
  type PdfInput,
  type Progress,
  TOOL_IDS,
  type ToolId,
  type ToolModule,
} from '@fuckpdf/tools'
import {
  Alert,
  Breadcrumbs,
  Button,
  Description,
  Disclosure,
  Dropzone,
  Input,
  Label,
  ProgressBar,
  Skeleton,
  TextField,
} from '@fuckpdf/ui'
import { zipSync } from 'fflate'
import { Check, ChevronRight, Copy } from 'lucide-react'
import { lazy, type ReactNode, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { FileStrip } from '../components/file-strip'
import { LivePreview } from '../components/live-preview'
import { PageGrid, type PageGridCrop, type PageRef } from '../components/page-grid'
import { formatBytes, formatTypes } from '../lib/format'
import { groups } from '../shell/groups'
import { Landing } from '../shell/Landing'
import { Seo } from '../shell/Seo'
import { encode, engine } from '../workers/engine'
import { optionsPanels } from './options-panel'
import {
  GRID_ONLY_TOOLS,
  GRID_TOOLS,
  PREVIEW_TOOLS,
  REORDERABLE_TOOLS,
  toOrganizeOperations,
  toPageRangeString,
} from './page-selection'

const PdfEditor = lazy(() => import('../components/pdf-editor'))

const SOFT_LIMIT = 100 * 1024 * 1024
const HARD_LIMIT = 500 * 1024 * 1024

const STAGES = new Set(['load', 'file', 'page', 'image', 'done'])

type RunError = { message: string; detail: string }

export function ToolPage() {
  // The routes are literal slugs, so the tool is the path itself.
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  const toolId = TOOL_IDS.find((item): item is ToolId => item === slug)

  const [module, setModule] = useState<ToolModule | null>(null)
  const [options, setOptions] = useState<Record<string, unknown>>({})
  const [files, setFiles] = useState<File[]>([])
  const [warning, setWarning] = useState('')
  const [progress, setProgress] = useState<Progress | null>(null)
  const [running, setRunning] = useState(false)
  const [outputs, setOutputs] = useState<Output[]>([])
  const [error, setError] = useState<RunError | null>(null)
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null)
  const [passwordFile, setPasswordFile] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [gridBytes, setGridBytes] = useState<Uint8Array | null>(null)
  const [pages, setPages] = useState<PageRef[]>([])
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [crop, setCrop] = useState<PageGridCrop | null>(null)
  const [elements, setElements] = useState<EditElement[]>([])
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!toolId) return
    let live = true
    void loadTool[toolId]().then((loaded) => {
      if (!live) return
      setModule(loaded)
      setOptions({ ...loaded.defaultOptions })
    })
    return () => {
      live = false
    }
  }, [toolId])

  const gridCapabilities = toolId ? GRID_TOOLS[toolId] : undefined
  const needsBytes = !!gridCapabilities || toolId === 'edit'

  useEffect(() => {
    const first = files[0]
    if (!needsBytes || !first) {
      setGridBytes(null)
      setPages([])
      return
    }
    let live = true
    void first.arrayBuffer().then(async (buffer) => {
      if (!live) return
      const bytes = new Uint8Array(buffer)
      setGridBytes(bytes)
      if (!gridCapabilities) return
      const doc = await engine.open(bytes)
      try {
        setPages(
          Array.from({ length: doc.pageCount }, (_, index) => ({
            id: `p${index}`,
            number: index + 1,
            rotation: 0,
            sourceIndex: index,
          })),
        )
      } finally {
        doc.close()
      }
    })
    return () => {
      live = false
    }
  }, [files, gridCapabilities, needsBytes])

  // A result that no longer matches the inputs on screen is how someone downloads the wrong file.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the dependencies are the trigger, not inputs to the body
  useEffect(() => setOutputs([]), [files, options, pages, selected, crop, elements])

  const totalIn = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files])
  const totalOut = useMemo(
    () => outputs.reduce((sum, output) => sum + output.bytes.byteLength, 0),
    [outputs],
  )

  if (!toolId) return <Landing />

  const OptionsPanel = optionsPanels[toolId]
  const maxFiles = module?.inputs.max ?? 1

  const select = (next: File[]) => {
    const all = [...files, ...next].slice(0, maxFiles)
    const bytes = all.reduce((sum, file) => sum + file.size, 0)
    // deviceMemory is Chromium-only; absent means assume it is fine, not block.
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    if (bytes > HARD_LIMIT || (memory !== undefined && memory <= 2 && bytes > SOFT_LIMIT)) {
      setWarning(t('tool.limitHard'))
      return
    }
    setFiles(all)
    setWarning(bytes > SOFT_LIMIT ? t('tool.limitSoft') : '')
  }

  const run = async (retryPassword?: string) => {
    if (!module || !files.length) return
    const abort = new AbortController()
    controller.current = abort
    setError(null)
    setOutputs([])
    setRunning(true)
    setProgress({ value: 0 })
    try {
      const inputs: PdfInput[] = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
          ...(retryPassword ? { password: retryPassword } : {}),
        })),
      )
      const produced = await module.run(
        inputs,
        { ...options, ...gridOptions(), engine, encode },
        {
          signal: abort.signal,
          onProgress: setProgress,
        },
      )
      setOutputs(produced)
      setProgress({ value: 1, stage: 'done' })
      setPasswordFile(null)
    } catch (caught) {
      const issue = caught instanceof Error ? caught : new Error(String(caught))
      if (issue.name === 'PasswordRequiredError') {
        const named =
          'fileName' in issue && typeof issue.fileName === 'string' ? issue.fileName : ''
        setPasswordFile(named || files[0]?.name || '')
        setProgress(null)
        return
      }
      const detail =
        'detail' in issue && typeof issue.detail === 'string' ? issue.detail : issue.stack
      setError({ message: issue.message, detail: detail ?? issue.name })
      setProgress(null)
    } finally {
      setRunning(false)
      controller.current = null
    }
  }

  // Grid and editor tools take their real options from the surface, not from the form.
  const gridOptions = (): Record<string, unknown> => {
    if (toolId === 'organize') return { operations: toOrganizeOperations(pages) }
    if (toolId === 'remove-pages' || toolId === 'extract-pages')
      return { pages: toPageRangeString(pages, selected) }
    if (toolId === 'crop' && selected.size) return { pages: toPageRangeString(pages, selected) }
    if (toolId === 'edit') return { elements }
    return {}
  }

  const drawCrop = (next: PageGridCrop | null) => {
    setCrop(next)
    if (!next) return
    const round = (value: number) => Math.round(value * 10) / 10
    const { x, y, width, height } = next.rect
    setOptions((current) => ({
      ...current,
      box: { x: round(x), y: round(y), width: round(width), height: round(height) },
    }))
  }

  const needsSelection = (toolId === 'remove-pages' || toolId === 'extract-pages') && !selected.size

  const download = () => {
    const single = outputs[0]
    if (!single) return
    const zipped = outputs.length > 1
    const blob = zipped
      ? new Blob([zipSync(Object.fromEntries(outputs.map((o) => [o.name, o.bytes])))], {
          type: 'application/zip',
        })
      : new Blob([single.bytes.slice().buffer], { type: single.mime })
    const name = zipped ? `fuckpdf-${toolId}-${Date.now()}.zip` : single.name
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    // Firefox aborts the download if the URL is revoked in the same task.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const startOver = () => {
    setFiles([])
    setOutputs([])
    setProgress(null)
    setPasswordFile(null)
    setPassword('')
    setError(null)
    setWarning('')
    setSelected(new Set())
    setCrop(null)
    setElements([])
  }

  const copyDetail = () => {
    if (!error) return
    void navigator.clipboard
      .writeText(error.detail)
      .then(() => {
        setCopied('done')
        setTimeout(() => setCopied(null), 2000)
      })
      .catch(() => setCopied('failed'))
  }

  const stageLabel =
    progress?.stage && STAGES.has(progress.stage)
      ? t(`toolPage.stage.${progress.stage}`)
      : t('tool.progress')

  const optionsPanel = !GRID_ONLY_TOOLS.has(toolId)
  const stripSurface = REORDERABLE_TOOLS.has(toolId)
  const done = outputs.length > 0
  const section = 'space-y-4 p-5'
  const heading = 'text-base font-semibold'

  let surface: ReactNode = null
  if (stripSurface)
    surface = (
      <div className="space-y-4">
        <FileStrip files={files} onChange={setFiles} reorderable />
        {files.length < maxFiles ? (
          <Dropzone
            accept={module?.accept ?? ['application/pdf']}
            compact
            hint={t('toolPage.addFilesHint')}
            label={t('toolPage.addFiles')}
            multiple
            onFiles={select}
          />
        ) : null}
      </div>
    )
  else if (PREVIEW_TOOLS.has(toolId) && files[0])
    surface = <LivePreview file={files[0]} module={module} options={options} />
  else if (!gridBytes)
    surface = <Skeleton className="h-96 rounded-[var(--radius)] lg:h-[calc(100dvh-11rem)]" />
  else if (gridCapabilities)
    surface = (
      <PageGrid
        bytes={gridBytes}
        capabilities={gridCapabilities}
        onChange={setPages}
        onSelectedChange={setSelected}
        pages={pages}
        selected={selected}
        {...(toolId === 'crop' ? { crop, onCropChange: drawCrop } : {})}
      />
    )
  else if (toolId === 'edit')
    surface = (
      <Suspense
        fallback={<Skeleton className="h-96 rounded-[var(--radius)] lg:h-[calc(100dvh-11rem)]" />}
      >
        <PdfEditor bytes={gridBytes} onChange={setElements} />
      </Suspense>
    )

  const groupName = groups.find((g) => [...g.half, ...g.third].includes(toolId))?.name

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Seo />
      <Breadcrumbs aria-label={t('tool.breadcrumbs')} className="-my-2 flex-wrap [&_.link]:py-2">
        <Breadcrumbs.Item href="/">{t('tool.back')}</Breadcrumbs.Item>
        {groupName ? (
          <Breadcrumbs.Item>
            {() => (
              <>
                <span className="text-sm font-medium text-muted">{t(`groups.${groupName}`)}</span>
                <ChevronRight aria-hidden="true" className="breadcrumbs__separator" />
              </>
            )}
          </Breadcrumbs.Item>
        ) : null}
        <Breadcrumbs.Item>{t(`tools.${toolId}.name`)}</Breadcrumbs.Item>
      </Breadcrumbs>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{t(`tools.${toolId}.name`)}</h1>
      <p className="mt-1 text-muted">{t(`tools.${toolId}.description`)}</p>

      {files.length ? (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">{surface}</div>

          <aside className="surface divide-y divide-[var(--separator)] lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
            {stripSurface ? null : (
              <section className="p-3">
                <FileStrip compact files={files} onChange={setFiles} />
              </section>
            )}

            {optionsPanel ? (
              <section className={section}>
                <h2 className={heading}>
                  {t(`toolPage.optionsHeading.${toolId}`, { defaultValue: t('tool.options') })}
                </h2>
                <Suspense fallback={<Skeleton className="h-24 rounded-lg" />}>
                  <OptionsPanel onChange={setOptions} value={options} />
                </Suspense>
              </section>
            ) : null}

            <section className={section}>
              {warning ? <p className="text-sm text-danger">{warning}</p> : null}
              {running ? (
                <ProgressBar value={Math.round((progress?.value ?? 0) * 100)}>
                  <Label className="text-sm text-muted">{stageLabel}</Label>
                  <ProgressBar.Output className="measure text-xs text-muted" />
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
              ) : null}
              <div className="flex gap-2">
                <Button
                  fullWidth
                  isDisabled={!module || needsSelection}
                  isPending={running}
                  onPress={() => void run()}
                  variant={done ? 'outline' : 'primary'}
                >
                  {done ? t('toolPage.runAgain') : t('tool.run')}
                </Button>
                {running ? (
                  <Button onPress={() => controller.current?.abort()} variant="ghost">
                    {t('tool.cancel')}
                  </Button>
                ) : null}
              </div>

              {passwordFile ? (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void run(password)
                  }}
                >
                  <TextField
                    autoFocus
                    fullWidth
                    onChange={setPassword}
                    type="password"
                    value={password}
                  >
                    <Label>{t('tool.password', { file: passwordFile })}</Label>
                    <Input />
                    <Description>{t('toolPage.passwordNote')}</Description>
                  </TextField>
                  <Button fullWidth type="submit">
                    {t('tool.unlock')}
                  </Button>
                </form>
              ) : null}

              {error ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{t('toolPage.errorTitle')}</Alert.Title>
                    <Alert.Description>{error.message}</Alert.Description>
                    <Disclosure className="mt-2">
                      <Disclosure.Heading>
                        <Disclosure.Trigger className="text-sm text-muted">
                          {t('toolPage.errorDetail')}
                          <Disclosure.Indicator />
                        </Disclosure.Trigger>
                      </Disclosure.Heading>
                      <Disclosure.Content>
                        <Disclosure.Body>
                          <pre className="measure max-h-48 overflow-auto rounded-lg bg-ink/5 p-3 text-xs whitespace-pre-wrap dark:bg-paper/5">
                            {error.detail}
                          </pre>
                          <Button className="mt-2" onPress={copyDetail} size="sm" variant="outline">
                            {copied === 'done' ? (
                              <Check aria-hidden="true" size={14} />
                            ) : (
                              <Copy aria-hidden="true" size={14} />
                            )}
                            {copied === 'done' ? t('toolPage.copied') : t('toolPage.copyDetail')}
                          </Button>
                          <p aria-live="polite" className="mt-1 text-xs text-muted">
                            {copied === 'failed' ? t('toolPage.copyFailed') : ''}
                          </p>
                        </Disclosure.Body>
                      </Disclosure.Content>
                    </Disclosure>
                  </Alert.Content>
                </Alert>
              ) : null}
            </section>

            {done ? (
              <section className={section}>
                <div>
                  <h2 className={heading}>{t('tool.results')}</h2>
                  <p className="text-sm text-muted">{t('tool.resultReady')}</p>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  <Measure
                    label={t('toolPage.before')}
                    value={`${t('toolPage.fileCount', { count: files.length })} · ${formatBytes(totalIn)}`}
                  />
                  <Measure
                    label={t('toolPage.after')}
                    value={`${t('toolPage.fileCount', { count: outputs.length })} · ${formatBytes(totalOut)}`}
                  />
                </dl>
                <ul
                  aria-label={t('toolPage.outputs')}
                  className="divide-y divide-[var(--separator)]"
                >
                  {outputs.map((output) => (
                    <li
                      className="flex items-center justify-between gap-3 py-1.5"
                      key={output.name}
                    >
                      <span className="truncate text-sm" title={output.name}>
                        {output.name}
                      </span>
                      <span className="measure shrink-0 text-xs text-muted">
                        {formatBytes(output.bytes.byteLength)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <Button fullWidth onPress={download}>
                    {t('tool.download')}
                  </Button>
                  <Button fullWidth onPress={startOver} variant="ghost">
                    {t('tool.startOver')}
                  </Button>
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      ) : (
        <section className="mt-6">
          <div className="hero-grid grid-fade rounded-[var(--radius)]">
            <Dropzone
              accept={module?.accept ?? ['application/pdf']}
              hint={t('tool.dropHint')}
              label={t('tool.drop')}
              multiple={maxFiles > 1}
              onFiles={select}
            />
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="surface p-5">
              <dt className="text-sm text-muted">{t('toolPage.takes')}</dt>
              <dd className="measure mt-1">
                {formatTypes(module?.accept ?? ['application/pdf'])} ·{' '}
                {t('toolPage.upTo', { count: maxFiles })}
              </dd>
            </div>
            <div className="surface p-5">
              <dt className="text-sm text-muted">{t('toolPage.runsHere')}</dt>
              <dd className="mt-1 text-sm">{t('toolPage.local')}</dd>
            </div>
          </dl>
          {warning ? <p className="mt-4 text-sm text-danger">{warning}</p> : null}
        </section>
      )}
    </div>
  )
}

function Measure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="measure text-sm">{value}</dd>
    </div>
  )
}

export const Component = ToolPage
