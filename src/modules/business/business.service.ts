import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IBusiness, BusinessStatus } from './business.interface'
import { Business } from './business.model'
import QueryBuilder from '../../builder/QueryBuilder'

const createBusiness = async (payload: IBusiness): Promise<IBusiness> => {
  payload.status = 'Pending' // Always start as pending until admin approves
  const result = await Business.create(payload)
  return result
}

const getAllBusinesses = async (query: Record<string, unknown>) => {
  const businessQuery = new QueryBuilder(Business.find().populate('user category'), query)
    .search(['name', 'description'])
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

const getBusinessById = async (id: string): Promise<IBusiness | null> => {
  const result = await Business.findById(id).populate('user category')
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }
  return result
}

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

const deleteBusiness = async (id: string): Promise<IBusiness | null> => {
  const isExist = await Business.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Business not found')
  }
  const result = await Business.findByIdAndDelete(id)
  return result
}

export const BusinessService = {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  updateBusinessStatus,
  deleteBusiness,
}
