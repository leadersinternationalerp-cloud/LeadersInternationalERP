import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/guard';

export const POST = withAuth(
  async (_request: NextRequest, { supabase }) => {
    try {
      // The main 8 subjects required in the system
      const mainSubjects = [
        { name: 'Art & Craft', code: 'ART', department: 'Arts' },
        { name: 'Computing', code: 'COMP', department: 'Sciences' },
        { name: 'Digital Literacy', code: 'DIGI', department: 'Sciences' },
        { name: 'English Language', code: 'ENG', department: 'Languages' },
        { name: 'Global Perspectives', code: 'GLOB', department: 'Humanities' },
        { name: 'Mathematics', code: 'MATH', department: 'Mathematics' },
        { name: 'Music', code: 'MUS', department: 'Arts' },
        { name: 'Science', code: 'SCI', department: 'Sciences' }
      ];

      const results = [];
      for (const subj of mainSubjects) {
        // First check if it exists by name or subject_name
        const { data: existing } = await supabase
          .from('subjects')
          .select('id')
          .or(`name.ilike.${subj.name},subject_name.ilike.${subj.name}`)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('subjects')
            .insert({
              name: subj.name,
              subject_name: subj.name,
              code: subj.code,
              subject_code: subj.code,
              department: subj.department
            });
          
          if (error) {
            results.push({ name: subj.name, status: 'error', error: error.message });
          } else {
            results.push({ name: subj.name, status: 'inserted' });
          }
        } else {
          // Update existing record to ensure columns are synchronized
          const { error: updateError } = await supabase
            .from('subjects')
            .update({
              name: subj.name,
              subject_name: subj.name,
              code: subj.code,
              subject_code: subj.code,
              department: subj.department
            })
            .eq('id', existing.id);

          if (updateError) {
            results.push({ name: subj.name, status: 'update_error', error: updateError.message });
          } else {
            results.push({ name: subj.name, status: 'already_exists_and_synced' });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Main subjects seeded and synchronized successfully',
        results
      });
    } catch (err: any) {
      console.error('API seed subjects error:', err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  { roles: ['System Admin'] }
);
