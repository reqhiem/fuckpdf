/**
 * The one contract every tool obeys (PRD §5.2).
 *
 * A step is pure: bytes and options in, bytes out. No DOM, no React, no globals.
 * That purity is what makes Workflows (PRD §5.1 FR-12) a UI concern rather than
 * a rewrite, and what lets every step be tested under Node.
 */

export type PdfInput = {
  /** Original file name, used to derive output names (PRD §5.2 FR-6). */
  name: string
  bytes: Uint8Array
  /** Set when the source PDF is encrypted and the user supplied the password (FR-5). */
  password?: string
}

export type Output = {
  name: string
  bytes: Uint8Array
  mime: string
}

/** Reported per file and per page so the UI can show real progress (FR-4). */
export type Progress = {
  /** 0..1 over the whole run. */
  value: number
  /** Human, already-translated-upstream label key, e.g. 'page' or 'file'. */
  stage?: string
  current?: number
  total?: number
}

export type RunContext = {
  onProgress?: (p: Progress) => void
  /** Cancellation is mandatory for every long step (FR-4). */
  signal?: AbortSignal
}

export type ToolStep<Options> = (
  inputs: PdfInput[],
  options: Options,
  ctx?: RunContext,
) => Promise<Output[]>

/** Thrown when a step fails for a reason worth showing the user (NFR-7). */
export class ToolError extends Error {
  /** Copyable technical detail. Never sent anywhere. */
  readonly detail: string | undefined

  constructor(message: string, detail?: string) {
    super(message)
    this.name = 'ToolError'
    this.detail = detail
  }
}

/** Thrown when an input is encrypted and no usable password was supplied (FR-5). */
export class PasswordRequiredError extends ToolError {
  readonly fileName: string

  constructor(fileName: string) {
    super(`"${fileName}" is password-protected.`)
    this.name = 'PasswordRequiredError'
    this.fileName = fileName
  }
}
