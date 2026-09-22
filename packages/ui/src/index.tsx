// The single seam onto HeroUI v3. App code imports from here, never from `@heroui/react`.
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
  compact?: boolean
  disabled?: boolean
  hint: ReactNode
  label: ReactNode
  multiple?: boolean
  onFiles: (files: File[]) => void
}

export function Dropzone({
  accept,
  compact = false,
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
          'surface group flex w-full cursor-pointer items-center justify-center border-2 border-dashed text-center transition-colors duration-200',
          compact ? 'gap-3 p-4' : 'min-h-64 flex-col gap-4 p-8',
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
            'flex items-center justify-center rounded-full transition-colors duration-200',
            compact ? 'size-9' : 'size-14',
            dragging
              ? 'bg-accent text-ink'
              : 'bg-[var(--default)] text-muted group-hover:text-accent',
          )}
        >
          <UploadCloud size={compact ? 16 : 24} />
        </span>
        <span className={cx('block font-semibold', compact ? 'text-sm' : 'text-lg')}>{label}</span>
        <span
          className={cx(
            'block max-w-sm leading-6 text-muted',
            compact ? 'sr-only sm:not-sr-only sm:text-sm' : 'text-sm',
          )}
        >
          {hint}
        </span>
      </button>
      <input
        accept={accepted}
        // Hidden from the tree too: exposed, it reads as a second nameless "Choose File".
        aria-hidden="true"
        className="sr-only"
        disabled={disabled}
        multiple={multiple}
        onChange={(event) => {
          receive(event.target.files)
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
