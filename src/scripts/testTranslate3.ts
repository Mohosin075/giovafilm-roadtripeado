import axios from 'axios'

async function testMyMemory() {
  const tests = [
    { text: "Bolera moderna en el corazón de Jayuya, todo un hallazgo en esta zona", from: 'es', to: 'en' },
    { text: "Kayak Rental Balneario La Monserrate De", from: 'es', to: 'en' },
    { text: "Playa Flamenco es una hermosa playa de arena blanca ubicada en la isla de Culebra, Puerto Rico.", from: 'es', to: 'en' },
    { text: "Beautiful waterfall with clear blue water perfect for swimming and hiking.", from: 'en', to: 'es' }
  ]

  for (const t of tests) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t.text)}&langpair=${t.from}|${t.to}&de=dev@giovafilm.com`
    try {
      const res = await axios.get(url, { timeout: 5000 })
      console.log(`[${t.from}->${t.to}] "${t.text}" => "${res.data?.responseData?.translatedText}"`)
    } catch (e: any) {
      console.log(`Error on "${t.text}":`, e.message)
    }
  }
}

testMyMemory()
