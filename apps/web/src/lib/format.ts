export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`
}

/** `image/jpeg` → `JPG`. */
export function formatTypes(accept: string[]) {
  const names = accept.map((type) => (type.split('/')[1] ?? type).replace('jpeg', 'jpg'))
  return [...new Set(names)].join(' · ').toUpperCase()
}
