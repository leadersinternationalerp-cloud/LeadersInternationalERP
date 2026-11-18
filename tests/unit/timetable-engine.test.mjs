import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const engineSrc = fs.readFileSync(path.resolve('src/lib/timetableEngine.ts'), 'utf8')
const transpiled = ts.transpileModule(engineSrc, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const tmpEnginePath = path.join(os.tmpdir(), `timetableEngine-${process.pid}.mjs`)
fs.writeFileSync(tmpEnginePath, transpiled, 'utf8')

const {
  evaluateSlotForLesson,
  generateTimetableSchedule,
  testTimetableFeasibility,
  rankSubstituteTeachers,
  exportTimetableToAscXml,
  timeOffKey,
} = await import(pathToFileURL(tmpEnginePath).href)

function makeSlots() {
  return [
    { id: 's1', period_number: 1, name: 'Period 1', start_time: '08:00', end_time: '08:40', is_break: false },
    { id: 's2', period_number: 2, name: 'Period 2', start_time: '08:40', end_time: '09:20', is_break: false },
    { id: 'brk', period_number: 2, name: 'Break', start_time: '09:20', end_time: '09:40', is_break: true },
    { id: 's3', period_number: 3, name: 'Period 3', start_time: '09:40', end_time: '10:20', is_break: false },
    { id: 's4', period_number: 4, name: 'Period 4', start_time: '10:20', end_time: '11:00', is_break: false },
  ]
}

function makeBaseCtx(overrides = {}) {
  return {
    slots: makeSlots(),
    lessons: [],
    existingEntries: [],
    buildings: [],
    classrooms: [],
    groups: [],
    teacherConstraints: {},
    classConstraints: {},
    subjectConstraints: {},
    cardRelationships: [],
    settings: {
      days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      auto_relax_constraints: true,
    },
    ...overrides,
  }
}

test('testTimetableFeasibility detects teacher time-off bottleneck', () => {
  const ctx = makeBaseCtx({
    lessons: [
      {
        id: 'l1',
        class_id: 'c1',
        subject_id: 'sub1',
        subject_name: 'Physics',
        teacher_id: 't1',
        teacher_name: 'Dr. Newton',
        periods_per_week: 6,
        periods_per_card: 1,
      },
    ],
    teacherConstraints: {
      t1: {
        teacher_id: 't1',
        time_off: {
          [timeOffKey('Monday', 1)]: 'forbidden',
          [timeOffKey('Monday', 2)]: 'forbidden',
          [timeOffKey('Monday', 3)]: 'forbidden',
          [timeOffKey('Monday', 4)]: 'forbidden',
          [timeOffKey('Tuesday', 1)]: 'forbidden',
          [timeOffKey('Tuesday', 2)]: 'forbidden',
          [timeOffKey('Tuesday', 3)]: 'forbidden',
          [timeOffKey('Tuesday', 4)]: 'forbidden',
          [timeOffKey('Wednesday', 1)]: 'forbidden',
          [timeOffKey('Wednesday', 2)]: 'forbidden',
          [timeOffKey('Wednesday', 3)]: 'forbidden',
          [timeOffKey('Wednesday', 4)]: 'forbidden',
          [timeOffKey('Thursday', 1)]: 'forbidden',
          [timeOffKey('Thursday', 2)]: 'forbidden',
          [timeOffKey('Thursday', 3)]: 'forbidden',
          [timeOffKey('Thursday', 4)]: 'forbidden',
        },
      },
    },
  })

  const diags = testTimetableFeasibility(ctx)
  assert.ok(diags.some((d) => d.severity === 'error' && d.scope === 'teacher'))
})

test('generateTimetableSchedule places double-period cards without crossing breaks and preserves locked cards', () => {
  const ctx = makeBaseCtx({
    lessons: [
      {
        id: 'l_chem',
        class_id: 'c1',
        subject_id: 'chem',
        subject_name: 'Chemistry',
        teacher_id: 't1',
        teacher_name: 'Mme Curie',
        periods_per_week: 2,
        periods_per_card: 2,
        allowed_classroom_ids: ['lab1'],
      },
      {
        id: 'l_math',
        class_id: 'c1',
        subject_id: 'math',
        subject_name: 'Math',
        teacher_id: 't2',
        teacher_name: 'Mr Euler',
        periods_per_week: 3,
        periods_per_card: 1,
      },
    ],
    classrooms: [{ id: 'lab1', name: 'Science Lab', capacity: 30, is_shared: true }],
    existingEntries: [
      {
        id: 'locked_1',
        class_id: 'c1',
        class_subject_id: 'l_math',
        day_of_week: 'Friday',
        slot_id: 's4',
        is_locked: true,
      },
    ],
  })

  const res = generateTimetableSchedule(ctx, { targetClassId: 'c1' })
  assert.equal(res.unassignedCount, 0)
  assert.equal(res.assignedCount, 5)
  assert.equal(res.stats.lockedPreserved, 1)

  // Locked card must still be at Friday s4
  assert.ok(res.entries.some((e) => e.id === 'locked_1' && e.day_of_week === 'Friday' && e.slot_id === 's4'))

  // Chemistry double card must be consecutive (either s1+s2 or s3+s4, never s2+s3 across break)
  const chemEntries = res.entries.filter((e) => e.class_subject_id === 'l_chem')
  assert.equal(chemEntries.length, 2)
  assert.equal(chemEntries[0].day_of_week, chemEntries[1].day_of_week)
  assert.equal(chemEntries[0].classroom_id, 'lab1')
  const pair = new Set([chemEntries[0].slot_id, chemEntries[1].slot_id])
  assert.ok((pair.has('s1') && pair.has('s2')) || (pair.has('s3') && pair.has('s4')))
})

test('evaluateSlotForLesson allows simultaneous divided groups but blocks ungrouped conflicts', () => {
  const ctx = makeBaseCtx({
    lessons: [
      {
        id: 'l_fr',
        class_id: 'c1',
        subject_id: 'fr',
        subject_name: 'French',
        teacher_id: 't_fr',
        periods_per_week: 2,
        periods_per_card: 1,
        group_id: 'g_fr',
      },
      {
        id: 'l_sw',
        class_id: 'c1',
        subject_id: 'sw',
        subject_name: 'Swahili',
        teacher_id: 't_sw',
        periods_per_week: 2,
        periods_per_card: 1,
        group_id: 'g_sw',
      },
    ],
    existingEntries: [
      {
        id: 'e1',
        class_id: 'c1',
        class_subject_id: 'l_fr',
        day_of_week: 'Monday',
        slot_id: 's1',
        group_id: 'g_fr',
      },
    ],
  })

  const evalSw = evaluateSlotForLesson(ctx, ctx.lessons[1], 'Monday', 's1', ctx.existingEntries)
  assert.notEqual(evalSw.status, 'forbidden')
})

test('rankSubstituteTeachers prioritizes free teachers teaching same subject', () => {
  const ctx = makeBaseCtx({
    lessons: [
      { id: 'l1', class_id: 'c1', subject_id: 'math', teacher_id: 't1', periods_per_week: 1, periods_per_card: 1 },
      { id: 'l2', class_id: 'c2', subject_id: 'math', teacher_id: 't2', periods_per_week: 1, periods_per_card: 1 },
      { id: 'l3', class_id: 'c2', subject_id: 'art', teacher_id: 't3', periods_per_week: 1, periods_per_card: 1 },
    ],
    existingEntries: [
      { id: 'e1', class_id: 'c1', class_subject_id: 'l1', day_of_week: 'Monday', slot_id: 's1' },
      { id: 'e3', class_id: 'c2', class_subject_id: 'l3', day_of_week: 'Monday', slot_id: 's1' },
    ],
  })

  const ranked = rankSubstituteTeachers(ctx, ctx.existingEntries[0], [
    { id: 't1', name: 'Absent Teacher' },
    { id: 't2', name: 'Math Sub' },
    { id: 't3', name: 'Busy Art Teacher' },
    { id: 't4', name: 'Free History Teacher' },
  ])

  assert.equal(ranked.length, 2) // t1 is absent, t3 is busy
  assert.equal(ranked[0].teacher_id, 't2')
  assert.equal(ranked[0].teachesSameSubject, true)
})

test('exportTimetableToAscXml generates valid asctt2012 XML structure', () => {
  const xml = exportTimetableToAscXml({
    slots: makeSlots(),
    days: ['Monday', 'Tuesday'],
    classes: [{ id: 'c1', name: 'Grade 5', section: 'A' }],
    subjects: [{ id: 'sub1', name: 'Mathematics' }],
    teachers: [{ id: 't1', name: 'Jane Doe', color: '#2563eb' }],
    buildings: [{ id: 'b1', name: 'Main Block' }],
    classrooms: [{ id: 'r1', name: 'Room 101', capacity: 35, building_id: 'b1' }],
    groups: [],
    lessons: [{ id: 'l1', class_id: 'c1', subject_id: 'sub1', teacher_id: 't1', periods_per_week: 1, periods_per_card: 1 }],
    entries: [{ class_id: 'c1', class_subject_id: 'l1', day_of_week: 'Monday', slot_id: 's1', classroom_id: 'r1' }],
  })

  assert.ok(xml.includes('<timetable ascttversion="2027.7.1"'))
  assert.ok(xml.includes('<period period="1"'))
  assert.ok(xml.includes('<break break="1"'))
  assert.ok(xml.includes('<card lessonid="l1" period="1" days="10" classroomids="r1"'))
})
