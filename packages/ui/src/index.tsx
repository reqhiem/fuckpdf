import { Moon, Sun, X } from 'lucide-react'
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'accent' | 'ghost' | 'danger'
}

export function Button({ className, variant = 'accent', type = 'button', ...props }: ButtonProps) {
  const variants = {
    accent: 'bg-accent text-ink hover:bg-accent/85',
    ghost:
      'border border-ink/15 bg-transparent text-ink hover:bg-ink/5 dark:border-paper/20 dark:text-paper dark:hover:bg-paper/10',
    danger: 'bg-danger text-paper hover:bg-danger/85',
  }
  return (
    <button
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  )
}

export function Surface({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx('surface', className)} {...props} />
}

/**
 * A plain box, deliberately a `div`. Cards are often wrapped in a link, and a landmark
 * element inside a link is skipped when the browser computes the link's accessible name —
 * which leaves the link nameless to a screen reader.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('surface', className)} {...props} />
}

export function Badge({
  children,
  tone = 'muted',
}: {
  children: ReactNode
  tone?: 'muted' | 'accent'
}) {
  return (
    <span
      className={cx(
        'inline-flex rounded-full px-2 py-1 font-mono text-[0.6875rem] font-medium',
        tone === 'accent' ? 'bg-accent/15 text-accent' : 'bg-ink/8 text-muted dark:bg-paper/10',
      )}
    >
      {children}
    </span>
  )
}

type DropzoneProps = {
  accept?: string[]
  disabled?: boolean
  label: ReactNode
  multiple?: boolean
  onFiles: (files: File[]) => void
}

export function Dropzone({ accept, disabled, label, multiple = true, onFiles }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const accepted = accept?.join(',')
  const receive = (list: FileList | null) => {
    if (list) onFiles([...list])
  }
  useEffect(() => {
    const paste = (event: ClipboardEvent) => receive(event.clipboardData?.files ?? null)
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  })
  return (
    <div
      className={cx(
        'surface flex min-h-56 cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 text-center transition-colors',
        dragging && 'border-accent bg-accent/5',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <button
        className="w-full"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          receive(event.dataTransfer.files)
        }}
        type="button"
      >
        {label}
      </button>
      <input
        accept={accepted}
        aria-hidden="true"
        className="sr-only"
        disabled={disabled}
        multiple={multiple}
        onChange={(event) => receive(event.target.files)}
        ref={input}
        tabIndex={-1}
        type="file"
      />
    </div>
  )
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(value * 100)}
      className="space-y-2"
      role="progressbar"
    >
      <div className="h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-paper/10">
        <div
          className="h-full bg-accent transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        />
      </div>
      <p className="font-mono text-xs text-muted">{label}</p>
    </div>
  )
}

type DialogProps = { children: ReactNode; onClose: () => void; open: boolean; title: string }
export function Dialog({ children, onClose, open, title }: DialogProps) {
  const titleId = useId()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-6" role="presentation">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="surface w-full max-w-md p-6 shadow-2xl"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold" id={titleId}>
            {title}
          </h2>
          <button aria-label={title} className="rounded-lg p-2" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ThemeToggle({
  dark,
  label,
  onToggle,
}: {
  dark: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      aria-label={label}
      className="rounded-lg p-2 text-ink transition-colors hover:bg-ink/5 dark:text-paper dark:hover:bg-paper/10"
      onClick={onToggle}
      type="button"
    >
      {dark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
    </button>
  )
}

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>
