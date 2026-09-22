import type { ToolModule } from '@fuckpdf/tools'
import { cx, Skeleton } from '@fuckpdf/ui'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { encode, engine } from '../../workers/engine'
import { renderFile, renderPdfBytes, SHEET } from '../file-strip/thumb'
import { canRunLive, previewKind } from './preview-source'

const DEBOUNCE_MS = 400

const PREVIEW_DPI = 144

export type LivePreviewProps = {
  module: ToolModule | null
  file: File
  options: Record<string, unknown>
}

type Note = 'live' | 'static' | 'fallback'

type Shot = { url: string; pages: number | undefined; note: Note }

const preview = async (
  module: ToolModule,
  file: File,
  options: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Shot | null> => {
  const fromInput = async (note: Note): Promise<Shot | null> => {
    try {
      return { ...(await renderFile(file, PREVIEW_DPI)), note }
    } catch {
      return null
    }
  }

  if (!canRunLive(file.size)) return fromInput('static')

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const outputs = await module.run(
      [{ name: file.name, bytes }],
      { ...options, engine, encode },
      { signal },
    )
    if (signal.aborted) return null

    const first = outputs[0]
    if (first) {
      const kind = previewKind(first)
      if (kind === 'pdf')
        return {
          ...(await renderPdfBytes(first.bytes.slice().buffer as ArrayBuffer, PREVIEW_DPI)),
          note: 'live',
        }
      if (kind === 'image')
        return {
          url: URL.createObjectURL(
            new Blob([first.bytes.slice().buffer as ArrayBuffer], { type: first.mime }),
          ),
          pages: undefined,
          note: 'live',
        }
    }
    return fromInput('fallback')
  } catch {
    return fromInput('fallback')
  }
}

export function LivePreview({ module, file, options }: LivePreviewProps) {
  const { t } = useTranslation()
  const [shot, setShot] = useState<Shot | null>(null)
  const [busy, setBusy] = useState(true)
  const showing = useRef<Shot | null>(null)

  // Keyed on the option values, not the object identity, which is new on every render.
  const key = JSON.stringify(options)

  useEffect(() => {
    if (!module) return
    const abort = new AbortController()
    let live = true
    setBusy(true)

    const show = (next: Shot | null) => {
      if (!live) {
        if (next) URL.revokeObjectURL(next.url)
        return
      }
      if (next) {
        const previous = showing.current
        showing.current = next
        setShot(next)
        if (previous) URL.revokeObjectURL(previous.url)
      }
      setBusy(false)
    }

    const timer = setTimeout(() => {
      void preview(module, file, JSON.parse(key) as Record<string, unknown>, abort.signal)
        .then(show)
        .catch(() => show(null))
    }, DEBOUNCE_MS)

    return () => {
      live = false
      clearTimeout(timer)
      abort.abort()
    }
  }, [module, file, key])

  useEffect(
    () => () => {
      if (showing.current) URL.revokeObjectURL(showing.current.url)
      showing.current = null
    },
    [],
  )

  const alt = (current: Shot) => {
    if (current.note === 'live')
      return current.pages
        ? t('preview.resultAlt', { total: current.pages })
        : t('preview.resultImageAlt')
    return current.pages
      ? t('preview.pdfAlt', { name: file.name, total: current.pages })
      : t('preview.imageAlt', { name: file.name })
  }

  let body: ReactNode
  if (shot)
    body = (
      <img
        alt={alt(shot)}
        className={cx(
          SHEET,
          'max-h-full max-w-full object-contain transition-opacity duration-200',
          busy && 'opacity-60',
        )}
        draggable={false}
        src={shot.url}
      />
    )
  else if (busy) body = <Skeleton className="aspect-[1/1.414] h-full max-h-[36rem] rounded-sm" />
  else body = <p className="px-4 text-center text-sm text-muted">{t('preview.none')}</p>

  const caption = [
    shot ? t(`preview.note.${shot.note}`) : t('preview.rendering'),
    busy && shot ? t('preview.refreshing') : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <figure>
      <div
        aria-busy={busy}
        className="flex min-h-96 lg:h-[calc(100dvh-11rem)] items-center justify-center overflow-hidden rounded-[var(--radius)] bg-ink/5 p-6 dark:bg-paper/5"
      >
        {body}
      </div>
      <figcaption aria-live="polite" className="mt-2 text-xs text-muted">
        {caption}
      </figcaption>
    </figure>
  )
}
