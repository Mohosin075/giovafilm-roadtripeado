import { Model, Types } from 'mongoose'

export interface IOfferRedemption {
  _id: Types.ObjectId
  user: Types.ObjectId // Ref User
  offer: Types.ObjectId // Ref Offer
  redemptionTime: Date
  expiresAt?: Date // If there is a timer, backend might track it
  createdAt: Date
  updatedAt: Date
}

export type OfferRedemptionModel = Model<IOfferRedemption>
