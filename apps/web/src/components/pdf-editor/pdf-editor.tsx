import type { EditElement } from '@fuckpdf/tools'
import { Alert, Skeleton } from '@fuckpdf/ui'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { openPdf, type PdfDocument } from '../../workers/pdfium-client'
import { Canvas } from './canvas'
import { useEditorStore } from './store'
import { TOOLS, Toolbar } from './toolbar'

const IMAGE_FIT = 0.8
// 100% is real size: a point is 1/72in and a CSS pixel 1/96in.
const PX_PER_PT = 96 / 72
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
const ZOOM_MIN = ZOOM_STEPS[0] as number
const ZOOM_MAX = ZOOM_STEPS.at(-1) as number
const WELL_PADDING = 32
const BASE_DPI = 96
// Bounds the bitmap at 400% on a letter page to ~14 Mpx.
const MAX_DPI = 384
const DPI_STEP = 48

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high)

export type PdfEditorProps = {
  /** Read-only here: it is the buffer the step will run on. */
  bytes: Uint8Array
  password?: string
  /** Every change to the element list; `ToolPage` puts these into `options.elements`. */
  onChange: (elements: EditElement[]) => void
}

export function PdfEditor({ bytes, password, onChange }: PdfEditorProps) {
  const { t } = useTranslation()
  const page = useEditorStore((state) => state.page)
  const elements = useEditorStore((state) => state.elements)

  const handle = useRef<Promise<PdfDocument> | null>(null)
  const url = useRef<string | null>(null)
  const emitted = useRef<EditElement[] | null>(null)
  const well = useRef<HTMLDivElement>(null)
  const anchor = useRef<{ x: number; y: number; ratio: number } | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [rendered, setRendered] = useState<{ page: number; url: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [wellWidth, setWellWidth] = useState(0)
  const [zoomSet, setZoom] = useState<number | null>(null)

  const pageWidth = size?.width ?? 612
  const fit = clamp((wellWidth - 2 * WELL_PADDING) / (pageWidth * PX_PER_PT), ZOOM_MIN, ZOOM_MAX)
  const zoom = zoomSet ?? fit
  const wantedDpi = clamp(
    Math.ceil((BASE_DPI * zoom * (window.devicePixelRatio || 1)) / DPI_STEP) * DPI_STEP,
    BASE_DPI,
    MAX_DPI,
  )
  const [dpi, setDpi] = useState(BASE_DPI)

  useEffect(() => {
    const id = setTimeout(() => setDpi(wantedDpi), 250)
    return () => clearTimeout(id)
  }, [wantedDpi])

  useEffect(() => {
    const store = useEditorStore.getState()
    store.reset()
    let live = true
    // `openPdf` detaches what it is given and the step still needs the original.
    const opening = openPdf(bytes.slice().buffer as ArrayBuffer, password)
    handle.current = opening
    setFailed(false)
    opening
      .then((doc) => {
        if (live) setPageCount(doc.pageCount)
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
      handle.current = null
      void opening.then((doc) => doc.close()).catch(() => undefined)
      store.reset()
    }
  }, [bytes, password])

  useEffect(() => {
    const opening = handle.current
    if (!opening || !pageCount) return
    let live = true
    void opening
      .then(async (doc) => {
        const number = clamp(page, 1, doc.pageCount)
        const [blob, pageSize] = await Promise.all([
          doc.thumbnail(number, dpi),
          doc.pageSize(number),
        ])
        if (!live) return
        if (url.current) URL.revokeObjectURL(url.current)
        url.current = URL.createObjectURL(blob)
        setSize(pageSize)
        setRendered({ page, url: url.current })
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
  }, [page, pageCount, dpi])

  useEffect(
    () => () => {
      if (url.current) URL.revokeObjectURL(url.current)
      url.current = null
    },
    [],
  )

  useEffect(() => {
    if (emitted.current === elements) return
    emitted.current = elements
    onChange(elements)
  }, [elements, onChange])

  useEffect(() => {
    const node = well.current
    if (!node) return
    const observer = new ResizeObserver(() => setWellWidth(node.clientWidth))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new page starts at its top-left corner
  useEffect(() => {
    well.current?.scrollTo(0, 0)
  }, [page])

  const zoomTo = (next: number, at?: { x: number; y: number }) => {
    const target = clamp(next, ZOOM_MIN, ZOOM_MAX)
    const node = well.current
    if (node) {
      const point = at ?? { x: node.clientWidth / 2, y: node.clientHeight / 2 }
      anchor.current = { ...point, ratio: target / zoom }
    }
    setZoom(target)
  }

  // Keeps the point under the cursor (or the middle of the well) in place across a zoom.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per applied zoom
  useLayoutEffect(() => {
    const node = well.current
    const held = anchor.current
    anchor.current = null
    if (!node || !held) return
    node.scrollLeft = (node.scrollLeft + held.x) * held.ratio - held.x
    node.scrollTop = (node.scrollTop + held.y) * held.ratio - held.y
  }, [zoom])

  const step = (direction: 1 | -1) => {
    const next =
      direction > 0
        ? ZOOM_STEPS.find((value) => value > zoom + 0.001)
        : [...ZOOM_STEPS].reverse().find((value) => value < zoom - 0.001)
    zoomTo(next ?? (direction > 0 ? ZOOM_MAX : ZOOM_MIN))
  }

  const latest = useRef({ zoom, zoomTo })
  latest.current = { zoom, zoomTo }
  useEffect(() => {
    const node = well.current
    if (!node) return
    // Native and non-passive: React's wheel listener is passive and cannot stop page zoom.
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const box = node.getBoundingClientRect()
      const { zoom: current, zoomTo: apply } = latest.current
      apply(current * Math.exp(-event.deltaY * 0.002), {
        x: event.clientX - box.left,
        y: event.clientY - box.top,
      })
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => node.removeEventListener('wheel', wheel)
  }, [])

  const keyDown = (event: ReactKeyboardEvent) => {
    const target = event.target as HTMLElement
    if (event.defaultPrevented || event.altKey || target.closest('input, textarea')) return
    const store = useEditorStore.getState()
    const mod = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    if (key === '=' || key === '+') step(1)
    else if (key === '-') step(-1)
    else if (key === '0') setZoom(null)
    else if (mod && key === 'z') event.shiftKey ? store.redo() : store.undo()
    else if (mod && key === 'y') store.redo()
    else if (!mod && size) {
      const tool = TOOLS.find((item) => item.key?.toLowerCase() === key)
      if (!tool) return
      store.setTool(tool.id)
    } else return
    event.preventDefault()
  }

  const placeImage = async (file: File) => {
    if (!size) return
    const bitmap = await createImageBitmap(file)
    const fitted = Math.min(
      1,
      (size.width * IMAGE_FIT) / bitmap.width,
      (size.height * IMAGE_FIT) / bitmap.height,
    )
    const width = bitmap.width * fitted
    const height = bitmap.height * fitted
    bitmap.close()
    const store = useEditorStore.getState()
    store.add({
      id: crypto.randomUUID(),
      type: 'image',
      page,
      x: (size.width - width) / 2,
      y: (size.height - height) / 2,
      width,
      height,
      bytes: new Uint8Array(await file.arrayBuffer()),
      mime: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
    })
    store.setTool('select')
  }

  const turn = (delta: number) =>
    useEditorStore.getState().setPage(clamp(page + delta, 1, pageCount))

  return (
    <section
      aria-label={t('edit.title')}
      className="surface flex h-[calc(100dvh-3rem)] min-h-[28rem] flex-col overflow-hidden"
      onKeyDown={keyDown}
    >
      <Toolbar
        isDisabled={!size}
        isFit={zoomSet === null}
        onFit={() => setZoom(null)}
        onImage={(file) => {
          setProblem(null)
          placeImage(file).catch(() => setProblem(t('edit.imageFailed')))
        }}
        onTurn={turn}
        onZoom={step}
        page={page}
        pageCount={pageCount}
        zoom={zoom}
      />

      {problem || (failed && !size) ? (
        <Alert className="m-2" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{problem ?? t('edit.failed')}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <div
        className="hero-grid min-h-0 flex-1 overflow-auto bg-ink/5 bg-local [scrollbar-gutter:stable] dark:bg-paper/5"
        ref={well}
      >
        <div className="flex min-h-full w-fit min-w-full" style={{ padding: WELL_PADDING }}>
          <div className="m-auto">
            {size ? (
              <Canvas
                displayWidth={size.width * PX_PER_PT * zoom}
                failed={failed}
                height={size.height}
                pageUrl={rendered?.page === page ? rendered.url : undefined}
                width={size.width}
              />
            ) : failed ? null : (
              <Skeleton className="aspect-[1/1.294] w-72 rounded-none" />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--separator)] px-3 py-1.5 text-xs text-muted">
        <span className="truncate">{t('edit.notice')}</span>
        {size ? (
          <span className="measure shrink-0">
            {t('edit.pageSize', {
              width: Math.round(size.width),
              height: Math.round(size.height),
            })}
          </span>
        ) : null}
      </div>
    </section>
  )
}
