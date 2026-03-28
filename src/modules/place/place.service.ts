import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IPlace } from './place.interface'
import { Place } from './place.model'

const createPlace = async (payload: IPlace): Promise<IPlace> => {
  const result = await Place.create(payload)
  return result
}

const getAllPlaces = async (): Promise<IPlace[]> => {
  const result = await Place.find().populate('category')
  return result
}

const getPlaceById = async (id: string): Promise<IPlace | null> => {
  const result = await Place.findById(id).populate('category')
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
  }
  return result
}

const updatePlace = async (
  id: string,
  payload: Partial<IPlace>,
): Promise<IPlace | null> => {
  const isExist = await Place.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
  }

  const result = await Place.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate('category')
  return result
}

const deletePlace = async (id: string): Promise<IPlace | null> => {
  const isExist = await Place.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Place not found')
  }
  const result = await Place.findByIdAndDelete(id)
  return result
}

export const PlaceService = {
  createPlace,
  getAllPlaces,
  getPlaceById,
  updatePlace,
  deletePlace,
}
