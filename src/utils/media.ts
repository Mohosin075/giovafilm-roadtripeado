export const toStringArray = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.flatMap(item => toStringArray(item))
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>
    const path = rec.url || rec.path || rec.src
    return typeof path === 'string' && path.trim() ? [path.trim()] : []
  }
  return []
}

export const isUsableMediaUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false
  const path = url.trim()
  return Boolean(path && path !== 'undefined' && path !== 'null')
}

export const sanitizeMediaList = (media: unknown): string[] =>
  toStringArray(media).filter(isUsableMediaUrl)
