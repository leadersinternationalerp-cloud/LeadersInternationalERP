import { createClient } from '@/utils/supabase/server'
import {
  buildCacheKey,
  CACHE_TTL,
  getOrSetCache,
  invalidateCachePrefix,
} from './redisCache'

export async function getCachedGradingScale(): Promise<any> {
  const key = buildCacheKey('settings:grading')
  return getOrSetCache(key, CACHE_TTL.GRADING_SCALE, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'grading_scale')
      .maybeSingle()
    return data?.value ?? null
  })
}

export async function getCachedAssessmentWeights(): Promise<any[]> {
  const key = buildCacheKey('settings:weights')
  return getOrSetCache(key, CACHE_TTL.ASSESSMENT_WEIGHTS, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('assessment_weights')
      .select('assessment_type, weight, is_active, display_order')
      .order('display_order', { ascending: true })
    return data || []
  })
}

export async function getCachedTerms(): Promise<any[]> {
  const key = buildCacheKey('terms:list')
  return getOrSetCache(key, CACHE_TTL.ACTIVE_TERM, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('terms')
      .select('id, name, term_name, academic_year, academic_year_id, is_current, created_at')
      .order('is_current', { ascending: false })
      .order('created_at', { ascending: true })
    return data || []
  })
}

export async function getCachedClasses(): Promise<any[]> {
  const key = buildCacheKey('classes:list')
  return getOrSetCache(key, CACHE_TTL.CLASSES_LIST, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('classes')
      .select('id, name, section, class_teacher_id')
      .order('name', { ascending: true })
    return data || []
  })
}

export async function invalidateReferenceDataCache(
  domain?: 'grading' | 'weights' | 'terms' | 'classes' | 'all'
) {
  if (!domain || domain === 'all') {
    await Promise.all([
      invalidateCachePrefix('settings:grading'),
      invalidateCachePrefix('settings:weights'),
      invalidateCachePrefix('terms'),
      invalidateCachePrefix('classes'),
    ])
    return
  }
  if (domain === 'grading') await invalidateCachePrefix('settings:grading')
  if (domain === 'weights') await invalidateCachePrefix('settings:weights')
  if (domain === 'terms') await invalidateCachePrefix('terms')
  if (domain === 'classes') await invalidateCachePrefix('classes')
}
