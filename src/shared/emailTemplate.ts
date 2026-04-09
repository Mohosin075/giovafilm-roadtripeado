import { ICreateAccount, IResetPassword } from '../interfaces/emailTemplate'

const createAccount = (values: ICreateAccount) => {
  return {
    to: values.email,
    subject: `Verify your account, ${values.name}`,
    html: `     <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">         <tr>           <td align="center">             <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">               <tr>                 <td style="padding: 30px; text-align:center;">                   <img src="/images/logo.png" alt="Company Logo" style="width:140px; height:auto; display:block; margin:0 auto;">                 </td>               </tr>               <tr>                 <td style="padding: 40px; text-align:center;">                   <h1 style="color:#2c3e50; font-size:26px; margin:0 0 20px;">Verify Your Account</h1>                   <p style="color:#555555; font-size:16px; margin:0 0 30px;">Hi ${values.name}, please use the code below to verify your account.</p>                   <div style="display:inline-block; font-size:32px; font-weight:bold; color:#2980b9; background:#f1f3f6; padding:20px 40px; border-radius:8px; box-shadow: inset 0 3px 6px rgba(0,0,0,0.05); margin-bottom:30px;">${values.otp}</div>                   <p style="color:#777777; font-size:14px; margin:0;">This code expires in 5 minutes. If you did not request this, please ignore this email.</p>                 </td>               </tr>               <tr>                 <td style="background:#f9fafc; padding:20px; text-align:center; font-size:12px; color:#999999;">
                                  </td>               </tr>             </table>           </td>         </tr>       </table>     </body>
    `,
  }
}

const resetPassword = (values: IResetPassword) => {
  return {
    to: values.email,
    subject: `Reset your password, ${values.name}`,
    html: `     <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">         <tr>           <td align="center">             <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">               <tr>                 <td style="padding: 30px; text-align:center;">                   <img src="/images/logo.png" alt="Company Logo" style="width:140px; height:auto; display:block; margin:0 auto;">                 </td>               </tr>               <tr>                 <td style="padding: 40px; text-align:center;">                   <h1 style="color:#2c3e50; font-size:26px; margin:0 0 20px;">Reset Your Password</h1>                   <p style="color:#555555; font-size:16px; margin:0 0 30px;">Hi ${values.name}, please use the code below to reset your password.</p>                   <div style="display:inline-block; font-size:32px; font-weight:bold; color:#2980b9; background:#f1f3f6; padding:20px 40px; border-radius:8px; box-shadow: inset 0 3px 6px rgba(0,0,0,0.05); margin-bottom:30px;">${values.otp}</div>                   <p style="color:#777777; font-size:14px; margin:0;">This code expires in 5 minutes. If you did not request this, please ignore this email.</p>                 </td>               </tr>               <tr>                 <td style="background:#f9fafc; padding:20px; text-align:center; font-size:12px; color:#999999;">
                                  </td>               </tr>             </table>           </td>         </tr>       </table>     </body>
    `,
  }
}

const resendOtp = (values: {
  email: string
  name: string
  otp: string
  type: 'resetPassword' | 'createAccount'
}) => {
  const isReset = values.type === 'resetPassword'
  return {
    to: values.email,
    subject: `${isReset ? 'Password Reset' : 'Account Verification'} - New Code`,
    html: `     <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">         <tr>           <td align="center">             <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">               <tr>                 <td style="padding: 30px; text-align:center;">                   <img src="/images/logo.png" alt="Company Logo" style="width:140px; height:auto; display:block; margin:0 auto;">                 </td>               </tr>               <tr>                 <td style="padding: 40px; text-align:center;">                   <h1 style="color:#2c3e50; font-size:26px; margin:0 0 20px;">New ${isReset ? 'Password Reset' : 'Account Verification'} Code</h1>                   <p style="color:#555555; font-size:16px; margin:0 0 30px;">Hi ${values.name}, you requested a new ${isReset ? 'password reset' : 'verification'} code:</p>                   <div style="display:inline-block; font-size:32px; font-weight:bold; color:#2980b9; background:#f1f3f6; padding:20px 40px; border-radius:8px; box-shadow: inset 0 3px 6px rgba(0,0,0,0.05); margin-bottom:30px;">${values.otp}</div>                   <p style="color:#777777; font-size:14px; margin:0;">This code expires in 5 minutes. Please do not share it with anyone.</p>                 </td>               </tr>               <tr>                 <td style="background:#f9fafc; padding:20px; text-align:center; font-size:12px; color:#999999;">
                                  </td>               </tr>             </table>           </td>         </tr>       </table>     </body>
    `,
  }
}

