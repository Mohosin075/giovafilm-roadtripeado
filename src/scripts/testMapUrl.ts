import { getCoordinatesFromUrl } from '../utils/mapHelper'

async function runTest() {
  console.log('--- TESTING GOOGLE MAPS URL PARSER ---')

  const testUrls = [
    // 1. Full URL with @lat,lng
    'https://www.google.com/maps/place/Dhaka/@23.7808875,90.2680875,12z/data=!4m6!3m5!1s0x3755b8b087026b81:0x8fa563bbd5d8c9d2!8m2!3d23.810332!4d90.4125181!16zL20vMGZzMHk?entry=ttu',
    // 2. Full URL with query param q=lat,lng
    'https://www.google.com/maps?q=23.8103,90.4125',
    // 3. Mock redirect URL (simulates a shortened URL redirecting to a long URL)
    'https://httpbin.org/redirect-to?url=https%3A%2F%2Fwww.google.com%2Fmaps%2Fplace%2FDhaka%2F%4023.7808875%2C90.2680875%2C12z&status_code=302'
  ]

  for (const url of testUrls) {
    console.log(`\nInput URL: ${url}`)
    const result = await getCoordinatesFromUrl(url)
    if (result) {
      console.log(`✅ Success! Latitude: ${result.lat}, Longitude: ${result.lng}`)
    } else {
      console.log('❌ Failed to extract coordinates.')
    }
  }
}

runTest()
