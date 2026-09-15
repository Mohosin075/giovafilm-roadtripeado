import { autoTranslateField } from '../utils/autoTranslate'

async function test() {
  const duplicate = {
    en: "Bolera moderna en el corazón de Jayuya, todo un hallazgo en esta zona",
    es: "Bolera moderna en el corazón de Jayuya, todo un hallazgo en esta zona"
  }

  console.log("Input duplicate:", duplicate)
  const result = await autoTranslateField(duplicate)
  console.log("Result autoTranslateField:", result)
}

test()
