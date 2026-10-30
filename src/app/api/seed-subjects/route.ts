import { createClient } from '@/utils/supabase/server'
import { route, ok } from '@/lib/api/handler'

export const POST = route(
  async ({ requestId }) => {
    const supabase = await createClient()

    const mainSubjects = [
      { name: 'Art & Craft', code: 'ART', department: 'Arts' },
      { name: 'Computing', code: 'COMP', department: 'Sciences' },
      { name: 'Digital Literacy', code: 'DIGI', department: 'Sciences' },
      { name: 'English Language', code: 'ENG', department: 'Languages' },
      { name: 'Global Perspectives', code: 'GLOB', department: 'Humanities' },
      { name: 'Mathematics', code: 'MATH', department: 'Mathematics' },
      { name: 'Music', code: 'MUS', department: 'Arts' },
      { name: 'Science', code: 'SCI', department: 'Sciences' },
    ]

    const results = []
    for (const subj of mainSubjects) {
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .or(`name.ilike.${subj.name},subject_name.ilike.${subj.name}`)
        .maybeSingle()

      if (!existing) {
        const { error } = await supabase.from('subjects').insert({
          name: subj.name,
          subject_name: subj.name,
          code: subj.code,
          subject_code: subj.code,
          department: subj.department,
        })

        if (error) {
          results.push({ name: subj.name, status: 'error' })
        } else {
          results.push({ name: subj.name, status: 'inserted' })
        }
      } else {
        const { error: updateError } = await supabase
          .from('subjects')
          .update({
            name: subj.name,
            subject_name: subj.name,
            code: subj.code,
            subject_code: subj.code,
            department: subj.department,
          })
          .eq('id', existing.id)

        if (updateError) {
          results.push({ name: subj.name, status: 'update_error' })
        } else {
          results.push({ name: subj.name, status: 'synced' })
        }
      }
    }

    return ok({ results }, { requestId })
  },
  { roles: ['System Admin'] }
)
