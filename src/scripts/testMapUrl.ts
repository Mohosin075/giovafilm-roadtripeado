import { getCoordinatesFromUrl } from '../utils/mapHelper'

const tests = [
  'https://maps.app.goo.gl/BvmCgmNtgYRAE7Ki6',
  'https://www.google.com/maps/search/23.764717,+90.319324?entry=tts',
  'https://www.google.com/maps/place/Dhaka/@23.7808875,90.2680875,12z/data=!4m6!3m5!1s0x3755b8b087026b81:0x8fa563bbd5d8c9d2!8m2!3d23.810332!4d90.4125181',
  'https://www.google.com/maps?q=23.8103,90.4125',
  'https://www.google.com/maps?q=18.4861,-69.9312',
  'https://maps.google.com/?q=18.486058,-69.931212',
  'https://www.google.com/maps/dir/23.8103,90.4125/',
  'https://www.google.com/maps/place/Santo+Domingo/@18.4861,-69.9312,12z',
  'maps.app.goo.gl/BvmCgmNtgYRAE7Ki6',
]

async function run() {
  for (const url of tests) {
    try {
      const result = await getCoordinatesFromUrl(url)
      console.log(result ? `OK  ${result.lat}, ${result.lng}` : 'FAIL', '-', url)
    } catch (error: any) {
      console.log('ERROR', error.message, '-', url)
    }
  }
}

run()
