import { NextFunction, Request, Response } from 'express'
import { AnyZodObject, ZodEffects } from 'zod'

const validateRequest =
  (schema: AnyZodObject | ZodEffects<AnyZodObject>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      })

      req.body = result.body
      req.query = result.query
      req.params = result.params
      req.cookies = result.cookies

      return next()
    } catch (error) {
      next(error)
    }
  }

export default validateRequest
