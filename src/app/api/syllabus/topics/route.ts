import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import curriculumData from '@/lib/data/curriculum/all_subjects.json'

// Normalize subject names so variants like 'Art & Craft' and 'Art and Craft' match.
const normalizeKey = (value: string) =>
  (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')

const findBestMatchingSubject = (rows: any[], subjectName: string) => {
  const normalizedSubject = normalizeKey(subjectName)
  return rows.find((row) => normalizeKey(row.subject_name) === normalizedSubject)
    || rows.find((row) => normalizeKey(row.subject_name).includes(normalizedSubject))
    || rows.find((row) => normalizedSubject.includes(normalizeKey(row.subject_name)))
    || rows[0]
}

// The UI presents "Grade 1..6" but the Cambridge schemes of work use "Stage 1..6".
// Extract the numeric level so "Grade 3", "Stage 3", "3" etc. all resolve to "Stage 3".
const getStageNumber = (gradeLevel: string) => {
  const match = (gradeLevel || '').match(/\d+/)
  return match ? match[0] : '1'
}

// Fallback: read topics straight from the bundled schemes-of-work JSON so the
// topic selector is never blank, even if the DB has not been seeded yet.
const getTopicsFromLocalCurriculum = (subjectName: string, stageNumber: string) => {
  const data = curriculumData as Record<string, Record<string, { topic: string; content?: string }[]>>
  const normalizedSubject = normalizeKey(subjectName)

  const subjectKey = Object.keys(data).find((key) => {
    const normalizedKey = normalizeKey(key)
    return normalizedKey === normalizedSubject
      || normalizedKey.includes(normalizedSubject)
      || normalizedSubject.includes(normalizedKey)
  })
  if (!subjectKey) return []

  const stageKey = `Stage ${stageNumber}`
  const topics = data[subjectKey]?.[stageKey] || []

  return topics
    .filter((t) => (t.topic || '').trim())
    .map((t, idx) => ({
      id: `local-${normalizeKey(subjectKey)}-${stageNumber}-${idx + 1}`,
      topicNumber: `T${idx + 1}`,
      topicTitle: t.topic.trim(),
      unitTitle: `${subjectKey} ${stageKey}`,
      objectives: String(t.content || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    }))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const subjectName = url.searchParams.get('subjectName') || ''
  const gradeLevel = url.searchParams.get('gradeLevel') || 'Grade 1'

  if (!subjectName) {
    return NextResponse.json({ success: false, error: 'subjectName is required' }, { status: 400 })
  }

  const stageNumber = getStageNumber(gradeLevel)
  const localTopics = getTopicsFromLocalCurriculum(subjectName, stageNumber)

  try {
    const supabase = await createClient()

    // Match the stage by its numeric level so both 'Stage 3' and legacy
    // labels like 'Primary Stage 3' resolve correctly.
    const { data: stages, error: stageError } = await supabase
      .from('cambridge_stages')
      .select('id, stage_name')

    if (stageError) {
      console.error('Syllabus topics route stage error:', stageError.message)
      return NextResponse.json({ success: true, topics: localTopics, source: 'local' })
    }

    const stage = (stages || []).find((row: any) => {
      const match = String(row.stage_name || '').match(/\d+/)
      return match && match[0] === stageNumber
    })

    if (!stage) {
      console.warn(`Syllabus stage not found for level ${stageNumber}; using local curriculum fallback`)
      return NextResponse.json({ success: true, topics: localTopics, source: 'local' })
    }

    const { data: subjects, error: subjectsError } = await supabase
      .from('cambridge_subjects')
      .select('id, subject_name')
      .eq('stage_id', stage.id)

    if (subjectsError) {
      console.error('Syllabus topics route subjects error:', subjectsError.message)
      return NextResponse.json({ success: true, topics: localTopics, source: 'local' })
    }
    if (!subjects || !subjects.length) {
      return NextResponse.json({ success: true, topics: localTopics, source: 'local' })
    }

    const matchingSubject = findBestMatchingSubject(subjects, subjectName)
    if (!matchingSubject) {
      return NextResponse.json({ success: true, topics: localTopics, source: 'local' })
    }

    const { data: units, error: unitsError } = await supabase
      .from('cambridge_units')
      .select('id, unit_title, topics:cambridge_topics(id, topic_number, topic_title, objectives:cambridge_learning_objectives(objective_text))')
      .eq('cambridge_subject_id', matchingSubject.id)

    if (unitsError) {
      console.error('Syllabus topics route units error:', unitsError.message)
      return NextResponse.json({ success: true, topics: localTopics, source: 'local' })
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

    // If the DB has no topics for this subject/stage yet, fall back to the local schemes JSON.
    if (!topics.length) {
      return NextResponse.json({ success: true, topics: localTopics, source: 'local' })
    }

    return NextResponse.json({ success: true, topics, source: 'database' })
  } catch (error: any) {
    console.error('Syllabus topics route unexpected error:', error?.message || error)
    return NextResponse.json({ success: true, topics: localTopics, source: 'local' })
  }
}
