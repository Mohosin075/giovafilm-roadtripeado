import axios from 'axios'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const MAX_IMAGE_WIDTH = 1000

/**
 * Hosts whose image URLs cannot be stored long term: Google photo links carry
 * an API key and a reference that expires, so the browser eventually gets 403.
 */
const REMOTE_IMAGE_HOSTS = [
  'maps.googleapis.com',
  'places.googleapis.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'mymaps.usercontent.google.com',
  'streetviewpixels-pa.googleapis.com',
]

export const isRemoteManagedImage = (url: unknown): boolean => {
  if (typeof url !== 'string' || !url.trim()) return false
  try {
    const { hostname } = new URL(url.trim())
    return REMOTE_IMAGE_HOSTS.includes(hostname)
  } catch {
    return false
  }
}

const extensionFor = (contentType: string): 'png' | 'webp' | 'jpg' => {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  return 'jpg'
}

type SharpInstance = ReturnType<typeof sharp>

const encodeFor = (instance: SharpInstance, extension: string) => {
  if (extension === 'png') return instance.png({ quality: 80, compressionLevel: 6 })
  if (extension === 'webp') return instance.webp({ quality: 80 })
  return instance.jpeg({ quality: 80, mozjpeg: true })
}

/**
 * Downloads a remote image and stores it under uploads/images.
 * @returns the public path (e.g. /uploads/images/123.jpg) or null when it fails
 */
export const downloadImageToUploads = async (
  url: string,
): Promise<string | null> => {
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 300,
    })

    const contentType = String(response.headers['content-type'] || '')
    if (!contentType.startsWith('image/')) {
      console.error(`Not an image (${contentType || 'unknown type'}): ${url}`)
      return null
    }

    const buffer = Buffer.from(response.data)
    if (!buffer.length) return null

    const extension = extensionFor(contentType)
    // Always re-encode: remote originals are often 3-5x bigger than needed.
    const encoded = await encodeFor(
      sharp(buffer).resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true }),
      extension,
    ).toBuffer()
    const output = encoded.length < buffer.length ? encoded : buffer

    const uploadsDir = path.join(process.cwd(), 'uploads', 'images')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
    fs.writeFileSync(path.join(uploadsDir, filename), output)

    return `/uploads/images/${filename}`
  } catch (error: any) {
    console.error(`Download failed (${error?.response?.status || error?.message}): ${url}`)
    return null
  }
}
