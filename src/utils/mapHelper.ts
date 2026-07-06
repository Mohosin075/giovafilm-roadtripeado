import axios from 'axios'

/**
 * Resolves any Google Maps link (short or long) and extracts latitude and longitude.
 * Supports:
 * - Shortened URLs: maps.app.goo.gl, goo.gl/maps
 * - Standard long URL coordinates format: @lat,lng
 * - Param-based coordinates formats: q=lat,lng, query=lat,lng, ll=lat,lng
 * 
 * @param mapUrl Google Maps URL
 * @returns Object with lat and lng, or null if extraction fails
 */
export const getCoordinatesFromUrl = async (
  mapUrl: string,
): Promise<{ lat: number; lng: number } | null> => {
  let url = mapUrl

  try {
    // 1. If it's a short link, follow redirects to get the final expanded URL
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
      const response = await axios.get(url, {
        maxRedirects: 5,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })
      url = response.request?.res?.responseUrl || response.headers?.location || url
    }

    // 2. Try matching coordinates using regex patterns
    // Matches @23.7808875,90.2680875
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/
    let match = url.match(regex)

    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
      }
    }

    // Matches ?q=23.7808875,90.2680875, query=..., ll=...
    const paramRegex = /[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/
    match = url.match(paramRegex)
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
      }
    }

    return null
  } catch (error: any) {
    console.error('Error resolving Google Maps URL:', error.message || error)
    return null
  }
}
