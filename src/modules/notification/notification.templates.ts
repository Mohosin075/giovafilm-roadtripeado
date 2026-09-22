import { NOTIFICATION_TEMPLATES } from './notification.constant'

export interface TemplateData {
  [key: string]: any
}

export class EmailTemplates {
  private static baseStyles = `
    <style>
      * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; }
      body { margin: 0; padding: 0; background-color: #f7f7f7; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
      .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
      .footer { padding: 20px; text-align: center; color: #666666; font-size: 12px; border-top: 1px solid #eeeeee; }
      .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
    </style>
  `

  private static header = (title: string) => `
    <div class="header">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">${title}</h1>
    </div>
  `

  private static footer = `
    <div class="footer">
      <p>© ${new Date().getFullYear()} Our Platform. All rights reserved.</p>
      <p>This email was sent to you by our platform. If you have any questions, contact us at support@ourplatform.com</p>
      <p>
        <a href="{{unsubscribeLink}}" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
        <a href="{{privacyLink}}" style="color: #667eea; text-decoration: none;">Privacy Policy</a> | 
        <a href="{{termsLink}}" style="color: #667eea; text-decoration: none;">Terms of Service</a>
      </p>
    </div>
  `

  static getTemplate(
    templateName: string,
    data: TemplateData,
  ): { subject: string; html: string } {
    const template = this.templates[templateName]
    if (!template) {
      throw new Error(`Template ${templateName} not found`)
    }

    let html = this.baseStyles
    html += `<div class="container">`
    html += this.header(template.getTitle(data))
    html += `<div class="content">`
    html += template.getBody(data)
    if (data.actionUrl && data.actionText) {
      html += `<div style="text-align: center; margin-top: 30px;">
                <a href="${data.actionUrl}" class="button">${data.actionText}</a>
              </div>`
    }
    html += `</div>`
    html += this.footer
    html += `</div>`

    return {
      subject: template.getSubject(data),
      html: this.replacePlaceholders(html, data),
    }
  }

  private static replacePlaceholders(html: string, data: TemplateData): string {
    return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match
    })
  }

  private static templates = {
    // Welcome Email
    [NOTIFICATION_TEMPLATES.WELCOME]: {
      getTitle: (data: TemplateData) =>
        `¡Bienvenido a Nuestra Plataforma, ${data.userName}!`,
      getSubject: (data: TemplateData) => `¡Bienvenido a Nuestra Plataforma!`,
      getBody: (data: TemplateData) => `
        <h2>¡Bienvenido a bordo, ${data.userName}!</h2>
        <p>Estamos muy contentos de que te unas a nuestra comunidad. Esto es lo que puedes hacer:</p>
        <ul>
          <li>Conectar con apasionados del turismo y las rutas</li>
          <li>Mantenerte al día con los mejores destinos y ofertas</li>
          <li>Acceder a mapas y contenidos exclusivos</li>
        </ul>
        <p>¡Comienza a explorar ahora y descubre todo lo que tenemos para ti!</p>
      `,
    },

    // Password Reset
    [NOTIFICATION_TEMPLATES.PASSWORD_RESET]: {
      getTitle: (data: TemplateData) => `Restablecer Contraseña`,
      getSubject: (data: TemplateData) => `Solicitud de Restablecimiento de Contraseña`,
      getBody: (data: TemplateData) => `
        <h2>Restablece tu Contraseña</h2>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
        
        <div style="background: #f0f7ff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0;"><strong>Código de Restablecimiento:</strong></p>
          <h1 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 10px 0;">${data.resetCode}</h1>
          <p style="color: #666; font-size: 14px;">Este código vencerá en ${data.expiryMinutes} minutos</p>
        </div>

        <p><strong>Instrucciones:</strong></p>
        <ol>
          <li>Ve a la pantalla de verificación</li>
          <li>Ingresa el código de restablecimiento que ves arriba</li>
          <li>Crea tu nueva contraseña</li>
        </ol>

        <p><strong>Consejos de Seguridad:</strong></p>
        <ul>
          <li>Nunca compartas tu contraseña ni tu código de verificación con nadie</li>
          <li>Crea una contraseña segura con letras, números y símbolos</li>
        </ul>

        <p>Si no solicitaste este restablecimiento de contraseña, puedes ignorar este correo con total tranquilidad.</p>
      `,
    },

    // Account Verification
    [NOTIFICATION_TEMPLATES.ACCOUNT_VERIFICATION]: {
      getTitle: (data: TemplateData) => `Verifica Tu Cuenta`,
      getSubject: (data: TemplateData) => `Verifica Tu Cuenta`,
      getBody: (data: TemplateData) => `
        <h2>Verifica tu Dirección de Correo</h2>
        <p>¡Gracias por registrarte! Por favor verifica tu dirección de correo electrónico para completar tu registro.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <p>Haz clic en el botón de abajo para verificar tu correo:</p>
          <a href="${data.verificationUrl}" class="button">Verificar Correo Electrónico</a>
        </div>

        <p style="font-size: 14px; color: #666; text-align: center;">
          O copia y pega este enlace en tu navegador:<br/>
          <span style="color: #667eea; word-break: break-all;">${data.verificationUrl}</span>
        </p>

        <p>Este enlace de verificación vencerá en 24 horas.</p>
      `,
    },
  }
}
