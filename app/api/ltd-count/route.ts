import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const revalidate = 300 // cache 5 minutes

export async function GET() {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('plan_type', 'lifetime')

  if (error) return NextResponse.json({ taken: 7, total: 20 }) // fallback
  return NextResponse.json({ taken: count ?? 0, total: 20 })
}
