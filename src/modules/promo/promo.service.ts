import crypto from 'crypto'
import { Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import config from '../../config'
import stripe from '../../config/stripe'
import { emailHelper } from '../../helpers/emailHelper'
import { Map } from '../map/map.model'
import { User } from '../user/user.model'
import { Payment } from '../payment/payment.model'
import { PromoLink } from './promo.model'
import { IPromoLink } from './promo.interface'

const verifyPromoCode = async (
  code: string,
  userMapId?: string,
): Promise<IPromoLink & { mapName?: string }> => {
  const promoLink = await PromoLink.findOne({ code })
  if (!promoLink) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Promo link not found')
  }

  if (promoLink.isUsed) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This promo link has already been used',
    )
  }

  if (promoLink.expiresAt && new Date(promoLink.expiresAt) < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This promo link has expired')
  }

  // Resolve Map ID
  const mapId =
    promoLink.mapId || (userMapId ? new Types.ObjectId(userMapId) : null)
  let mapName = 'Selected Map'
  if (mapId) {
    const map = await Map.findById(mapId).select('name')
    if (map) {
      mapName = map.name
    }
  }

  return {
    ...promoLink.toObject(),
    mapName,
  }
}

const claimFreePromo = async (
  userId: string,
  code: string,
  userMapId?: string,
): Promise<{ success: boolean; message: string }> => {
  const promoDetails = await verifyPromoCode(code, userMapId)

  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  if (
    promoDetails.recipientEmail &&
    user.email?.toLowerCase() !== promoDetails.recipientEmail.toLowerCase()
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `This invitation is specifically reserved for ${promoDetails.recipientEmail}. You are logged in as ${user.email || ''}.`,
    )
  }

  if (promoDetails.price > 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This promo link requires payment and cannot be claimed for free',
    )
  }

  const mapId =
    promoDetails.mapId || (userMapId ? new Types.ObjectId(userMapId) : null)
  if (!mapId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please specify which map you want to claim',
    )
  }

  const map = await Map.findById(mapId)
  if (!map) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Selected map not found')
  }

  // Atomic update to prevent double-claiming
  const updatedPromo = await PromoLink.findOneAndUpdate(
    {
      code,
      isUsed: false,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    },
    {
      isUsed: true,
      usedBy: new Types.ObjectId(userId),
      usedAt: new Date(),
    },
    { new: true },
  )

  if (!updatedPromo) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Promo link was already claimed, expired, or invalid',
    )
  }

  // Grant map access
  await User.findByIdAndUpdate(userId, {
    $addToSet: { purchasedMaps: mapId },
  })

  return {
    success: true,
    message: `Promo claimed successfully! ${map.name} is now unlocked.`,
  }
}

const createPromoCheckoutSession = async (
  user: any,
  code: string,
  userMapId?: string,
): Promise<{ sessionId: string; url: string }> => {
  const promoDetails = await verifyPromoCode(code, userMapId)

  if (
    promoDetails.recipientEmail &&
    user.email &&
    user.email.toLowerCase() !== promoDetails.recipientEmail.toLowerCase()
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `This invitation is specifically reserved for ${promoDetails.recipientEmail}. You are logged in as ${user.email}.`,
    )
  }

  if (promoDetails.price <= 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This promo link is free, please claim it directly instead of checkout',
    )
  }

  const mapId =
    promoDetails.mapId || (userMapId ? new Types.ObjectId(userMapId) : null)
  if (!mapId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please specify which map you want to unlock',
    )
  }

  const map = await Map.findById(mapId)
  if (!map) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Selected map not found')
  }

  const amount = promoDetails.price
  const currency = 'usd'

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `Map Upgrade: ${map.name}`,
            description: `Exclusive discounted upgrade for ${map.name}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${config.clientUrl}/claim-promo?code=${code}&success=true`,
    cancel_url: `${config.clientUrl}/claim-promo?code=${code}&cancelled=true`,
    customer_email: user.email,
    metadata: {
      type: 'promo_payment',
      promoCode: code,
      userId: user.authId.toString(),
      mapId: mapId.toString(),
    },
  })

  await Payment.create({
    userId: user.authId,
    mapId: mapId,
    userEmail: user.email,
    amount,
    currency: currency.toUpperCase(),
    paymentMethod: 'stripe',
    paymentIntentId: session.id, // Store session ID for verify mapping
    status: 'pending',
    metadata: {
      type: 'promo_payment',
      promoCode: code,
      checkoutSessionId: session.id,
      mapId: mapId.toString(),
    },
  })

  return {
    sessionId: session.id,
    url: session.url!,
  }
}

