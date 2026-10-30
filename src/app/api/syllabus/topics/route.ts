import { NextResponse } from 'next/server'
import curriculumData from '@/lib/data/curriculum/all_subjects.json'
import { createClient } from '@/utils/supabase/server'
import { route, apiHeaders } from '@/lib/api/handler'
import { STAFF_ROLES } from '@/lib/auth/roles'
import { badRequest } from '@/lib/api/errors'

const normalizeKey = (value: string) =>
  (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')

interface SubjectRow {
  id: string
  subject_name?: string
  [key: string]: unknown
}

const findBestMatchingSubject = (rows: SubjectRow[], subjectName: string) => {
  const normalizedSubject = normalizeKey(subjectName)
  return (
    rows.find((row) => normalizeKey(row.subject_name || '') === normalizedSubject) ||
    rows.find((row) => normalizeKey(row.subject_name || '').includes(normalizedSubject)) ||
    rows.find((row) => normalizedSubject.includes(normalizeKey(row.subject_name || ''))) ||
    rows[0]
  )
}

const getStageNumber = (gradeLevel: string) => {
  const match = (gradeLevel || '').match(/\d+/)
  return match ? match[0] : '1'
}

const getTopicsFromLocalCurriculum = (subjectName: string, stageNumber: string) => {
  const data = curriculumData as Record<string, Record<string, { topic: string; content?: string }[]>>
  const normalizedSubject = normalizeKey(subjectName)

  const subjectKey = Object.keys(data).find((key) => {
    const normalizedKey = normalizeKey(key)
    return (
      normalizedKey === normalizedSubject ||
      normalizedKey.includes(normalizedSubject) ||
      normalizedSubject.includes(normalizedKey)
    )
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
        .filter(Boolean),
    }))
}

export const GET = route(
  async ({ req, requestId }) => {
    const url = new URL(req.url)
    const subjectName = url.searchParams.get('subjectName') || ''
    const gradeLevel = url.searchParams.get('gradeLevel') || 'Grade 1'

    if (!subjectName) {
      throw badRequest({ subjectName: 'subjectName is required' })
    }

    const stageNumber = getStageNumber(gradeLevel)
    const localTopics = getTopicsFromLocalCurriculum(subjectName, stageNumber)

    const supabase = await createClient()

    try {
      const { data: stages, error: stageError } = await supabase
        .from('cambridge_stages')
        .select('id, stage_name')

      if (stageError) {
        return NextResponse.json(
          { data: { topics: localTopics, source: 'local' }, success: true, topics: localTopics, source: 'local', meta: { requestId } },
          { status: 200, headers: apiHeaders(requestId) }
        )
      }

      const stage = (stages || []).find((row: { stage_name?: string }) => {
        const match = String(row.stage_name || '').match(/\d+/)
        return match && match[0] === stageNumber
      })

      if (!stage) {
        return NextResponse.json(
          { data: { topics: localTopics, source: 'local' }, success: true, topics: localTopics, source: 'local', meta: { requestId } },
          { status: 200, headers: apiHeaders(requestId) }
        )
      }

      const { data: cambridgeSubjects, error: subError } = await supabase
        .from('cambridge_subjects')
        .select('id, subject_name')
        .eq('stage_id', stage.id)

      if (subError) {
        return NextResponse.json(
          { data: { topics: localTopics, source: 'local' }, success: true, topics: localTopics, source: 'local', meta: { requestId } },
          { status: 200, headers: apiHeaders(requestId) }
        )
      }

      const cambridgeSubject = findBestMatchingSubject(cambridgeSubjects || [], subjectName)
      if (!cambridgeSubject) {
        return NextResponse.json(
          { data: { topics: localTopics, source: 'local' }, success: true, topics: localTopics, source: 'local', meta: { requestId } },
          { status: 200, headers: apiHeaders(requestId) }
        )
      }

      const { data: units, error: unitError } = await supabase
        .from('cambridge_units')
        .select(`
          id,
          unit_title,
          unit_number,
          topics:cambridge_topics (
            id,
            topic_number,
            topic_title,
            objectives:cambridge_learning_objectives (
              id,
              objective_text
            )
          )
        `)
        .eq('cambridge_subject_id', cambridgeSubject.id)
        .order('unit_number', { ascending: true })

      if (unitError) {
        return NextResponse.json(
          { data: { topics: localTopics, source: 'local' }, success: true, topics: localTopics, source: 'local', meta: { requestId } },
          { status: 200, headers: apiHeaders(requestId) }
        )
      }

      interface TopicObjective {
        id?: string
        objective_text?: string
      }
      interface UnitTopic {
        id: string
        topic_number: string
        topic_title: string
        objectives?: TopicObjective[]
      }
      interface CambridgeUnit {
        unit_title?: string
        topics?: UnitTopic[]
      }

      const topics = (units || []).flatMap((unit: CambridgeUnit) =>
        (unit.topics || []).map((topic: UnitTopic) => {
          let objectives = (topic.objectives || []).map((o: TopicObjective) => o.objective_text || '')
          if (!objectives.length) {
            const matchingLocal = localTopics.find(
              (lt) =>
                normalizeKey(lt.topicTitle) === normalizeKey(topic.topic_title) ||
                normalizeKey(lt.topicNumber) === normalizeKey(topic.topic_number)
            )
            if (matchingLocal) {
              objectives = matchingLocal.objectives
            }
          }
          return {
            id: topic.id,
            topicNumber: topic.topic_number,
            topicTitle: topic.topic_title,
            unitTitle: unit.unit_title || '',
            objectives,
          }
        })
      )

      if (!topics.length) {
        return NextResponse.json(
          { data: { topics: localTopics, source: 'local' }, success: true, topics: localTopics, source: 'local', meta: { requestId } },
          { status: 200, headers: apiHeaders(requestId) }
        )
      }

      return NextResponse.json(
        { data: { topics, source: 'database' }, success: true, topics, source: 'database', meta: { requestId } },
        { status: 200, headers: apiHeaders(requestId) }
      )
    } catch {
      return NextResponse.json(
        { data: { topics: localTopics, source: 'local' }, success: true, topics: localTopics, source: 'local', meta: { requestId } },
        { status: 200, headers: apiHeaders(requestId) }
      )
    }
  },
  { roles: STAFF_ROLES }
)
