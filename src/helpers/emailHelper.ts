import nodemailer from 'nodemailer'
import config from '../config'
import { ISendEmail } from '../interfaces/email'

import fs from 'fs'
import path from 'path'

// Default: verify TLS in production. Override with EMAIL_TLS_REJECT_UNAUTHORIZED=false if SMTP uses self-signed certs.
const rejectUnauthorized =
  process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== undefined
    ? process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false'
    : config.node_env === 'production'

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: Number(config.email.port),
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
  tls: {
    rejectUnauthorized,
  },
})

const sendEmail = async (values: ISendEmail) => {
  try {
    const attachments: any[] = values.attachments ? [...values.attachments] : []

    // Auto-attach inline logo if template references cid:roadtripeado-logo
    if (values.html && values.html.includes('cid:roadtripeado-logo')) {
      const logoPath = path.join(process.cwd(), 'uploads/images/logo.png')
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'logo.png',
          path: logoPath,
          cid: 'roadtripeado-logo',
        })
      }
    }

    const info = await transporter.sendMail({
      from: config.email.from,
      to: values.to,
      subject: values.subject,
      html: values.html,
      attachments,
    })

    console.log('Mail send successfully', info.accepted)
  } catch (error) {
    console.log({ error })
    console.error('Email', error)
  }
}

export const emailHelper = {
  sendEmail,
}
