/**
 * The design system is HeroUI v3 (Tailwind v4 + React Aria). This package is the single
 * seam: it re-exports the HeroUI primitives the app is allowed to use, and adds the two
 * things HeroUI has no equivalent for — the file dropzone and the theme toggle.
 *
 * Brand styling lives entirely in `apps/web/src/styles/tokens.css`, which remaps HeroUI's
 * semantic CSS variables. No component here overrides HeroUI's own classes.
 */
import { Button, Tooltip } from '@heroui/react'
import { Moon, Sun, UploadCloud } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

export type { ButtonProps } from '@heroui/react'
export {
  Alert,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Chip,
  CloseButton,
  Description,
  FieldError,
  Fieldset,
  Form,
  Input,
  InputGroup,
  Label,
  ListBox,
  Modal,
  NumberField,
  ProgressBar,
  Radio,
  RadioGroup,
  SearchField,
  Select,
  Separator,
  Skeleton,
  Slider,
  Spinner,
  Switch,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@heroui/react'

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

type DropzoneProps = {
  accept?: string[]
  disabled?: boolean
  hint: ReactNode
  label: ReactNode
  multiple?: boolean
  onFiles: (files: File[]) => void
}

/**
 * A drop target that is also a button and also listens for paste. React Aria has no
 * file-drop primitive, so this stays hand-rolled — but it is one button, so the keyboard
 * and screen-reader path is the button's, not a re-invented one.
 */
export function Dropzone({
  accept,
  disabled,
  hint,
  label,
  multiple = true,
  onFiles,
}: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const accepted = accept?.join(',')
  const receive = (list: FileList | null) => {
    if (list?.length) onFiles([...list])
  }
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (!disabled) receive(event.clipboardData?.files ?? null)
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  })
  return (
    <>
      <button
        className={cx(
          'surface group flex min-h-64 w-full cursor-pointer flex-col items-center justify-center gap-4 border-2 border-dashed p-8 text-center transition-colors duration-200',
          dragging
            ? 'border-accent bg-accent/8'
            : 'border-[var(--border)] hover:border-accent/50 hover:bg-accent/4',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          // Only leave when the pointer left the zone itself, not a child.
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          receive(event.dataTransfer.files)
        }}
        type="button"
      >
        <span
          aria-hidden="true"
          className={cx(
            'flex size-14 items-center justify-center rounded-full transition-colors duration-200',
            dragging
              ? 'bg-accent text-ink'
              : 'bg-[var(--default)] text-muted group-hover:text-accent',
          )}
        >
          <UploadCloud size={24} />
        </span>
        <span className="block text-lg font-semibold">{label}</span>
        <span className="block max-w-sm text-sm leading-6 text-muted">{hint}</span>
      </button>
      <input
        accept={accepted}
        // Hidden from the tree as well as from view: the button above is the control, and
        // an exposed file input shows up as a second, nameless "Choose File".
        aria-hidden="true"
        className="sr-only"
        disabled={disabled}
        multiple={multiple}
        onChange={(event) => {
          receive(event.target.files)
          // Let the same file be chosen twice in a row.
          event.target.value = ''
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
    </>
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
    <Tooltip>
      <Button aria-label={label} isIconOnly onPress={onToggle} size="sm" variant="ghost">
        {dark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  )
}