const bulkGeneratePromoLinks = async (payload: {
  mapId?: string | null
  price: number
  promoType?: 'influencer' | 'upgrade' | 'custom'
  label: string
  emails?: string[]
  count?: number
  expiresAt?: string | null
}): Promise<IPromoLink[]> => {
  const { mapId, price, promoType, label, emails, count, expiresAt } = payload

  const promoLinksData: IPromoLink[] = []
  const expiration = expiresAt ? new Date(expiresAt) : null
  const resolvedType = promoType || (price === 0 ? 'influencer' : 'upgrade')

  if (emails && emails.length > 0) {
    for (const email of emails) {
      const code = crypto.randomBytes(8).toString('hex').toUpperCase()
      promoLinksData.push({
        code,
        mapId: mapId ? new Types.ObjectId(mapId) : null,
        price,
        promoType: resolvedType,
        label,
        recipientEmail: email.trim().toLowerCase(),
        isEmailSent: false,
        isUsed: false,
        expiresAt: expiration,
      })
    }
  } else {
    const limit = count || 1
    for (let i = 0; i < limit; i++) {
      const code = crypto.randomBytes(8).toString('hex').toUpperCase()
      promoLinksData.push({
        code,
        mapId: mapId ? new Types.ObjectId(mapId) : null,
        price,
        promoType: resolvedType,
        label,
        recipientEmail: null,
        isEmailSent: false,
        isUsed: false,
        expiresAt: expiration,
      })
    }
  }

  const generatedLinks = (await PromoLink.insertMany(
    promoLinksData,
  )) as unknown as IPromoLink[]
  return generatedLinks
}

const sendBulkPromoEmails = async (
  promoIds: string[],
): Promise<{ message: string }> => {
  const promoLinks = await PromoLink.find({
    _id: { $in: promoIds },
    isUsed: false,
    recipientEmail: { $ne: null },
    isEmailSent: { $ne: true },
  }).populate('mapId', 'name')

  if (promoLinks.length === 0) {
    return {
      message: 'No valid pending links with recipient emails found to process',
    }
  }

  // Trigger background email sending to prevent blocking Node event loop
  processEmailsInBackground(promoLinks)

  return {
    message: `Started sending emails to ${promoLinks.length} recipients in the background.`,
  }
}

