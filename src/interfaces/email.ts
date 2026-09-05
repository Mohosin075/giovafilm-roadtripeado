export type ISendEmail = {
  to: string | string[]
  subject: string
  html: string
  attachments?: any[]
}
