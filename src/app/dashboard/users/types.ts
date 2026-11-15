import { type UserWingAssignment } from '@/lib/wing'

export type User = {
  id: string
  first_name: string
  last_name: string
  email: string
  username?: string
  role: string
  wing: UserWingAssignment
  is_active: boolean
  created_at: string
}
