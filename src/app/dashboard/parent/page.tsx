import { redirect } from 'next/navigation'

export default function ParentRootPage() {
  redirect('/dashboard/parent/dashboard')
}