const processEmailsInBackground = async (promoLinks: any[]) => {
  console.log(
    `Starting background bulk email job for ${promoLinks.length} recipients.`,
  )

  // Send 10 emails every 2 seconds to avoid hitting SMTP rate limits
  const BATCH_SIZE = 10
  const DELAY_MS = 2000

  for (let i = 0; i < promoLinks.length; i += BATCH_SIZE) {
    const batch = promoLinks.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async promo => {
        try {
          const mapName = promo.mapId?.name || 'exclusive map'
          const claimUrl = `${config.clientUrl}/claim-promo?code=${promo.code}`
          const isFree = promo.price === 0

          let subject = ''
          let bodyText = ''

          if (promo.promoType === 'influencer') {
            subject = `Exclusive VIP Access Invite - ${mapName}`
            bodyText = `<p>Hi there,</p>
               <p>We are thrilled to extend a special invitation to you! As a key influencer, you have been granted 100% free VIP access to the premium <strong>${mapName}</strong> on Roadtripeado.</p>
               <p>Redeem your guest pass now by clicking the link below and logging in or signing up:</p>`
          } else if (promo.promoType === 'upgrade') {
            subject = `Upgrade Your Google My Maps Access to ${mapName}`
            bodyText = `<p>Hi there,</p>
               <p>As one of our valued existing Google My Maps users, we would love to invite you to upgrade to our premium interactive road trip maps platform.</p>
               <p>You can unlock the premium <strong>${mapName}</strong> for a special upgrade fee of just <strong>$${promo.price}</strong>.</p>
               <p>To claim your upgrade, click the link below, log in or sign up, and complete the upgrade:</p>`
          } else {
            subject = `Special Map Offer: ${mapName}`
            bodyText = `<p>Hi there,</p>
               <p>We have created a special map offer for you on Roadtripeado! You can unlock the <strong>${mapName}</strong> for a customized rate of just <strong>$${promo.price}</strong>.</p>
               <p>Redeem this offer now by clicking the link below:</p>`
          }

          const emailHtml = `
            <body style="margin:0; padding:0; background-color:#F9FAFB; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB; padding: 40px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.05); border: 1px solid #E5E7EB;">
                      <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align:center;">
                          <div style="margin-bottom: 24px;">
                             <img src="${(config.clientUrl || 'https://roadtripeado.shop').replace(/\/+$/, '')}/logo.png" alt="Roadtripeado Logo" style="width:120px; height:auto; display:block; margin:0 auto;" />
                          </div>
                          <h1 style="color:#111827; font-size:24px; font-weight:700; margin:0; line-height: 1.2;">Your Exclusive Access Link</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 40px 40px 40px; text-align:center;">
                          ${bodyText}
                          <div style="margin: 32px 0;">
                            <a href="${claimUrl}" style="display:inline-block; background-color:#FFC107; color:#000000; padding:16px 40px; border-radius:10px; text-decoration:none; font-weight:700; font-size:16px; box-shadow: 0 4px 6px rgba(255, 193, 7, 0.2);">Access Map Now</a>
                          </div>
                          <p style="color:#777777; font-size:13px; margin: 24px 0 0 0;">If the button doesn't work, you can copy and paste this URL into your browser:</p>
                          <p style="word-break: break-all; font-size:12px; color:#FFC107;"><a href="${claimUrl}" style="color:#FFC107; text-decoration:underline;">${claimUrl}</a></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#F9FAFB; padding:24px; text-align:center; font-size:12px; color:#6B7280;">&copy; ${new Date().getFullYear()} Roadtripeado. All rights reserved.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          `

          await emailHelper.sendEmail({
            to: promo.recipientEmail,
            subject,
            html: emailHtml,
          })

          await PromoLink.findByIdAndUpdate(promo._id, {
            isEmailSent: true,
            emailSentAt: new Date(),
          });
          console.log(
            `Successfully sent promo email to: ${promo.recipientEmail} for code: ${promo.code}`,
          )
        } catch (err) {
          console.error(
            `Failed to send bulk promo email to: ${promo.recipientEmail}`,
            err,
          )
        }
      }),
    )

    // Wait between batches to prevent spam/throttling
    if (i + BATCH_SIZE < promoLinks.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }

  console.log(`Background bulk email job completed.`)
}

const getAllPromoLinks = async (query: any): Promise<any> => {
  const { page = 1, limit = 10, searchTerm = '', isUsed, mapId, promoType } = query
  const skip = (Number(page) - 1) * Number(limit)

  const filter: any = {}

  if (searchTerm) {
    filter.$or = [
      { code: { $regex: searchTerm, $options: 'i' } },
      { label: { $regex: searchTerm, $options: 'i' } },
      { recipientEmail: { $regex: searchTerm, $options: 'i' } },
    ]
  }

  if (isUsed !== undefined && isUsed !== '') {
    filter.isUsed = isUsed === 'true'
  }

  if (mapId) {
    filter.mapId = new Types.ObjectId(mapId)
  }

  if (promoType) {
    filter.promoType = promoType
  }

  const [data, total] = await Promise.all([
    PromoLink.find(filter)
      .populate('mapId', 'name')
      .populate('usedBy', 'name email')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    PromoLink.countDocuments(filter),
  ])

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
    data,
  }
}

const deletePromoLink = async (id: string): Promise<IPromoLink | null> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid promo link ID')
  }
  const result = await PromoLink.findByIdAndDelete(id)
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Promo link not found')
  }
  return result
}

const getPromoStats = async (): Promise<any> => {
  const [total, used, unused, influencer, upgrade, emailSent, pendingEmail] = await Promise.all([
    PromoLink.countDocuments(),
    PromoLink.countDocuments({ isUsed: true }),
    PromoLink.countDocuments({ isUsed: false }),
    PromoLink.countDocuments({ promoType: 'influencer' }),
    PromoLink.countDocuments({ promoType: 'upgrade' }),
    PromoLink.countDocuments({ isEmailSent: true }),
    PromoLink.countDocuments({ isUsed: false, recipientEmail: { $ne: null }, $or: [{ isEmailSent: false }, { isEmailSent: { $exists: false } }] }),
  ])

  return {
    total,
    used,
    unused,
    influencer,
    upgrade,
    emailSent,
    pendingEmail,
  }
}

export const PromoServices = {
  verifyPromoCode,
  claimFreePromo,
  createPromoCheckoutSession,
  bulkGeneratePromoLinks,
  sendBulkPromoEmails,
  getAllPromoLinks,
  deletePromoLink,
  getPromoStats,
}
