import { Model, Types } from 'mongoose'

export type IAwardType =
  | 'PDF Itinerary'
  | 'Free Map'
  | 'Gourmet Guide'
  | 'Top Reviewer'
  | 'Trail Master'
  | 'History Buff'
  | 'Legendary Explorer'

export interface IAward {
  userId: Types.ObjectId
  type: IAwardType
  progress: number
  target: number
  isUnlocked: boolean
}

export type AwardModel = Model<IAward>
