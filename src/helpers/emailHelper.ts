import { Resend } from 'resend'
import config from '../config'
import { ISendEmail } from '../interfaces/email'
import fs from 'fs'
import path from 'path'

const resend = new Resend(config.email.resend_api_key)

const getSenderEmail = (): string => {
  const defaultFrom = 'Roadtripeado <noreply@roadtripeado.com>'
  const configuredFrom = config.email.from

  if (!configuredFrom) {
    return defaultFrom
  }

  // Resend requires a verified domain sender. If misconfigured with @gmail.com or missing @, fallback to verified domain
  if (configuredFrom.includes('@gmail.com') || !configuredFrom.includes('@')) {
    return defaultFrom
  }

  return configuredFrom
}

const sendEmail = async (values: ISendEmail) => {
  try {
    const attachments: any[] = []

    if (values.attachments && Array.isArray(values.attachments)) {
      for (const att of values.attachments) {
        let content = att.content
        if (
          !content &&
          att.path &&
          typeof att.path === 'string' &&
          !att.path.startsWith('http') &&
          fs.existsSync(att.path)
        ) {
          content = fs.readFileSync(att.path)
        }

        attachments.push({
          filename: att.filename,
          content,
          path:
            att.path &&
            !content &&
            typeof att.path === 'string' &&
            att.path.startsWith('http')
              ? att.path
              : undefined,
          contentType: att.contentType,
          contentId: att.contentId || att.cid,
        })
      }
    }

    // Auto-attach inline logo if template references cid:roadtripeado-logo
    if (values.html && values.html.includes('cid:roadtripeado-logo')) {
      const logoPath = path.join(process.cwd(), 'uploads/images/logo.png')
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          content: fs.readFileSync(logoPath),
          contentId: 'roadtripeado-logo',
        })
      }
    }

    const from = getSenderEmail()
    const recipients = Array.isArray(values.to)
      ? values.to
      : values.to.includes(',')
        ? values.to.split(',').map((e) => e.trim()).filter(Boolean)
        : [values.to.trim()]

    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject: values.subject,
      html: values.html,
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    if (error) {
      console.error('❌ Resend email failed:', error)
      return { success: false, error }
    }

    console.log('✅ Mail sent successfully via Resend. ID:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending email via Resend:', error)
    return { success: false, error }
  }
}

export const emailHelper = {
  sendEmail,
  resend,
}
