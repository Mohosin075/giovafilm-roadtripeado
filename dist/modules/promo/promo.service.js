"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoServices = void 0;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = require("mongoose");
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const config_1 = __importDefault(require("../../config"));
const stripe_1 = __importDefault(require("../../config/stripe"));
const emailHelper_1 = require("../../helpers/emailHelper");
const map_model_1 = require("../map/map.model");
const user_model_1 = require("../user/user.model");
const payment_model_1 = require("../payment/payment.model");
const promo_model_1 = require("./promo.model");
const verifyPromoCode = async (code, userMapId) => {
    const promoLink = await promo_model_1.PromoLink.findOne({ code });
    if (!promoLink) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Promo link not found');
    }
    if (promoLink.isUsed) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This promo link has already been used');
    }
    if (promoLink.expiresAt && new Date(promoLink.expiresAt) < new Date()) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This promo link has expired');
    }
    // Resolve Map ID
    const mapId = promoLink.mapId || (userMapId ? new mongoose_1.Types.ObjectId(userMapId) : null);
    let mapName = 'Selected Map';
    if (mapId) {
        const map = await map_model_1.Map.findById(mapId).select('name');
        if (map) {
            mapName = map.name;
        }
    }
    return {
        ...promoLink.toObject(),
        mapName,
    };
};
const claimFreePromo = async (userId, code, userMapId) => {
    const promoDetails = await verifyPromoCode(code, userMapId);
    if (promoDetails.price > 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This promo link requires payment and cannot be claimed for free');
    }
    const mapId = promoDetails.mapId || (userMapId ? new mongoose_1.Types.ObjectId(userMapId) : null);
    if (!mapId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Please specify which map you want to claim');
    }
    const map = await map_model_1.Map.findById(mapId);
    if (!map) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Selected map not found');
    }
    // Atomic update to prevent double-claiming
    const updatedPromo = await promo_model_1.PromoLink.findOneAndUpdate({
        code,
        isUsed: false,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }, {
        isUsed: true,
        usedBy: new mongoose_1.Types.ObjectId(userId),
        usedAt: new Date(),
    }, { new: true });
    if (!updatedPromo) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Promo link was already claimed, expired, or invalid');
    }
    // Grant map access
    await user_model_1.User.findByIdAndUpdate(userId, {
        $addToSet: { purchasedMaps: mapId },
    });
    return {
        success: true,
        message: `Promo claimed successfully! ${map.name} is now unlocked.`,
    };
};
const createPromoCheckoutSession = async (user, code, userMapId) => {
    const promoDetails = await verifyPromoCode(code, userMapId);
    if (promoDetails.price <= 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This promo link is free, please claim it directly instead of checkout');
    }
    const mapId = promoDetails.mapId || (userMapId ? new mongoose_1.Types.ObjectId(userMapId) : null);
    if (!mapId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Please specify which map you want to unlock');
    }
    const map = await map_model_1.Map.findById(mapId);
    if (!map) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Selected map not found');
    }
    const amount = promoDetails.price;
    const currency = 'usd';
    const session = await stripe_1.default.checkout.sessions.create({
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
        success_url: `${config_1.default.clientUrl}/claim-promo?code=${code}&success=true`,
        cancel_url: `${config_1.default.clientUrl}/claim-promo?code=${code}&cancelled=true`,
        customer_email: user.email,
        metadata: {
            type: 'promo_payment',
            promoCode: code,
            userId: user.authId.toString(),
            mapId: mapId.toString(),
        },
    });
    await payment_model_1.Payment.create({
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
    });
    return {
        sessionId: session.id,
        url: session.url,
    };
};
const bulkGeneratePromoLinks = async (payload) => {
    const { mapId, price, promoType, label, emails, count, expiresAt } = payload;
    const promoLinksData = [];
    const expiration = expiresAt ? new Date(expiresAt) : null;
    const resolvedType = promoType || (price === 0 ? 'influencer' : 'upgrade');
    if (emails && emails.length > 0) {
        for (const email of emails) {
            const code = crypto_1.default.randomBytes(8).toString('hex').toUpperCase();
            promoLinksData.push({
                code,
                mapId: mapId ? new mongoose_1.Types.ObjectId(mapId) : null,
                price,
                promoType: resolvedType,
                label,
                recipientEmail: email.trim().toLowerCase(),
                isUsed: false,
                expiresAt: expiration,
            });
        }
    }
    else {
        const limit = count || 1;
        for (let i = 0; i < limit; i++) {
            const code = crypto_1.default.randomBytes(8).toString('hex').toUpperCase();
            promoLinksData.push({
                code,
                mapId: mapId ? new mongoose_1.Types.ObjectId(mapId) : null,
                price,
                promoType: resolvedType,
                label,
                recipientEmail: null,
                isUsed: false,
                expiresAt: expiration,
            });
        }
    }
    const generatedLinks = (await promo_model_1.PromoLink.insertMany(promoLinksData));
    return generatedLinks;
};
const sendBulkPromoEmails = async (promoIds) => {
    const promoLinks = await promo_model_1.PromoLink.find({
        _id: { $in: promoIds },
        isUsed: false,
        recipientEmail: { $ne: null },
    }).populate('mapId', 'name');
    if (promoLinks.length === 0) {
        return {
            message: 'No valid pending links with recipient emails found to process',
        };
    }
    // Trigger background email sending to prevent blocking Node event loop
    processEmailsInBackground(promoLinks);
    return {
        message: `Started sending emails to ${promoLinks.length} recipients in the background.`,
    };
};
const processEmailsInBackground = async (promoLinks) => {
    console.log(`Starting background bulk email job for ${promoLinks.length} recipients.`);
    // Send 10 emails every 2 seconds to avoid hitting SMTP rate limits
    const BATCH_SIZE = 10;
    const DELAY_MS = 2000;
    for (let i = 0; i < promoLinks.length; i += BATCH_SIZE) {
        const batch = promoLinks.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (promo) => {
            var _a;
            try {
                const mapName = ((_a = promo.mapId) === null || _a === void 0 ? void 0 : _a.name) || 'exclusive map';
                const claimUrl = `${config_1.default.clientUrl}/claim-promo?code=${promo.code}`;
                const isFree = promo.price === 0;
                let subject = '';
                let bodyText = '';
                if (promo.promoType === 'influencer') {
                    subject = `Exclusive VIP Access Invite - ${mapName}`;
                    bodyText = `<p>Hi there,</p>
               <p>We are thrilled to extend a special invitation to you! As a key influencer, you have been granted 100% free VIP access to the premium <strong>${mapName}</strong> on Roadtripeado.</p>
               <p>Redeem your guest pass now by clicking the link below and logging in or signing up:</p>`;
                }
                else if (promo.promoType === 'upgrade') {
                    subject = `Upgrade Your Google My Maps Access to ${mapName}`;
                    bodyText = `<p>Hi there,</p>
               <p>As one of our valued existing Google My Maps users, we would love to invite you to upgrade to our premium interactive road trip maps platform.</p>
               <p>You can unlock the premium <strong>${mapName}</strong> for a special upgrade fee of just <strong>$${promo.price}</strong>.</p>
               <p>To claim your upgrade, click the link below, log in or sign up, and complete the upgrade:</p>`;
                }
                else {
                    subject = `Special Map Offer: ${mapName}`;
                    bodyText = `<p>Hi there,</p>
               <p>We have created a special map offer for you on Roadtripeado! You can unlock the <strong>${mapName}</strong> for a customized rate of just <strong>$${promo.price}</strong>.</p>
               <p>Redeem this offer now by clicking the link below:</p>`;
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
                             <img src="${config_1.default.clientUrl}/logo.png" alt="Roadtripeado Logo" style="width:120px; height:auto; display:block; margin:0 auto;" onerror="this.style.display='none'">
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
          `;
                await emailHelper_1.emailHelper.sendEmail({
                    to: promo.recipientEmail,
                    subject,
                    html: emailHtml,
                });
                console.log(`Successfully sent promo email to: ${promo.recipientEmail} for code: ${promo.code}`);
            }
            catch (err) {
                console.error(`Failed to send bulk promo email to: ${promo.recipientEmail}`, err);
            }
        }));
        // Wait between batches to prevent spam/throttling
        if (i + BATCH_SIZE < promoLinks.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }
    console.log(`Background bulk email job completed.`);
};
const getAllPromoLinks = async (query) => {
    const { page = 1, limit = 10, searchTerm = '', isUsed, mapId, promoType } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};
    if (searchTerm) {
        filter.$or = [
            { code: { $regex: searchTerm, $options: 'i' } },
            { label: { $regex: searchTerm, $options: 'i' } },
            { recipientEmail: { $regex: searchTerm, $options: 'i' } },
        ];
    }
    if (isUsed !== undefined && isUsed !== '') {
        filter.isUsed = isUsed === 'true';
    }
    if (mapId) {
        filter.mapId = new mongoose_1.Types.ObjectId(mapId);
    }
    if (promoType) {
        filter.promoType = promoType;
    }
    const [data, total] = await Promise.all([
        promo_model_1.PromoLink.find(filter)
            .populate('mapId', 'name')
            .populate('usedBy', 'name email')
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 }),
        promo_model_1.PromoLink.countDocuments(filter),
    ]);
    return {
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
        },
        data,
    };
};
exports.PromoServices = {
    verifyPromoCode,
    claimFreePromo,
    createPromoCheckoutSession,
    bulkGeneratePromoLinks,
    sendBulkPromoEmails,
    getAllPromoLinks,
};
