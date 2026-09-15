import { translate } from '@vitalets/google-translate-api'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

async function test() {
  const text = "Bolera moderna en el corazón de Jayuya, todo un hallazgo en esta zona"
  console.log("Original text:", text)

  try {
    const res = await translate(text, { from: 'es', to: 'en' })
    console.log("Google Translate result:", res?.text)
  } catch (err: any) {
    console.error("Google Translate error:", err?.message || err)
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|en`
    const response = await axios.get(url, { timeout: 6000 })
    console.log("MyMemory result:", response.data?.responseData?.translatedText)
  } catch (err: any) {
    console.error("MyMemory error:", err?.message || err)
  }
}

test()
