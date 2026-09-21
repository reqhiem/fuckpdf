import {
  loadTool,
  type Output,
  type PdfInput,
  TOOL_IDS,
  type ToolId,
  type ToolModule,
} from '@fuckpdf/tools'
import { Button, Dropzone, Progress, Surface } from '@fuckpdf/ui'
import { zipSync } from 'fflate'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { formatBytes } from '../lib/format'
import { Landing } from '../shell/Landing'
import { optionsPanels } from './options-panel'

const SOFT_LIMIT = 100 * 1024 * 1024
const HARD_LIMIT = 500 * 1024 * 1024

type RunError = { message: string; detail: string }

export function ToolPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const toolId = TOOL_IDS.find((item): item is ToolId => item === id)

  const [module, setModule] = useState<ToolModule | null>(null)
  const [options, setOptions] = useState<Record<string, unknown>>({})
  const [files, setFiles] = useState<File[]>([])
  const [warning, setWarning] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [outputs, setOutputs] = useState<Output[]>([])
  const [error, setError] = useState<RunError | null>(null)
  const [passwordFile, setPasswordFile] = useState<string | null>(null)
  const [password, setPassword] = useState('')
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

  const totalIn = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files])
  const totalOut = useMemo(
    () => outputs.reduce((sum, output) => sum + output.bytes.byteLength, 0),
    [outputs],
  )

  if (!toolId) return <Landing />

  const OptionsPanel = optionsPanels[toolId]

  const select = (next: File[]) => {
    const all = [...files, ...next].slice(0, module?.inputs.max ?? Number.MAX_SAFE_INTEGER)
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
    setProgress(0)
    try {
      const inputs: PdfInput[] = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
          ...(retryPassword ? { password: retryPassword } : {}),
        })),
      )
      const produced = await module.run(inputs, options, {
        signal: abort.signal,
        onProgress: ({ value }) => setProgress(value),
      })
      setOutputs(produced)
      setProgress(1)
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
      setError({ message: issue.message, detail: issue.stack ?? issue.name })
      setProgress(null)
    } finally {
      controller.current = null
    }
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
                  <span className="truncate">{file.name}</span>
                  <span className="font-mono text-xs text-muted">{formatBytes(file.size)}</span>
                </div>
              ))}
            </Surface>
          ) : null}
        </div>

        <aside className="space-y-5">
          <Surface className="p-5">
            <h2 className="font-semibold">{t('tool.options')}</h2>
            <Suspense fallback={<p className="mt-3 text-sm text-muted">{t('tool.loading')}</p>}>
              <OptionsPanel onChange={setOptions} value={options} />
            </Suspense>
          </Surface>

          {progress !== null ? <Progress label={t('tool.progress')} value={progress} /> : null}

          <Button
            className="sticky bottom-4 w-full"
            disabled={!files.length || !module || progress !== null}
            onClick={() => void run()}
          >
            {t('tool.run')}
          </Button>
          {progress !== null && progress < 1 ? (
            <Button className="w-full" onClick={() => controller.current?.abort()} variant="ghost">
              {t('tool.cancel')}
            </Button>
          ) : null}

          {passwordFile ? (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault()
                void run(password)
              }}
            >
              <label className="block text-sm" htmlFor="pdf-password">
                {t('tool.password', { file: passwordFile })}
              </label>
              <input
                className="w-full rounded-lg border border-ink/15 bg-transparent p-2 dark:border-paper/20"
                id="pdf-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
              <Button type="submit">{t('tool.unlock')}</Button>
            </form>
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
            <Button onClick={startOver} variant="ghost">
              {t('tool.startOver')}
            </Button>
          </div>
          <p className="mt-4 font-mono text-xs text-muted">
            {t('tool.beforeAfter', {
              before: formatBytes(totalIn),
              after: formatBytes(totalOut),
            })}
          </p>
        </Surface>
      ) : null}
    </div>
  )
}

export const Component = ToolPage
