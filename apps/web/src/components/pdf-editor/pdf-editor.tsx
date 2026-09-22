import type { EditElement } from '@fuckpdf/tools'
import { Alert, Button, Card } from '@fuckpdf/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { openPdf, type PdfDocument } from '../../workers/pdfium-client'
import { Canvas } from './canvas'
import { useEditorStore } from './store'
import { Toolbar } from './toolbar'

const PAGE_DPI = 96
const IMAGE_FIT = 0.8

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
  const [pageCount, setPageCount] = useState(0)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [pageUrl, setPageUrl] = useState<string | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

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
    setPageUrl(undefined)
    void opening
      .then(async (doc) => {
        const number = Math.min(Math.max(page, 1), doc.pageCount)
        const [blob, pageSize] = await Promise.all([
          doc.thumbnail(number, PAGE_DPI),
          doc.pageSize(number),
        ])
        if (!live) return
        if (url.current) URL.revokeObjectURL(url.current)
        url.current = URL.createObjectURL(blob)
        setSize(pageSize)
        setPageUrl(url.current)
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
  }, [page, pageCount])

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

  const placeImage = async (file: File) => {
    if (!size) return
    const bitmap = await createImageBitmap(file)
    const fit = Math.min(
      1,
      (size.width * IMAGE_FIT) / bitmap.width,
      (size.height * IMAGE_FIT) / bitmap.height,
    )
    const width = bitmap.width * fit
    const height = bitmap.height * fit
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
    useEditorStore.getState().setPage(Math.min(Math.max(page + delta, 1), pageCount))

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-base font-semibold">{t('edit.title')}</Card.Title>
        <Card.Description>{t('edit.notice')}</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-4">
        <Toolbar
          isDisabled={!size}
          onImage={(file) => {
            setProblem(null)
            placeImage(file).catch(() => setProblem(t('edit.imageFailed')))
          }}
        />

        {problem || (failed && !size) ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{problem ?? t('edit.failed')}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {size ? (
          <Canvas failed={failed} height={size.height} pageUrl={pageUrl} width={size.width} />
        ) : null}

        {pageCount > 1 ? (
          <nav aria-label={t('edit.pages')} className="flex items-center justify-center gap-3">
            <Button
              aria-label={t('edit.previousPage')}
              isDisabled={page <= 1}
              isIconOnly
              onPress={() => turn(-1)}
              variant="ghost"
            >
              <ChevronLeft aria-hidden={true} size={16} />
            </Button>
            <span className="measure text-sm text-muted">
              {t('edit.pageOf', { page, total: pageCount })}
            </span>
            <Button
              aria-label={t('edit.nextPage')}
              isDisabled={page >= pageCount}
              isIconOnly
              onPress={() => turn(1)}
              variant="ghost"
            >
              <ChevronRight aria-hidden={true} size={16} />
            </Button>
          </nav>
        ) : null}

        <p className="text-sm text-muted">{t('edit.hint')}</p>
      </Card.Content>
    </Card>
  )
}
