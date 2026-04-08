import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { IFaq, IPublic } from './public.interface'
import { Faq, Public } from './public.model'

const createPublic = async (payload: IPublic) => {
  const isExist = await Public.findOne({
    type: payload.type,
  })
  if (isExist) {
    await Public.findByIdAndUpdate(
      isExist._id,
      {
        $set: {
          content: payload.content,
        },
      },
      {
        new: true,
      },
    )
  } else {
    const result = await Public.create(payload)

    if (!result)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Public')
  }

  return `${payload.type} created successfully}`
}

const getAllPublics = async (
  type: 'privacy-policy' | 'terms-and-condition',
) => {
  const result = await Public.findOne({ type: type }).lean()
  return result || null
}

const deletePublic = async (id: string) => {
  const result = await Public.findByIdAndDelete(id)
  return result
}

const createFaq = async (payload: IFaq) => {
  const result = await Faq.create(payload)
  if (!result)
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Faq')
  // redisClient.del(`public:${RedisKeys.FAQ}`)
  return result
}

const getAllFaqs = async () => {
  const result = await Faq.find({})
  return result || []
}

const getSingleFaq = async (id: string) => {
  const result = await Faq.findById(id)
  return result || null
}

const updateFaq = async (id: string, payload: Partial<IFaq>) => {
  const result = await Faq.findByIdAndUpdate(
    id,
    { $set: payload },
    {
      new: true,
    },
  )
  return result
}

const deleteFaq = async (id: string) => {
  const result = await Faq.findByIdAndDelete(id)
  return result
}

const updatePublic = async (id: string, payload: Partial<IPublic>) => {
  const data = await Public.findById(id)

  if (!data) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Public document not found')
  }

  // Filter payload to only allow 'content' field update
  const updateData = {
    content: payload.content,
  }

  const result = await Public.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true },
  )

  return result
}

export const PublicServices = {
  createPublic,
  getAllPublics,
  deletePublic,
  createFaq,
  getAllFaqs,
  getSingleFaq,
  updateFaq,
  deleteFaq,
  updatePublic,
}
