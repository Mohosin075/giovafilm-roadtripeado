import axios from 'axios'

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
}

const isShortMapsUrl = (url: string) =>
  /maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/maps/i.test(url)

const cleanMapsUrl = (rawUrl: string) =>
  decodeURIComponent(rawUrl.replace(/[\u200B-\u200D\uFEFF]/g, '').trim())
    .replace(/,\s*\+/g, ',')
    .replace(/\+/g, ' ')

const COORD_PATTERNS = [
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  /[?&](?:q|query|ll|center)=(-?\d+\.\d+)[, ]+(-?\d+\.\d+)/i,
  /\/maps\/(?:search|place)\/(-?\d+\.\d+)[, ]+(-?\d+\.\d+)/i,
  /\/dir\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  /[?&](?:destination|origin)=(-?\d+\.\d+),(-?\d+\.\d+)/i,
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,
]

export const parseCoordinatesFromMapsUrl = (
  rawUrl: string,
): { lat: number; lng: number } | null => {
  if (!rawUrl) return null

  const candidates = [cleanMapsUrl(rawUrl), rawUrl.trim()]

  for (const url of candidates) {
    for (const regex of COORD_PATTERNS) {
      const match = url.match(regex)
      if (!match) continue
      const lat = Number(match[1])
      const lng = Number(match[2])
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        return { lat, lng }
      }
    }
  }

  return null
}

const expandShortUrl = async (startUrl: string): Promise<string> => {
  let current = startUrl.trim()

  for (let i = 0; i < 8; i++) {
    try {
      const response = await axios.get(current, {
        maxRedirects: 0,
        timeout: 12000,
        validateStatus: status => status >= 200 && status < 400,
        headers: BROWSER_HEADERS,
      })

      const location = response.headers?.location
      if (location && response.status >= 300 && response.status < 400) {
        current = new URL(location, current).toString()
        if (parseCoordinatesFromMapsUrl(current)) return current
        continue
      }

      return (
        response.request?.res?.responseUrl ||
        response.request?.responseURL ||
        current
      )
    } catch (error: any) {
      const location = error?.response?.headers?.location
      if (location) {
        current = new URL(location, current).toString()
        if (parseCoordinatesFromMapsUrl(current)) return current
        continue
      }
      break
    }
  }

  return current
}

/**
 * Resolves any Google Maps link (short or long) and extracts latitude and longitude.
 */
export const getCoordinatesFromUrl = async (
  mapUrl: string,
): Promise<{ lat: number; lng: number } | null> => {
  try {
    let url = (mapUrl || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
    if (!url) return null
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`

    const direct = parseCoordinatesFromMapsUrl(url)
    if (direct) return direct

    if (isShortMapsUrl(url)) {
      const expanded = await expandShortUrl(url)
      return parseCoordinatesFromMapsUrl(expanded)
    }

    return null
  } catch (error: any) {
    console.error('Error resolving Google Maps URL:', error.message || error)
    return null
  }
}
