import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IOffer } from './offer.interface'
import { Offer } from './offer.model'
import { OfferRedemption } from './offerRedemption.model'
import QueryBuilder from '../../builder/QueryBuilder'
import { offerSearchableFields } from './offer.constants'
import { DISCOUNT_TYPE, OFFER_STATUS } from '../../enum/offer'

const createOffer = async (payload: IOffer): Promise<IOffer> => {
  const result = await Offer.create(payload)
  return result
}

const getAllOffers = async (query: Record<string, unknown>) => {
  const offerQuery = new QueryBuilder(Offer.find().populate('place'), query)
    .search(offerSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields()

  const result = await offerQuery.modelQuery
  const meta = await offerQuery.getPaginationInfo()

  return {
    meta,
    data: result,
  }
}

const getOfferById = async (id: string): Promise<IOffer | null> => {
  const result = await Offer.findById(id).populate('place')
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }
  return result
}

const updateOffer = async (
  id: string,
  payload: Partial<IOffer>,
): Promise<IOffer | null> => {
  const isExist = await Offer.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }

  const result = await Offer.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate('place')
  return result
}

const deleteOffer = async (id: string): Promise<IOffer | null> => {
  const isExist = await Offer.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }
  const result = await Offer.findByIdAndDelete(id)
  return result
}

const calculateDiscount = async (id: string, price: number) => {
  const offer = await Offer.findById(id)
  if (!offer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }

  let discountAmount = 0
  if (offer.discountType === DISCOUNT_TYPE.PERCENTAGE) {
    const percentage = Number(offer.discountValue)
    if (!isNaN(percentage)) discountAmount = (price * percentage) / 100
  } else if (offer.discountType === DISCOUNT_TYPE.FLAT) {
    const flat = Number(offer.discountValue)
    if (!isNaN(flat)) discountAmount = flat > price ? price : flat
  }

  const finalPrice = Math.max(0, price - discountAmount)
  return { originalPrice: price, discountAmount, finalPrice }
}

const redeemOffer = async (id: string, userId: string) => {
  const offer = await Offer.findById(id)
  if (!offer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Offer not found')
  }

  if (offer.status !== OFFER_STATUS.ACTIVE) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Offer is not active')
  }

  // Check if maxRedemptions is reached
  if (offer.maxRedemptions && offer.redemptionsCount >= offer.maxRedemptions) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Offer redemption limit reached',
    )
  }

  // Check expiration date
  const now = new Date()
  if (offer.noExpiration !== true) {
    if (offer.validFrom && now < new Date(offer.validFrom)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Offer is not yet valid')
    }
    if (offer.validUntil && now > new Date(offer.validUntil)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Offer has expired')
    }
  }

  // Check if there is an active redemption (timer still running)
  const activeRedemption = await OfferRedemption.findOne({
    user: userId,
    offer: id,
    expiresAt: { $gt: new Date() },
  })

  if (activeRedemption) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have an active redemption for this offer',
    )
  }

  // Use redemptionDuration from offer model or default to 15
  const durationInMinutes = offer.redemptionDuration || 15
  const expiresAt = new Date(Date.now() + durationInMinutes * 60 * 1000)

  const redemption = await OfferRedemption.create({
    user: userId,
    offer: id,
    redemptionTime: new Date(),
    expiresAt,
  })

  // Increment redemption count
  await Offer.findByIdAndUpdate(id, { $inc: { redemptionsCount: 1 } })

  return redemption
}

export const OfferService = {
  createOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  calculateDiscount,
  redeemOffer,
}
