import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IOffer } from './offer.interface'
import { Offer } from './offer.model'
import QueryBuilder from '../../builder/QueryBuilder'
import { offerSearchableFields } from './offer.constants'

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

export const OfferService = {
  createOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
}
