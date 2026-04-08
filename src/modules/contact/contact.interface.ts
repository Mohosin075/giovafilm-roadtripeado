import { Model, Types } from 'mongoose'

export interface IContact {
  _id: Types.ObjectId
  name: string
  email: string
  subject: string
  message: string
}

export type ContactModel = Model<IContact, Record<string, never>, Record<string, never>>