const subscriptionWelcome = (values: {
  name: string
  email: string
  planName: string
  planPrice: number
  planInterval: string
  isTrialing: boolean
  trialDays?: number
  trialEndDate?: Date
  features: string[]
  dashboardUrl: string
}) => {
  return {
    to: values.email,
    subject: `Welcome to ${values.planName} Plan!`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#2980b9;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Welcome to ${values.planName}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Thank you for subscribing to our <strong>${values.planName}</strong> plan!</p>
                    
                    ${
                      values.isTrialing
                        ? `
                    <div style="background:#e8f4fd; padding:20px; border-radius:8px; margin-bottom:20px;">
                      <p style="color:#2980b9; font-weight:bold; margin:0 0 10px;">Your free trial has started!</p>
                      <p style="color:#555555; margin:0;">You have ${values.trialDays} days to explore all features. Your trial ends on ${values.trialEndDate?.toLocaleDateString()}.</p>
                    </div>
                    `
                        : ''
                    }

                    <p style="color:#2c3e50; font-size:18px; font-weight:bold; margin:0 0 15px;">Plan Details:</p>
                    <ul style="color:#555555; font-size:15px; line-height:1.6; margin:0 0 30px;">
                      <li><strong>Plan:</strong> ${values.planName}</li>
                      <li><strong>Price:</strong> $${values.planPrice}/${values.planInterval}</li>
                    </ul>

                    <p style="color:#2c3e50; font-size:18px; font-weight:bold; margin:0 0 15px;">Features Included:</p>
                    <ul style="color:#555555; font-size:15px; line-height:1.6; margin:0 0 30px;">
                      ${values.features.map(f => `<li>${f}</li>`).join('')}
                    </ul>

                    <div style="text-align:center;">
                      <a href="${values.dashboardUrl}" style="display:inline-block; background:#2980b9; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Go to Dashboard</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const trialEnding = (values: {
  name: string
  email: string
  planName: string
  trialEndDate: Date
  daysLeft: number
  planPrice: number
  planInterval: string
  upgradeUrl: string
}) => {
  return {
    to: values.email,
    subject: `Your free trial of ${values.planName} is ending soon!`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#e67e22;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Trial Ending Soon</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Your free trial of the <strong>${values.planName}</strong> plan will end in <strong>${values.daysLeft} days</strong> (on ${values.trialEndDate.toLocaleDateString()}).</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 30px;">To ensure uninterrupted access to all features, please upgrade to a paid subscription before your trial expires.</p>
                    <div style="text-align:center;">
                      <a href="${values.upgradeUrl}" style="display:inline-block; background:#e67e22; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Upgrade Now</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const paymentSuccess = (values: {
  name: string
  email: string
  invoiceNumber: string
  amount: number | string
  currency: string
  paymentDate: Date
  nextPaymentDate: Date
  invoiceUrl?: string
  dashboardUrl: string
}) => {
  return {
    to: values.email,
    subject: `Payment Successful - Invoice ${values.invoiceNumber}`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#27ae60;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Payment Successful</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">We've successfully processed your payment of <strong>${values.currency.toUpperCase()} ${values.amount}</strong>.</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;"><strong>Invoice:</strong> ${values.invoiceNumber}</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;"><strong>Date:</strong> ${values.paymentDate.toLocaleDateString()}</p>
                    ${
                      values.invoiceUrl
                        ? `
                    <div style="text-align:center; margin-top:30px;">
                      <a href="${values.invoiceUrl}" style="display:inline-block; background:#27ae60; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">View Invoice</a>
                    </div>
                    `
                        : ''
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const paymentFailed = (values: {
  name: string
  email: string
  planName: string
  amount: number | string
  currency: string
  failureReason: string
  retryDate: Date
  updatePaymentUrl: string
  dashboardUrl: string
}) => {
  return {
    to: values.email,
    subject: `Payment Failed - Action Required`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#c0392b;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Payment Failed</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">We were unable to process your payment of <strong>${values.currency.toUpperCase()} ${values.amount}</strong> for your subscription.</p>
                    <p style="color:#c0392b; font-weight:bold; margin:0 0 20px;">Reason: ${values.failureReason}</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 30px;">We will attempt to process the payment again on ${values.retryDate.toLocaleDateString()}. Please update your payment information to avoid service interruption.</p>
                    <div style="text-align:center;">
                      <a href="${values.updatePaymentUrl}" style="display:inline-block; background:#c0392b; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Update Payment Method</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const subscriptionCanceled = (values: {
  name: string
  email: string
  planName: string
  canceledAt: Date
  accessUntil: Date
  feedbackUrl: string
  reactivateUrl: string
}) => {
  return {
    to: values.email,
    subject: `Subscription Canceled - ${values.planName}`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#7f8c8d;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Subscription Canceled</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Your subscription to <strong>${values.planName}</strong> has been canceled.</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">You will continue to have access until <strong>${values.accessUntil.toLocaleDateString()}</strong>.</p>
                    <div style="text-align:center; margin-top:30px;">
                      <a href="${values.reactivateUrl}" style="display:inline-block; background:#2980b9; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Reactivate Subscription</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const planChange = (values: {
  name: string
  email: string
  newPlanName: string
  newPlanPrice: number
  planInterval: string
  isUpgrade: boolean
  priceDifference: number
  prorationNote: string
  features: string[]
  dashboardUrl: string
  billingUrl: string
}) => {
  return {
    to: values.email,
    subject: `Your plan has been updated to ${values.newPlanName}`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#8e44ad;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Plan Updated</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Your subscription has been updated to the <strong>${values.newPlanName}</strong> plan.</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">${values.prorationNote}</p>
                    <div style="text-align:center; margin-top:30px;">
                      <a href="${values.dashboardUrl}" style="display:inline-block; background:#8e44ad; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Go to Dashboard</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const userInvitation = (values: { email: string; role: string; otp: string }) => {
  return {
    to: values.email,
    subject: `You have been invited to join as ${values.role}`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center;">
                    <img src="/images/logo.png" alt="Company Logo" style="width:140px; height:auto; display:block; margin:0 auto;">
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px; text-align:center;">
                    <h1 style="color:#2c3e50; font-size:26px; margin:0 0 20px;">Invitation to Join</h1>
                    <p style="color:#555555; font-size:16px; margin:0 0 30px;">You have been invited to join our platform as <strong>${values.role}</strong>.</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Please use the code below to set up your account and password.</p>
                    <div style="display:inline-block; font-size:32px; font-weight:bold; color:#2980b9; background:#f1f3f6; padding:20px 40px; border-radius:8px; box-shadow: inset 0 3px 6px rgba(0,0,0,0.05); margin-bottom:30px;">${values.otp}</div>
                    <p style="color:#777777; font-size:14px; margin:0;">This invitation code will expire in 24 hours. If you were not expecting this invitation, please ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafc; padding:20px; text-align:center; font-size:12px; color:#999999;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

export const emailTemplate = {
  createAccount,
  resetPassword,
  resendOtp,
  subscriptionWelcome,
  trialEnding,
  paymentSuccess,
  paymentFailed,
  subscriptionCanceled,
  planChange,
  userInvitation,
}
