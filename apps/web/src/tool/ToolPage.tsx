import {
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
  Button,
  Card,
  cx,
  Description,
  Dropzone,
  Input,
  Label,
  ProgressBar,
  Skeleton,
  TextField,
} from '@fuckpdf/ui'
import { zipSync } from 'fflate'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { PageGrid, type PageGridCrop, type PageRef } from '../components/page-grid'
import { formatBytes, formatTypes } from '../lib/format'
import { Landing } from '../shell/Landing'
import { encode, engine } from '../workers/engine'
import { optionsPanels } from './options-panel'
import {
  GRID_ONLY_TOOLS,
  GRID_TOOLS,
  toOrganizeOperations,
  toPageRangeString,
} from './page-selection'

const SOFT_LIMIT = 100 * 1024 * 1024
const HARD_LIMIT = 500 * 1024 * 1024

/** The stages the steps actually report. Anything else falls back to the generic label. */
const STAGES = new Set(['load', 'file', 'page', 'image', 'done'])

type RunError = { message: string; detail: string }

export function ToolPage() {
  // The routes are literal slugs (`/merge`, not `/:id`), so the tool is the path itself.
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
  const [copied, setCopied] = useState(false)
  const [passwordFile, setPasswordFile] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [gridBytes, setGridBytes] = useState<Uint8Array | null>(null)
  const [pages, setPages] = useState<PageRef[]>([])
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [crop, setCrop] = useState<PageGridCrop | null>(null)
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

  useEffect(() => {
    const first = files[0]
    if (!gridCapabilities || !first) {
      setGridBytes(null)
      setPages([])
      return
    }
    let live = true
    void first.arrayBuffer().then(async (buffer) => {
      if (!live) return
      const bytes = new Uint8Array(buffer)
      setGridBytes(bytes)
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
  }, [files, gridCapabilities])

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
    // deviceMemory is Chromium-only; absent means "assume it is fine" rather than "block".
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
      // A ToolError carries its own copyable detail; anything else only has a stack.
      const detail =
        'detail' in issue && typeof issue.detail === 'string' ? issue.detail : issue.stack
      setError({ message: issue.message, detail: detail ?? issue.name })
      setProgress(null)
    } finally {
      setRunning(false)
      controller.current = null
    }
  }

  // The four grid tools take their real options from the grid, not from the form.
  const gridOptions = (): Record<string, unknown> => {
    if (toolId === 'organize') return { operations: toOrganizeOperations(pages) }
    if (toolId === 'remove-pages' || toolId === 'extract-pages')
      return { pages: toPageRangeString(pages, selected) }
    if (toolId === 'crop' && crop) return { box: crop.rect }
    return {}
  }

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
  }

  const copyDetail = () => {
    if (!error) return
    void navigator.clipboard
      .writeText(error.detail)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => undefined)
  }

  const stageLabel =
    progress?.stage && STAGES.has(progress.stage)
      ? t(`toolPage.stage.${progress.stage}`)
      : t('tool.progress')

  // Grid tools need the width for page thumbnails. A form-driven tool does not, and giving
  // it the full column just leaves a wide empty gutter beside the options.
  const column = gridCapabilities ? 'max-w-6xl' : 'max-w-3xl'

  return (
    <div className={cx('mx-auto px-6 py-12', column)}>
      <Link className="text-sm text-muted" to="/">
        {t('tool.back')}
      </Link>
      <h1 className="mt-5 text-4xl font-bold tracking-tight">{t(`tools.${toolId}.name`)}</h1>
      <p className="mt-3 max-w-xl text-muted">{t(`tools.${toolId}.description`)}</p>

      {error ? (
        <Alert className="mt-8" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('toolPage.errorTitle')}</Alert.Title>
            <Alert.Description>{error.message}</Alert.Description>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-muted">
                {t('toolPage.errorDetail')}
              </summary>
              <pre className="measure mt-2 max-h-48 overflow-auto rounded-lg bg-ink/5 p-3 text-xs whitespace-pre-wrap dark:bg-paper/5">
                {error.detail}
              </pre>
              <Button className="mt-2" onPress={copyDetail} size="sm" variant="outline">
                {copied ? t('toolPage.copied') : t('toolPage.copyDetail')}
              </Button>
            </details>
          </Alert.Content>
        </Alert>
      ) : null}

      {outputs.length ? (
        <Card className="mt-8">
          <Card.Header>
            <Card.Title className="text-xl font-bold">{t('tool.results')}</Card.Title>
            <Card.Description>{t('tool.resultReady')}</Card.Description>
          </Card.Header>
          <Card.Content>
            <dl className="grid gap-5 sm:grid-cols-3">
              <Measure
                label={t('toolPage.before')}
                value={`${t('toolPage.fileCount', { count: files.length })} · ${formatBytes(totalIn)}`}
              />
              <Measure
                label={t('toolPage.after')}
                value={`${t('toolPage.fileCount', { count: outputs.length })} · ${formatBytes(totalOut)}`}
              />
              {pages.length ? (
                <Measure label={t('toolPage.pages')} value={String(pages.length)} />
              ) : null}
            </dl>
            <p className="mt-6 text-sm text-muted">{t('toolPage.outputs')}</p>
            <ul className="mt-2 divide-y divide-[var(--separator)]">
              {outputs.map((output) => (
                <li className="flex items-center justify-between gap-4 py-2" key={output.name}>
                  <span className="truncate text-sm">{output.name}</span>
                  <span className="measure text-xs text-muted">
                    {formatBytes(output.bytes.byteLength)}
                  </span>
                </li>
              ))}
            </ul>
          </Card.Content>
          <Card.Footer className="flex flex-wrap gap-3">
            <Button onPress={download}>{t('tool.download')}</Button>
            <Button onPress={startOver} variant="ghost">
              {t('tool.startOver')}
            </Button>
          </Card.Footer>
        </Card>
      ) : null}

      {files.length ? (
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-5">
            {gridCapabilities && gridBytes ? (
              <PageGrid
                bytes={gridBytes}
                capabilities={gridCapabilities}
                onChange={setPages}
                onSelectedChange={setSelected}
                pages={pages}
                selected={selected}
                {...(toolId === 'crop' ? { crop, onCropChange: setCrop } : {})}
              />
            ) : null}

            <Card>
              <Card.Header>
                <Card.Title className="text-base font-semibold">{t('toolPage.inputs')}</Card.Title>
              </Card.Header>
              <Card.Content className="divide-y divide-[var(--separator)]">
                {files.map((file) => (
                  <div
                    className="flex items-center justify-between gap-4 py-2"
                    key={`${file.name}-${file.lastModified}`}
                  >
                    <span className="truncate">{file.name}</span>
                    <span className="measure text-xs text-muted">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </Card.Content>
            </Card>

            {files.length < maxFiles ? (
              <Dropzone
                accept={module?.accept ?? ['application/pdf']}
                hint={t('toolPage.addFilesHint')}
                label={t('toolPage.addFiles')}
                multiple
                onFiles={select}
              />
            ) : null}

            {warning ? <p className="text-sm text-danger">{warning}</p> : null}
          </div>

          {/* The options scroll; the action does not. DESIGN.md: a sticky action bar gets
              its own row and its own background, and never floats over an input. */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]">
            {GRID_ONLY_TOOLS.has(toolId) ? null : (
              <Card className="lg:min-h-0 lg:overflow-y-auto">
                <Card.Header>
                  <Card.Title className="text-base font-semibold">{t('tool.options')}</Card.Title>
                </Card.Header>
                <Card.Content>
                  <Suspense fallback={<Skeleton className="h-24 rounded-lg" />}>
                    <OptionsPanel onChange={setOptions} value={options} />
                  </Suspense>
                </Card.Content>
              </Card>
            )}

            <Card className="shrink-0">
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
                  isDisabled={!module}
                  isPending={running}
                  onPress={() => void run()}
                >
                  {t('tool.run')}
                </Button>
                {running ? (
                  <Button onPress={() => controller.current?.abort()} variant="ghost">
                    {t('tool.cancel')}
                  </Button>
                ) : null}
              </div>
            </Card>

            {passwordFile ? (
              <Card className="shrink-0">
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void run(password)
                  }}
                >
                  <Card.Content className="space-y-3">
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
                  </Card.Content>
                </form>
              </Card>
            ) : null}
          </aside>
        </div>
      ) : (
        <section className="mt-10">
          {/* The drafting grid shows up where the user is about to put something down. */}
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
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="measure mt-1 text-lg">{value}</dd>
    </div>
  )
}

export const Component = ToolPage
