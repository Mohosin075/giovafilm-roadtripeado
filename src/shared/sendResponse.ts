import { Response } from 'express'
import { translateMessage } from '../helpers/translateMessage'

type IApiResponse<T> = {
  statusCode: number
  success: boolean
  message?: string | null
  meta?: {
    page: number
    limit: number
    total: number
  }
  data?: T | null
}
const sendResponse = <T>(res: Response, data: IApiResponse<T>): void => {
  const lang = (res.req as any)?.lang || 'es'
  const localizedMessage = data.message ? translateMessage(data.message, lang) : null

  const responseData: IApiResponse<T> = {
    statusCode: data.statusCode,
    success: data.success,
    message: localizedMessage,
    meta: data.meta,
    data: data.data || null,
  }
  res.status(data.statusCode).json(responseData)
}
export default sendResponse
