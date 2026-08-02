import nodemailer from 'nodemailer'
import config from '../config'
import { ISendEmail } from '../interfaces/email'

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
    const info = await transporter.sendMail({
      from: config.email.from,
      to: values.to,
      subject: values.subject,
      html: values.html,
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
