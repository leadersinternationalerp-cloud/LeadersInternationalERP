import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const normalizeKey = (value: string) =>
  (value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const findBestMatchingSubject = (rows: any[], subjectName: string) => {
  const normalizedSubject = normalizeKey(subjectName)
  return rows.find((row) => normalizeKey(row.subject_name) === normalizedSubject)
    || rows.find((row) => normalizeKey(row.subject_name).includes(normalizedSubject))
    || rows.find((row) => normalizedSubject.includes(normalizeKey(row.subject_name)))
    || rows[0]
}

const getStageName = (gradeLevel: string) => {
  const match = gradeLevel.match(/\d+/)
  return match ? `Stage ${match[0]}` : 'Stage 1'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const subjectName = url.searchParams.get('subjectName') || ''
  const gradeLevel = url.searchParams.get('gradeLevel') || 'Grade 1'

  if (!subjectName) {
    return NextResponse.json({ success: false, error: 'subjectName is required' }, { status: 400 })
  }

  const stageName = getStageName(gradeLevel)
  const supabase = await createClient()

  const { data: stage, error: stageError } = await supabase
    .from('cambridge_stages')
    .select('id, stage_name')
    .eq('stage_name', stageName)
    .maybeSingle()

  if (stageError) {
    return NextResponse.json({ success: false, error: stageError.message }, { status: 500 })
  }
  if (!stage) {
    return NextResponse.json({ success: false, error: `Stage not found: ${stageName}` }, { status: 404 })
  }

  const { data: subjects, error: subjectsError } = await supabase
    .from('cambridge_subjects')
    .select('id, subject_name')
    .eq('stage_id', stage.id)

  if (subjectsError) {
    return NextResponse.json({ success: false, error: subjectsError.message }, { status: 500 })
  }
  if (!subjects || !subjects.length) {
    return NextResponse.json({ success: true, topics: [] })
  }

  const matchingSubject = findBestMatchingSubject(subjects, subjectName)
  if (!matchingSubject) {
    return NextResponse.json({ success: true, topics: [] })
  }

  const { data: units, error: unitsError } = await supabase
    .from('cambridge_units')
    .select('id, unit_title, topics:cambridge_topics(id, topic_number, topic_title, objectives:cambridge_learning_objectives(objective_text))')
    .eq('cambridge_subject_id', matchingSubject.id)

  if (unitsError) {
    return NextResponse.json({ success: false, error: unitsError.message }, { status: 500 })
  }

  const topics = (units || []).flatMap((unit: any) =>
    (unit.topics || []).map((topic: any) => ({
      id: topic.id,
      topicNumber: topic.topic_number,
      topicTitle: topic.topic_title,
      unitTitle: unit.unit_title,
      objectives: (topic.objectives || []).map((o: any) => o.objective_text || '')
    }))
  )

  return NextResponse.json({ success: true, topics })
}
