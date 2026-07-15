import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

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

        results.push({ name: subj.name, status: updateError ? 'error_updating' : 'already_exists_synced', error: updateError?.message });
      }
    }

    // Attempt to delete any subject not in the main list
    const { data: allSubjects } = await supabase.from('subjects').select('id, name, subject_name');
    const toDelete = allSubjects?.filter(s => {
      const sName = s.name || s.subject_name || '';
      return !mainSubjects.some(ms => ms.name.toLowerCase() === sName.toLowerCase());
    }) || [];
    
    for (const subj of toDelete) {
      const { error } = await supabase.from('subjects').delete().eq('id', subj.id);
      if (error) {
         results.push({ name: subj.name || subj.subject_name, status: 'failed_to_delete', error: error.message });
      } else {
         results.push({ name: subj.name || subj.subject_name, status: 'deleted' });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
