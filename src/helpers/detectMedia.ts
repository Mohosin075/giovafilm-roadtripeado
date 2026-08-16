// Helper function to detect media type from URL
export function detectMediaType(mediaUrl: string): 'photo' | 'video' {
  const url = mediaUrl.toLowerCase()

  // Common image extensions
  const imageExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.heic',
  ]
  // Common video extensions
  const videoExtensions = [
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
    '.webm',
    '.flv',
    '.wmv',
    '.m4v',
    '.ogv',
    '.3gp',
    '.3gpp',
    '.mpeg',
    '.mpg',
  ]

  const isImage = imageExtensions.some(ext =>
    url.split('?')[0].endsWith(ext),
  )
  const isVideo = videoExtensions.some(ext =>
    url.split('?')[0].endsWith(ext),
  )

  if (isImage) return 'photo'
  if (isVideo) return 'video'

  // Default to photo if unknown
  console.warn(
    `⚠️ Unknown media type for URL: ${mediaUrl}, defaulting to photo`,
  )
  return 'photo'
}
