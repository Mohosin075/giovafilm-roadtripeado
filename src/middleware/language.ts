import { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      lang: 'en' | 'es'
    }
  }
}

/**
 * Middleware to extract preferred language ('en' | 'es') from:
 * 1. Query parameter `?lang=en` or `?lang=es`
 * 2. Header `Accept-Language: en` or `Accept-Language: es`
 * Defaults to 'es' (since existing project data & primary audience is Spanish).
 */
export const languageMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const queryLang = (req.query.lang as string)?.toLowerCase()
  const acceptLang = req.headers['accept-language']?.toLowerCase()

  let selectedLang: 'en' | 'es' = 'es'

  if (queryLang === 'en' || queryLang === 'es') {
    selectedLang = queryLang
  } else if (acceptLang) {
    if (acceptLang.startsWith('en')) {
      selectedLang = 'en'
    } else if (acceptLang.startsWith('es')) {
      selectedLang = 'es'
    }
  }

  req.lang = selectedLang
  next()
}
