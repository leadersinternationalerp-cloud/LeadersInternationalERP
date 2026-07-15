import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // The main 8 subjects required in the system
    const mainSubjects = [
      'Art & Craft',
      'Computing',
      'Digital Literacy',
      'English Language',
      'Global Perspectives',
      'Mathematics',
      'Music',
      'Science'
    ];

    // Insert them one by one, ignoring duplicates
    const results = [];
    for (const name of mainSubjects) {
      // First check if it exists
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .ilike('name', name)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('subjects')
          .insert({ name });
        
        if (error) {
          results.push({ name, status: 'error', error: error.message });
        } else {
          results.push({ name, status: 'inserted' });
        }
      } else {
        results.push({ name, status: 'already_exists' });
      }
    }

    // Attempt to delete any subject not in the main list
    const { data: allSubjects } = await supabase.from('subjects').select('id, name');
    const toDelete = allSubjects?.filter(s => !mainSubjects.some(ms => ms.toLowerCase() === s.name.toLowerCase())) || [];
    
    for (const subj of toDelete) {
      const { error } = await supabase.from('subjects').delete().eq('id', subj.id);
      if (error) {
         results.push({ name: subj.name, status: 'failed_to_delete', error: error.message });
      } else {
         results.push({ name: subj.name, status: 'deleted' });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
