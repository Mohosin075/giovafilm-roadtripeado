import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IBusiness, BusinessStatus } from './business.interface'
import { Business } from './business.model'
import { Offer } from '../offer/offer.model'
import QueryBuilder from '../../builder/QueryBuilder'
import { businessSearchableFields } from './business.constants'
import { OFFER_STATUS } from '../../enum/offer'

/**
 * Creates a new business listing and sets it as Pending.
 * @param payload The business data to be created
 * @returns The newly created business document
 */

const createBusiness = async (payload: IBusiness): Promise<IBusiness> => {
  payload.status = 'Pending' // Always start as pending until admin approves
  const result = await Business.create(payload)
  return result
}

/**
 * Retrieves all businesses with support for queries (search, filter, sort, pagination).
 * @param query The query parameters from the request
 * @returns Paginated list of businesses and metadata
 */
const getAllBusinesses = async (query: Record<string, unknown>) => {
  const businessQuery = new QueryBuilder(Business.find().populate('user category'), query)
    .search(businessSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields()

  const result = await businessQuery.modelQuery
  const meta = await businessQuery.getPaginationInfo()

  return {
    meta,
    data: result,
  }
}

/**
 * Retrieves a single business by its ID.
 * @param id The business document ID
 * @returns The business document or throws a NotFound error
 */
const getBusinessById = async (id: string): Promise<IBusiness | null> => {
  const result = await Business.findById(id).populate('user category')
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }
  return result
}

/**
 * Updates an existing business listing.
 * @param id The business document ID
 * @param payload The fields to update
 * @returns The updated business document or throws an error if not found
 */
const updateBusiness = async (
  id: string,
  payload: Partial<IBusiness>,
): Promise<IBusiness | null> => {
  const isExist = await Business.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }
  const result = await Business.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate('user category')
  return result
}

/**
 * Updates the approval status of a business listing (e.g., Pending, Approved, Rejected).
 * @param id The business document ID
 * @param status The new status value
 * @returns The updated business document
 */
const updateBusinessStatus = async (
  id: string,
  status: BusinessStatus,
): Promise<IBusiness | null> => {
  const isExist = await Business.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }

  const result = await Business.findByIdAndUpdate(
    id,
    { status },
    {
      new: true,
      runValidators: true,
    },
  ).populate('user category')
  return result
}

/**
 * Deletes a business listing permanently.
 * @param id The business document ID
 * @returns The deleted business document
 */
const deleteBusiness = async (id: string): Promise<IBusiness | null> => {
  const isExist = await Business.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }
  const result = await Business.findByIdAndDelete(id)
  return result
}

const getBusinessStats = async (businessId: string) => {
  const business = await Business.findById(businessId)
  if (!business) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }

  // Get all offers for this business and sum their redemptions
  const offers = await Offer.find({ business: businessId })
  const totalOfferRedemptions = offers.reduce(
    (acc, offer) => acc + (offer.redemptionsCount || 0),
    0,
  )

  return {
    viewCount: business.viewCount || 0,
    totalOfferRedemptions,
    activeOffersCount: offers.filter(o => o.status === OFFER_STATUS.ACTIVE).length,
  }
}

const incrementViewCount = async (id: string) => {
  return await Business.findByIdAndUpdate(
    id,
    { $inc: { viewCount: 1 } },
    { new: true },
  )
}

export const BusinessService = {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  updateBusinessStatus,
  deleteBusiness,
  getBusinessStats,
  incrementViewCount,
}
