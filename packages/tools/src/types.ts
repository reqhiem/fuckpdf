export type PdfInput = {
  name: string
  bytes: Uint8Array
  password?: string
}

export type Output = {
  name: string
  bytes: Uint8Array
  mime: string
}

export type Progress = {
  /** 0..1 over the whole run. */
  value: number
  stage?: string
  current?: number
  total?: number
}

export type RunContext = {
  onProgress?: (p: Progress) => void
  signal?: AbortSignal
}

export type ToolStep<Options> = (
  inputs: PdfInput[],
  options: Options,
  ctx?: RunContext,
) => Promise<Output[]>

export class ToolError extends Error {
  /** Copyable technical detail. Never sent anywhere. */
  readonly detail: string | undefined

  constructor(message: string, detail?: string) {
    super(message)
    this.name = 'ToolError'
    this.detail = detail
  }
}

export class PasswordRequiredError extends ToolError {
  readonly fileName: string

  constructor(fileName: string) {
    super(`"${fileName}" is password-protected.`)
    this.name = 'PasswordRequiredError'
    this.fileName = fileName
  }
}
