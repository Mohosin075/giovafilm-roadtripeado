import axios from 'axios'
import https from 'https'
import config from '../config'

/**
 * Get country name from coordinates using Google Maps Reverse Geocoding API
 * @param lat Latitude
 * @param lng Longitude
 * @returns Country name or null
 */
export const getCountryFromCoordinates = async (
  lat: number,
  lng: number,
): Promise<string | null> => {
  try {
    const agent = new https.Agent({ family: 4 })
    const API_KEY = config.server_map_api_key

    console.log('API_KEY', API_KEY)

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          latlng: `${lat},${lng}`,
          key: API_KEY,
        },
        httpsAgent: agent,
      },
    )

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      // Loop through all results to find a country component
      for (const result of response.data.results) {
        const countryComponent = result.address_components.find((comp: any) =>
          comp.types.includes('country'),
        )
        if (countryComponent) {
          return countryComponent.long_name
        }
      }
    }

    console.log('Google API Status:', response.data.status)
    if (response.data.error_message) {
      console.log('Google API Error:', response.data.error_message)
    }
    console.log('No country found for coordinates:', lat, lng)
    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}
