// `@types/node` is not a dependency of this package (and nothing in `src` ships to Node
// except the test). Only what the test actually calls is declared here.
declare module 'node:fs/promises' {
  export function readFile(path: URL): Promise<Uint8Array<ArrayBuffer>>
}
