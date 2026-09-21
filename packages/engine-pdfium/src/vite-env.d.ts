// `?url` asset imports are a bundler feature; only `src/wasm.ts` uses one.
declare module '*.wasm?url' {
  const src: string
  export default src
}
