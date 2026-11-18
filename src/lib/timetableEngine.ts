/**
 * aSc TimeTables-inspired Constraint, Diagnostic, Solver, Substitution & XML Export Engine
 */

export type TimeOffState = 'ok' | 'questionable' | 'forbidden';
export type TimeOffMap = Record<string, TimeOffState>; // key: `${day}:${period_number}`

export interface EngineSlot {
  id: string;
  period_number: number;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

export interface EngineBuilding {
  id: string;
  name: string;
  short_name?: string | null;
  travel_periods?: number;
}

export interface EngineClassroom {
  id: string;
  name: string;
  short_name?: string | null;
  capacity?: number;
  building_id?: string | null;
  is_shared?: boolean;
  home_class_id?: string | null;
  time_off?: TimeOffMap;
}

export interface EngineGroup {
  id: string;
  class_id: string;
  division_name: string;
  group_name: string;
  student_count?: number | null;
}

export interface TeacherConstraint {
  teacher_id: string;
  max_windows_per_day?: number | null;
  max_windows_per_week?: number | null;
  max_consecutive_periods?: number | null;
  min_periods_per_day?: number | null;
  max_periods_per_day?: number | null;
  max_days_per_week?: number | null;
  max_building_transits_per_day?: number | null;
  can_substitute?: boolean;
  color?: string | null;
  time_off?: TimeOffMap;
}

export interface ClassConstraint {
  class_id: string;
  home_classroom_id?: string | null;
  max_periods_per_day?: number | null;
  min_periods_per_day?: number | null;
  allow_gaps?: boolean;
  lunch_min_period?: number | null;
  lunch_max_period?: number | null;
  forbid_after_lunch_if_last?: boolean;
  time_off?: TimeOffMap;
}

export interface SubjectConstraint {
  subject_id: string;
  preferred_classroom_ids?: string[];
  color?: string | null;
  max_per_day?: number | null;
  time_off?: TimeOffMap;
}

export type CardRelationType =
  | 'not_same_day'
  | 'cannot_follow'
  | 'must_follow'
  | 'must_be_same_day'
  | 'even_distribution'
  | 'simultaneous'
  | 'max_per_day'
  | 'min_gap_days';

export interface CardRelationship {
  id: string;
  relation_type: CardRelationType;
  importance: 'strict' | 'normal' | 'relaxed';
  subject_id_a?: string | null;
  subject_id_b?: string | null;
  class_id?: string | null;
  lesson_ids?: string[];
  params?: Record<string, unknown>;
  is_enabled: boolean;
}

export interface EngineLesson {
  id: string; // class_subject_id
  class_id: string;
  subject_id: string | null;
  subject_name?: string;
  teacher_id: string;
  teacher_name?: string;
  periods_per_week: number;
  periods_per_card: number;
  group_id?: string | null;
  allowed_classroom_ids?: string[];
  joint_class_ids?: string[];
  co_teacher_ids?: string[];
  color?: string | null;
}

export interface EngineEntry {
  id?: string;
  class_id: string;
  class_subject_id: string;
  day_of_week: string;
  slot_id: string;
  classroom_id?: string | null;
  room?: string | null;
  group_id?: string | null;
  is_locked?: boolean;
  week_code?: string;
  card_group_id?: string | null;
}

export interface EngineSettings {
  days_of_week: string[];
  auto_relax_constraints: boolean;
  lunch_enabled?: boolean;
  lunch_min_period?: number;
  lunch_max_period?: number;
}

export interface TimetableContext {
  slots: EngineSlot[];
  lessons: EngineLesson[];
  existingEntries: EngineEntry[];
  buildings: EngineBuilding[];
  classrooms: EngineClassroom[];
  groups: EngineGroup[];
  teacherConstraints: Record<string, TeacherConstraint>;
  classConstraints: Record<string, ClassConstraint>;
  subjectConstraints: Record<string, SubjectConstraint>;
  cardRelationships: CardRelationship[];
  settings: EngineSettings;
}

export interface DiagnosticItem {
  severity: 'error' | 'warning';
  scope: 'class' | 'teacher' | 'classroom' | 'relationship' | 'global';
  entityId?: string;
  entityName?: string;
  message: string;
}

export interface SlotEvaluation {
  status: 'good' | 'questionable' | 'forbidden';
  reasons: string[];
  score: number; // higher is better
  suggestedClassroomId?: string | null;
}

export interface UnplacedCard {
  class_subject_id: string;
  class_id: string;
  subject_name: string;
  teacher_id: string;
  teacher_name: string;
  card_length: number;
  group_id?: string | null;
  reasons: string[];
}

export interface GenerationResult {
  entries: EngineEntry[];
  assignedCount: number;
  unassignedCount: number;
  unplacedCards: UnplacedCard[];
  relaxationsApplied: string[];
  stats: {
    totalTeacherWindows: number;
    maxTeacherWindows: number;
    teachersWithWindows: number;
    lockedPreserved: number;
  };
  diagnostics: DiagnosticItem[];
}

export function timeOffKey(day: string, periodNumber: number): string {
  return `${day}:${periodNumber}`;
}

export function getTimeOffState(map: TimeOffMap | undefined, day: string, periodNumber: number): TimeOffState {
  if (!map) return 'ok';
  return map[timeOffKey(day, periodNumber)] || 'ok';
}

function getAcademicSlots(slots: EngineSlot[]): EngineSlot[] {
  return [...slots]
    .filter((s) => !s.is_break)
    .sort((a, b) => a.period_number - b.period_number);
}

function getLessonTeachers(lesson: EngineLesson): string[] {
  const ids = new Set<string>();
  if (lesson.teacher_id) ids.add(lesson.teacher_id);
  for (const ct of lesson.co_teacher_ids || []) {
    if (ct) ids.add(ct);
  }
  return Array.from(ids);
}

function getLessonClasses(lesson: EngineLesson): string[] {
  const ids = new Set<string>([lesson.class_id]);
  for (const jc of lesson.joint_class_ids || []) {
    if (jc) ids.add(jc);
  }
  return Array.from(ids);
}

function groupsConflict(groupA?: string | null, groupB?: string | null): boolean {
  // If either is whole-class (null/undefined), or both are the same group, they conflict.
  if (!groupA || !groupB) return true;
  return groupA === groupB;
}

/**
 * Find consecutive academic slot sequences of length `cardLen` starting at `startSlotId`
 * without crossing a break slot.
 */
export function getConsecutiveSlotSequence(
  allSlotsSorted: EngineSlot[],
  startSlotId: string,
  cardLen: number
): EngineSlot[] | null {
  const startIdx = allSlotsSorted.findIndex((s) => s.id === startSlotId);
  if (startIdx === -1) return null;
  if (allSlotsSorted[startIdx].is_break) return null;

  const seq: EngineSlot[] = [allSlotsSorted[startIdx]];
  let idx = startIdx + 1;
  while (seq.length < cardLen && idx < allSlotsSorted.length) {
    if (allSlotsSorted[idx].is_break) {
      // Cannot span a double/triple card across a break
      return null;
    }
    seq.push(allSlotsSorted[idx]);
    idx++;
  }
  return seq.length === cardLen ? seq : null;
}

/**
 * Pre-generation "Test" command (mirrors aSc TimeTables -> Test):
 * Detects impossible workloads, time-off bottlenecks, and room shortages before solving.
 */
export function testTimetableFeasibility(
  ctx: TimetableContext,
  targetClassIds?: string[]
): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = [];
  const days = ctx.settings.days_of_week;
  const academicSlots = getAcademicSlots(ctx.slots);
  const totalWeeklySlots = days.length * academicSlots.length;

  if (academicSlots.length === 0) {
    diagnostics.push({
      severity: 'error',
      scope: 'global',
      message: 'No academic period slots are configured. Generate or add period slots first.',
    });
    return diagnostics;
  }

  const scopedLessons = targetClassIds?.length
    ? ctx.lessons.filter((l) => targetClassIds.includes(l.class_id))
    : ctx.lessons;

  // 1. Check each class total periods vs available slots
  const classPeriodMap = new Map<string, number>();
  const classLessonsMap = new Map<string, EngineLesson[]>();
  for (const l of scopedLessons) {
    // Only count ungrouped or 1st group per division? Sum conservatively for ungrouped; warn if > totalWeeklySlots
    if (!l.group_id) {
      classPeriodMap.set(l.class_id, (classPeriodMap.get(l.class_id) || 0) + l.periods_per_week);
    }
    const list = classLessonsMap.get(l.class_id) || [];
    list.push(l);
    classLessonsMap.set(l.class_id, list);
  }

  for (const [classId, totalPeriods] of classPeriodMap.entries()) {
    const cc = ctx.classConstraints[classId];
    let availableForClass = 0;
    for (const d of days) {
      for (const s of academicSlots) {
        if (getTimeOffState(cc?.time_off, d, s.period_number) !== 'forbidden') {
          availableForClass++;
        }
      }
    }
    if (totalPeriods > availableForClass) {
      diagnostics.push({
        severity: 'error',
        scope: 'class',
        entityId: classId,
        message: `Class has ${totalPeriods} ungrouped periods/week assigned, but only ${availableForClass} available slots after Time-Off.`,
      });
    }
    if (cc?.max_periods_per_day && totalPeriods > cc.max_periods_per_day * days.length) {
      diagnostics.push({
        severity: 'error',
        scope: 'class',
        entityId: classId,
        message: `Class requires ${totalPeriods} periods/week, exceeding max_periods_per_day (${cc.max_periods_per_day}) × ${days.length} days.`,
      });
    }
  }

  // 2. Check each teacher total periods vs available slots
  const teacherLessons = new Map<string, EngineLesson[]>();
  for (const l of scopedLessons) {
    for (const tid of getLessonTeachers(l)) {
      const list = teacherLessons.get(tid) || [];
      list.push(l);
      teacherLessons.set(tid, list);
    }
  }

  for (const [teacherId, lessons] of teacherLessons.entries()) {
    const tc = ctx.teacherConstraints[teacherId];
    const totalLoad = lessons.reduce((sum, l) => sum + l.periods_per_week, 0);
    const teacherName = lessons[0]?.teacher_name || teacherId;

    let availableSlots = 0;
    let availableDays = 0;
    for (const d of days) {
      let dayHasSlot = false;
      for (const s of academicSlots) {
        if (getTimeOffState(tc?.time_off, d, s.period_number) !== 'forbidden') {
          availableSlots++;
          dayHasSlot = true;
        }
      }
      if (dayHasSlot) availableDays++;
    }

    if (totalLoad > availableSlots) {
      diagnostics.push({
        severity: 'error',
        scope: 'teacher',
        entityId: teacherId,
        entityName: teacherName,
        message: `${teacherName} has ${totalLoad} periods/week, but only ${availableSlots} available slots after Time-Off.`,
      });
    }

    if (tc?.max_days_per_week && tc.max_days_per_week < availableDays) {
      const maxSlotsInDays = tc.max_days_per_week * (tc.max_periods_per_day || academicSlots.length);
      if (totalLoad > maxSlotsInDays) {
        diagnostics.push({
          severity: 'error',
          scope: 'teacher',
          entityId: teacherId,
          entityName: teacherName,
          message: `${teacherName} has ${totalLoad} periods/week, which cannot fit into max ${tc.max_days_per_week} days/week.`,
        });
      }
    }

    // Check double/triple card feasibility
    const hasMultiCard = lessons.some((l) => (l.periods_per_card || 1) > 1);
    if (hasMultiCard) {
      const allSorted = [...ctx.slots].sort((a, b) => a.period_number - b.period_number);
      const maxCard = Math.max(...lessons.map((l) => l.periods_per_card || 1));
      const canFitMulti = academicSlots.some((s) => getConsecutiveSlotSequence(allSorted, s.id, maxCard) !== null);
      if (!canFitMulti) {
        diagnostics.push({
          severity: 'error',
          scope: 'teacher',
          entityId: teacherId,
          entityName: teacherName,
          message: `No consecutive block of ${maxCard} periods exists without crossing a break.`,
        });
      }
    }
  }

  // 3. Check shared classroom demand vs supply
  const roomDemand = new Map<string, number>();
  for (const l of scopedLessons) {
    if (l.allowed_classroom_ids && l.allowed_classroom_ids.length === 1) {
      const rid = l.allowed_classroom_ids[0];
      roomDemand.set(rid, (roomDemand.get(rid) || 0) + l.periods_per_week);
    }
  }
  for (const [rid, demand] of roomDemand.entries()) {
    const room = ctx.classrooms.find((r) => r.id === rid);
    if (demand > totalWeeklySlots) {
      diagnostics.push({
        severity: 'error',
        scope: 'classroom',
        entityId: rid,
        entityName: room?.name || rid,
        message: `Classroom "${room?.name || rid}" is required for ${demand} periods/week, exceeding ${totalWeeklySlots} total weekly slots.`,
      });
    }
  }

  // 4. Warn if a lesson has more periods_per_week than days when max_per_day = 1
  for (const l of scopedLessons) {
    const sc = l.subject_id ? ctx.subjectConstraints[l.subject_id] : undefined;
    const maxPerDay = sc?.max_per_day ?? (l.periods_per_card > 1 ? l.periods_per_card : 1);
    if (l.periods_per_week > days.length * maxPerDay) {
      diagnostics.push({
        severity: 'warning',
        scope: 'class',
        entityId: l.class_id,
        message: `${l.subject_name || 'Subject'} has ${l.periods_per_week} periods/week, exceeding ${days.length} days × max ${maxPerDay}/day.`,
      });
    }
  }

  return diagnostics;
}

/**
 * Evaluates a candidate `(day, startSlotId)` placement for a lesson card.
 * Powers both the solver AND real-time Green/Blue/Gray slot highlighting in the UI!
 */
export function evaluateSlotForLesson(
  ctx: TimetableContext,
  lesson: EngineLesson,
  day: string,
  startSlotId: string,
  currentEntries: EngineEntry[],
  options?: { cardLen?: number; relaxSoft?: boolean; ignoreEntryIds?: Set<string> }
): SlotEvaluation {
  const cardLen = options?.cardLen ?? (lesson.periods_per_card || 1);
  const relaxSoft = options?.relaxSoft ?? false;
  const ignoreIds = options?.ignoreEntryIds;

  const allSlotsSorted = [...ctx.slots].sort((a, b) => a.period_number - b.period_number);
  const seq = getConsecutiveSlotSequence(allSlotsSorted, startSlotId, cardLen);
  if (!seq) {
    return {
      status: 'forbidden',
      reasons: [cardLen > 1 ? `Cannot fit ${cardLen} consecutive periods without crossing a break.` : 'Invalid or break slot.'],
      score: -10000,
    };
  }

  const reasons: string[] = [];
  let isForbidden = false;
  let isQuestionable = false;
  let score = 100;

  const activeEntries = ignoreIds
    ? currentEntries.filter((e) => !e.id || !ignoreIds.has(e.id))
    : currentEntries;

  const lessonMap = new Map(ctx.lessons.map((l) => [l.id, l]));
  const lessonTeachers = getLessonTeachers(lesson);
  const lessonClasses = getLessonClasses(lesson);
  const sc = lesson.subject_id ? ctx.subjectConstraints[lesson.subject_id] : undefined;

  for (const slot of seq) {
    // 1. Time-off checks (Subject, Classes, Teachers)
    const subState = getTimeOffState(sc?.time_off, day, slot.period_number);
    if (subState === 'forbidden') {
      isForbidden = true;
      reasons.push(`Subject time-off forbidden on ${day} P${slot.period_number}`);
    } else if (subState === 'questionable') {
      isQuestionable = true;
      score -= 20;
      reasons.push(`Subject prefers to avoid ${day} P${slot.period_number}`);
    }

    for (const cid of lessonClasses) {
      const cc = ctx.classConstraints[cid];
      const clsState = getTimeOffState(cc?.time_off, day, slot.period_number);
      if (clsState === 'forbidden') {
        isForbidden = true;
        reasons.push(`Class time-off forbidden on ${day} P${slot.period_number}`);
      } else if (clsState === 'questionable') {
        isQuestionable = true;
        score -= 15;
        reasons.push(`Class prefers to avoid ${day} P${slot.period_number}`);
      }
    }

    for (const tid of lessonTeachers) {
      const tc = ctx.teacherConstraints[tid];
      const tState = getTimeOffState(tc?.time_off, day, slot.period_number);
      if (tState === 'forbidden') {
        isForbidden = true;
        reasons.push(`Teacher unavailable on ${day} P${slot.period_number}`);
      } else if (tState === 'questionable') {
        isQuestionable = true;
        score -= 25;
        reasons.push(`Teacher prefers to avoid ${day} P${slot.period_number}`);
      }
    }

    // 2. Hard conflicts at (day, slot)
    const slotEntries = activeEntries.filter((e) => e.day_of_week === day && e.slot_id === slot.id);

    for (const e of slotEntries) {
      // Class / Group conflict
      if (lessonClasses.includes(e.class_id) && groupsConflict(lesson.group_id, e.group_id)) {
        isForbidden = true;
        reasons.push(`Class already has a lesson on ${day} P${slot.period_number}`);
      }

      // Teacher conflict
      const otherLesson = lessonMap.get(e.class_subject_id);
      if (otherLesson) {
        const otherTeachers = getLessonTeachers(otherLesson);
        if (lessonTeachers.some((t) => otherTeachers.includes(t))) {
          isForbidden = true;
          reasons.push(`Teacher is already scheduled elsewhere on ${day} P${slot.period_number}`);
        }
      }
    }
  }

  // 3. Classroom availability check
  const allowedRoomIds =
    lesson.allowed_classroom_ids && lesson.allowed_classroom_ids.length > 0
      ? lesson.allowed_classroom_ids
      : sc?.preferred_classroom_ids && sc.preferred_classroom_ids.length > 0
      ? sc.preferred_classroom_ids
      : [];

  let suggestedClassroomId: string | null = null;
  if (allowedRoomIds.length > 0) {
    // Pick first available allowed room across all periods in `seq`
    for (const rid of allowedRoomIds) {
      const roomObj = ctx.classrooms.find((r) => r.id === rid);
      const roomFree = seq.every((slot) => {
        if (getTimeOffState(roomObj?.time_off, day, slot.period_number) === 'forbidden') return false;
        return !activeEntries.some(
          (e) => e.day_of_week === day && e.slot_id === slot.id && e.classroom_id === rid
        );
      });
      if (roomFree) {
        suggestedClassroomId = rid;
        break;
      }
    }
    if (!suggestedClassroomId) {
      isForbidden = true;
      reasons.push(`No allowed classroom is free on ${day} P${seq[0].period_number}`);
    }
  } else {
    // Prefer home classroom if free
    const homeRoomId = ctx.classConstraints[lesson.class_id]?.home_classroom_id;
    if (homeRoomId) {
      const homeFree = seq.every(
        (slot) =>
          !activeEntries.some(
            (e) => e.day_of_week === day && e.slot_id === slot.id && e.classroom_id === homeRoomId
          )
      );
      if (homeFree) {
        suggestedClassroomId = homeRoomId;
        score += 10;
      }
    }
  }

  // 4. Same-day subject limit & Card Relationships
  const sameClassDayEntries = activeEntries.filter(
    (e) => e.class_id === lesson.class_id && e.day_of_week === day
  );
  const sameSubjectToday = sameClassDayEntries.filter(
    (e) => e.class_subject_id === lesson.id
  ).length;
  const maxSubjectPerDay = sc?.max_per_day ?? (cardLen > 1 ? cardLen : 1);

  if (sameSubjectToday + cardLen > maxSubjectPerDay) {
    if (relaxSoft) {
      isQuestionable = true;
      score -= 40;
      reasons.push(`Exceeds max ${maxSubjectPerDay} period(s)/day for this subject`);
    } else {
      isForbidden = true;
      reasons.push(`Subject already scheduled on ${day} (max ${maxSubjectPerDay}/day)`);
    }
  }

  // Card relationships
  const academicSlots = getAcademicSlots(ctx.slots);
  const slotPeriodSet = new Set(seq.map((s) => s.period_number));
  const minSeqP = Math.min(...seq.map((s) => s.period_number));
  const maxSeqP = Math.max(...seq.map((s) => s.period_number));

  for (const rel of ctx.cardRelationships) {
    if (!rel.is_enabled) continue;
    if (rel.class_id && rel.class_id !== lesson.class_id) continue;

    const involvesA = rel.subject_id_a && rel.subject_id_a === lesson.subject_id;
    const involvesB = rel.subject_id_b && rel.subject_id_b === lesson.subject_id;
    if (!involvesA && !involvesB) continue;

    const partnerSubId = involvesA ? rel.subject_id_b : rel.subject_id_a;
    if (!partnerSubId) continue;

    const partnerToday = sameClassDayEntries.filter((e) => {
      const l = lessonMap.get(e.class_subject_id);
      return l?.subject_id === partnerSubId;
    });

    if (rel.relation_type === 'not_same_day' && partnerToday.length > 0) {
      if (rel.importance === 'strict' && !relaxSoft) {
        isForbidden = true;
      } else {
        isQuestionable = true;
        score -= 35;
      }
      reasons.push(`Card relationship: cannot be on the same day`);
    }

    if (rel.relation_type === 'cannot_follow' && partnerToday.length > 0) {
      const adjacent = partnerToday.some((e) => {
        const s = academicSlots.find((sl) => sl.id === e.slot_id);
        return s && (s.period_number === minSeqP - 1 || s.period_number === maxSeqP + 1);
      });
      if (adjacent) {
        if (rel.importance === 'strict' && !relaxSoft) {
          isForbidden = true;
        } else {
          isQuestionable = true;
          score -= 30;
        }
        reasons.push(`Card relationship: subjects cannot follow each other`);
      }
    }

    if (rel.relation_type === 'must_be_same_day') {
      const partnerOtherDays = activeEntries.some((e) => {
        if (e.class_id !== lesson.class_id || e.day_of_week === day) return false;
        const l = lessonMap.get(e.class_subject_id);
        return l?.subject_id === partnerSubId;
      });
      if (partnerToday.length > 0) {
        score += 25;
      } else if (partnerOtherDays) {
        isQuestionable = true;
        score -= 30;
        reasons.push(`Card relationship: should be on the same day as paired subject`);
      }
    }
  }

  // 5. Soft constraints: Teacher windows, consecutive periods, max periods/day, building transits
  for (const tid of lessonTeachers) {
    const tc = ctx.teacherConstraints[tid];
    const teacherDayPeriods = activeEntries
      .filter((e) => {
        if (e.day_of_week !== day) return false;
        const l = lessonMap.get(e.class_subject_id);
        return l ? getLessonTeachers(l).includes(tid) : false;
      })
      .map((e) => academicSlots.find((s) => s.id === e.slot_id)?.period_number)
      .filter((p): p is number => typeof p === 'number');

    const combined = Array.from(new Set([...teacherDayPeriods, ...slotPeriodSet])).sort((a, b) => a - b);

    if (tc?.max_periods_per_day && combined.length > tc.max_periods_per_day) {
      if (relaxSoft) {
        isQuestionable = true;
        score -= 30;
      } else {
        isForbidden = true;
      }
      reasons.push(`Exceeds teacher max ${tc.max_periods_per_day} periods/day`);
    }

    // Calculate windows (gaps) on this day
    if (combined.length > 1) {
      const span = combined[combined.length - 1] - combined[0] + 1;
      const windows = span - combined.length;
      if (tc?.max_windows_per_day !== undefined && tc?.max_windows_per_day !== null && windows > tc.max_windows_per_day) {
        if (relaxSoft) {
          isQuestionable = true;
          score -= 25 * (windows - tc.max_windows_per_day);
        } else {
          isForbidden = true;
        }
        reasons.push(`Creates ${windows} teacher window(s) (max ${tc.max_windows_per_day}/day)`);
      } else {
        score -= windows * 8; // Prefer compact teacher schedules
      }
    }

    // Consecutive check
    if (tc?.max_consecutive_periods) {
      let run = 1;
      let maxRun = 1;
      for (let i = 1; i < combined.length; i++) {
        if (combined[i] === combined[i - 1] + 1) {
          run++;
          if (run > maxRun) maxRun = run;
        } else {
          run = 1;
        }
      }
      if (maxRun > tc.max_consecutive_periods) {
        if (relaxSoft) {
          isQuestionable = true;
          score -= 20;
        } else {
          isForbidden = true;
        }
        reasons.push(`Exceeds teacher max ${tc.max_consecutive_periods} consecutive periods`);
      }
    }
  }

  // 6. Class max periods per day
  const classDayCount = sameClassDayEntries.length + cardLen;
  const cc = ctx.classConstraints[lesson.class_id];
  if (cc?.max_periods_per_day && classDayCount > cc.max_periods_per_day) {
    if (relaxSoft) {
      isQuestionable = true;
      score -= 25;
    } else {
      isForbidden = true;
    }
    reasons.push(`Exceeds class max ${cc.max_periods_per_day} periods/day`);
  }

  // Prefer spreading lessons across days (even distribution)
  const totalForClassToday = sameClassDayEntries.length;
  score -= totalForClassToday * 2;

  return {
    status: isForbidden ? 'forbidden' : isQuestionable ? 'questionable' : 'good',
    reasons,
    score,
    suggestedClassroomId,
  };
}

interface CardTask {
  lesson: EngineLesson;
  cardLen: number;
  difficulty: number;
}

/**
 * Builds individual placement cards from `periods_per_week` and `periods_per_card`,
 * preserving any locked entries already on the board.
 */
function buildCardTasks(
  lessons: EngineLesson[],
  lockedEntries: EngineEntry[],
  ctx: TimetableContext
): CardTask[] {
  const tasks: CardTask[] = [];
  for (const lesson of lessons) {
    const alreadyPlaced = lockedEntries.filter((e) => e.class_subject_id === lesson.id).length;
    let remaining = Math.max(0, (lesson.periods_per_week || 1) - alreadyPlaced);
    const cardSize = Math.max(1, lesson.periods_per_card || 1);

    // Estimate constraint difficulty (MRV heuristic)
    const tc = ctx.teacherConstraints[lesson.teacher_id];
    const forbiddenCount = tc?.time_off
      ? Object.values(tc.time_off).filter((v) => v === 'forbidden').length
      : 0;
    const roomRestricted = (lesson.allowed_classroom_ids?.length || 0) > 0 ? 30 : 0;
    const jointWeight = (lesson.joint_class_ids?.length || 0) * 20;

    while (remaining > 0) {
      const len = Math.min(cardSize, remaining);
      tasks.push({
        lesson,
        cardLen: len,
        difficulty: len * 50 + forbiddenCount * 3 + roomRestricted + jointWeight,
      });
      remaining -= len;
    }
  }

  // Sort hardest cards first (MRV)
  tasks.sort((a, b) => b.difficulty - a.difficulty);
  return tasks;
}

/**
 * Generates an optimized timetable for a single class or the entire school,
 * respecting locked cards, multi-period blocks, time-off, rooms, groups, and card relationships.
 */
export function generateTimetableSchedule(
  ctx: TimetableContext,
  options?: { targetClassId?: string | null; autoRelax?: boolean }
): GenerationResult {
  const targetClassId = options?.targetClassId || null;
  const autoRelax = options?.autoRelax ?? ctx.settings.auto_relax_constraints ?? true;
  const days = ctx.settings.days_of_week;
  const academicSlots = getAcademicSlots(ctx.slots);

  const diagnostics = testTimetableFeasibility(ctx, targetClassId ? [targetClassId] : undefined);

  // Preserve entries from other classes (if single-class mode) + locked entries in target scope
  const preservedEntries: EngineEntry[] = ctx.existingEntries.filter((e) => {
    if (targetClassId && e.class_id !== targetClassId) return true;
    return Boolean(e.is_locked);
  });

  const lockedInScopeCount = ctx.existingEntries.filter(
    (e) => (!targetClassId || e.class_id === targetClassId) && e.is_locked
  ).length;

  const targetLessons = targetClassId
    ? ctx.lessons.filter((l) => l.class_id === targetClassId)
    : ctx.lessons;

  const tasks = buildCardTasks(targetLessons, preservedEntries, ctx);
  const workingEntries: EngineEntry[] = [...preservedEntries];
  const unplacedTasks: CardTask[] = [];
  const relaxationsApplied: string[] = [];

  // Pass 1: Strict placement (pick highest-scoring non-forbidden slot)
  for (const task of tasks) {
    let bestPlacement: { day: string; seq: EngineSlot[]; score: number; roomId?: string | null } | null = null;
    const allSorted = [...ctx.slots].sort((a, b) => a.period_number - b.period_number);

    for (const day of days) {
      for (const slot of academicSlots) {
        const evalRes = evaluateSlotForLesson(ctx, task.lesson, day, slot.id, workingEntries, {
          cardLen: task.cardLen,
          relaxSoft: false,
        });
        if (evalRes.status !== 'forbidden') {
          const seq = getConsecutiveSlotSequence(allSorted, slot.id, task.cardLen);
          if (seq && (!bestPlacement || evalRes.score > bestPlacement.score)) {
            bestPlacement = {
              day,
              seq,
              score: evalRes.score,
              roomId: evalRes.suggestedClassroomId,
            };
          }
        }
      }
    }

    if (bestPlacement) {
      const cardGroupId = bestPlacement.seq.length > 1 ? crypto.randomUUID() : null;
      for (const s of bestPlacement.seq) {
        workingEntries.push({
          class_id: task.lesson.class_id,
          class_subject_id: task.lesson.id,
          day_of_week: bestPlacement.day,
          slot_id: s.id,
          classroom_id: bestPlacement.roomId || null,
          group_id: task.lesson.group_id || null,
          is_locked: false,
          week_code: 'ALL',
          card_group_id: cardGroupId,
        });
      }
    } else {
      unplacedTasks.push(task);
    }
  }

  // Pass 2: Automatic relaxation if enabled and cards remain unplaced
  const finalUnplaced: UnplacedCard[] = [];
  if (unplacedTasks.length > 0 && autoRelax) {
    relaxationsApplied.push('Relaxed soft constraints (questionable time-off, teacher windows, daily subject limits) for remaining cards.');
    const allSorted = [...ctx.slots].sort((a, b) => a.period_number - b.period_number);

    for (const task of unplacedTasks) {
      let bestPlacement: { day: string; seq: EngineSlot[]; score: number; roomId?: string | null } | null = null;
      const lastReasons: string[] = [];

      for (const day of days) {
        for (const slot of academicSlots) {
          const evalRes = evaluateSlotForLesson(ctx, task.lesson, day, slot.id, workingEntries, {
            cardLen: task.cardLen,
            relaxSoft: true,
          });
          if (evalRes.status !== 'forbidden') {
            const seq = getConsecutiveSlotSequence(allSorted, slot.id, task.cardLen);
            if (seq && (!bestPlacement || evalRes.score > bestPlacement.score)) {
              bestPlacement = {
                day,
                seq,
                score: evalRes.score,
                roomId: evalRes.suggestedClassroomId,
              };
            }
          } else if (lastReasons.length < 3) {
            for (const r of evalRes.reasons) {
              if (!lastReasons.includes(r)) lastReasons.push(r);
            }
          }
        }
      }

      if (bestPlacement) {
        const cardGroupId = bestPlacement.seq.length > 1 ? crypto.randomUUID() : null;
        for (const s of bestPlacement.seq) {
          workingEntries.push({
            class_id: task.lesson.class_id,
            class_subject_id: task.lesson.id,
            day_of_week: bestPlacement.day,
            slot_id: s.id,
            classroom_id: bestPlacement.roomId || null,
            group_id: task.lesson.group_id || null,
            is_locked: false,
            week_code: 'ALL',
            card_group_id: cardGroupId,
          });
        }
      } else {
        finalUnplaced.push({
          class_subject_id: task.lesson.id,
          class_id: task.lesson.class_id,
          subject_name: task.lesson.subject_name || 'Subject',
          teacher_id: task.lesson.teacher_id,
          teacher_name: task.lesson.teacher_name || 'Teacher',
          card_length: task.cardLen,
          group_id: task.lesson.group_id || null,
          reasons: lastReasons.length > 0 ? lastReasons : ['All slots had hard conflicts (teacher, class, or classroom).'],
        });
      }
    }
  } else {
    for (const task of unplacedTasks) {
      finalUnplaced.push({
        class_subject_id: task.lesson.id,
        class_id: task.lesson.class_id,
        subject_name: task.lesson.subject_name || 'Subject',
        teacher_id: task.lesson.teacher_id,
        teacher_name: task.lesson.teacher_name || 'Teacher',
        card_length: task.cardLen,
        group_id: task.lesson.group_id || null,
        reasons: ['Could not satisfy strict constraints without relaxation.'],
      });
    }
  }

  // Compute quality stats (teacher windows)
  const generatedOnly = targetClassId
    ? workingEntries.filter((e) => e.class_id === targetClassId)
    : workingEntries;

  const lessonMap = new Map(ctx.lessons.map((l) => [l.id, l]));
  const teacherWindowsMap = new Map<string, number>();

  for (const e of workingEntries) {
    const l = lessonMap.get(e.class_subject_id);
    if (!l) continue;
    for (const tid of getLessonTeachers(l)) {
      if (!teacherWindowsMap.has(tid)) teacherWindowsMap.set(tid, 0);
    }
  }

  for (const tid of teacherWindowsMap.keys()) {
    let totalW = 0;
    for (const day of days) {
      const periods = workingEntries
        .filter((e) => {
          if (e.day_of_week !== day) return false;
          const l = lessonMap.get(e.class_subject_id);
          return l ? getLessonTeachers(l).includes(tid) : false;
        })
        .map((e) => academicSlots.find((s) => s.id === e.slot_id)?.period_number)
        .filter((p): p is number => typeof p === 'number')
        .sort((a, b) => a - b);

      if (periods.length > 1) {
        const unique = Array.from(new Set(periods));
        totalW += unique[unique.length - 1] - unique[0] + 1 - unique.length;
      }
    }
    teacherWindowsMap.set(tid, totalW);
  }

  const windowCounts = Array.from(teacherWindowsMap.values());
  const totalTeacherWindows = windowCounts.reduce((a, b) => a + b, 0);
  const maxTeacherWindows = windowCounts.length > 0 ? Math.max(...windowCounts) : 0;
  const teachersWithWindows = windowCounts.filter((w) => w > 0).length;

  return {
    entries: generatedOnly,
    assignedCount: generatedOnly.length,
    unassignedCount: finalUnplaced.reduce((acc, c) => acc + c.card_length, 0),
    unplacedCards: finalUnplaced,
    relaxationsApplied,
    stats: {
      totalTeacherWindows,
      maxTeacherWindows,
      teachersWithWindows,
      lockedPreserved: lockedInScopeCount,
    },
    diagnostics,
  };
}

export interface SubstituteCandidate {
  teacher_id: string;
  teacher_name: string;
  score: number;
  reasons: string[];
  dailyLoad: number;
  teachesSameSubject: boolean;
  teachesSameClass: boolean;
}

/**
 * Ranks available substitute teachers for an absent teacher's scheduled lesson.
 */
export function rankSubstituteTeachers(
  ctx: TimetableContext,
  entry: EngineEntry,
  allTeachers: Array<{ id: string; name: string }>
): SubstituteCandidate[] {
  const slot = ctx.slots.find((s) => s.id === entry.slot_id);
  const targetLesson = ctx.lessons.find((l) => l.id === entry.class_subject_id);
  if (!slot || !targetLesson) return [];

  const lessonMap = new Map(ctx.lessons.map((l) => [l.id, l]));
  const candidates: SubstituteCandidate[] = [];

  for (const t of allTeachers) {
    if (t.id === targetLesson.teacher_id) continue;
    const tc = ctx.teacherConstraints[t.id];
    if (tc && tc.can_substitute === false) continue;

    // Must not be forbidden at this time
    const tState = getTimeOffState(tc?.time_off, entry.day_of_week, slot.period_number);
    if (tState === 'forbidden') continue;

    // Must not already be teaching at this (day, slot)
    const isBusy = ctx.existingEntries.some((e) => {
      if (e.day_of_week !== entry.day_of_week || e.slot_id !== entry.slot_id) return false;
      const l = lessonMap.get(e.class_subject_id);
      return l ? getLessonTeachers(l).includes(t.id) : false;
    });
    if (isBusy) continue;

    const teacherLessons = ctx.lessons.filter((l) => getLessonTeachers(l).includes(t.id));
    const teachesSameSubject = Boolean(
      targetLesson.subject_id && teacherLessons.some((l) => l.subject_id === targetLesson.subject_id)
    );
    const teachesSameClass = teacherLessons.some((l) => l.class_id === entry.class_id);

    const dailyLoad = ctx.existingEntries.filter((e) => {
      if (e.day_of_week !== entry.day_of_week) return false;
      const l = lessonMap.get(e.class_subject_id);
      return l ? getLessonTeachers(l).includes(t.id) : false;
    }).length;

    let score = 50 - dailyLoad * 5;
    const reasons: string[] = [];

    if (teachesSameSubject) {
      score += 30;
      reasons.push('Teaches same subject');
    }
    if (teachesSameClass) {
      score += 20;
      reasons.push('Knows this class');
    }
    if (tState === 'questionable') {
      score -= 15;
      reasons.push('Marked questionable in Time-Off');
    }
    if (reasons.length === 0) {
      reasons.push(`Free during P${slot.period_number} (${dailyLoad} lessons today)`);
    }

    candidates.push({
      teacher_id: t.id,
      teacher_name: t.name,
      score,
      reasons,
      dailyLoad,
      teachesSameSubject,
      teachesSameClass,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Exports the current timetable to aSc TimeTables 2012 XML format (`asctt2012.xml`).
 */
export function exportTimetableToAscXml(params: {
  slots: EngineSlot[];
  days: string[];
  classes: Array<{ id: string; name: string; section?: string | null }>;
  subjects: Array<{ id: string; name: string; short_name?: string | null }>;
  teachers: Array<{ id: string; name: string; color?: string | null }>;
  buildings: EngineBuilding[];
  classrooms: EngineClassroom[];
  groups: EngineGroup[];
  lessons: EngineLesson[];
  entries: EngineEntry[];
}): string {
  const { slots, days, classes, subjects, teachers, buildings, classrooms, groups, lessons, entries } = params;
  const academicSlots = getAcademicSlots(slots);
  const breakSlots = slots.filter((s) => s.is_break);

  const lines: string[] = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<timetable ascttversion="2027.7.1" importtype="database">',
  ];

  // Periods
  lines.push('  <periods options="canadd" columns="period,name,short,starttime,endtime">');
  for (const s of academicSlots) {
    lines.push(
      `    <period period="${s.period_number}" name="${escapeXml(s.name)}" short="${s.period_number}" starttime="${escapeXml(s.start_time.slice(0, 5))}" endtime="${escapeXml(s.end_time.slice(0, 5))}" />`
    );
  }
  lines.push('  </periods>');

  // Breaks
  lines.push('  <breaks options="canadd" columns="break,name,short,starttime,endtime">');
  breakSlots.forEach((b, idx) => {
    lines.push(
      `    <break break="${idx + 1}" name="${escapeXml(b.name)}" short="${escapeXml(b.name.slice(0, 4))}" starttime="${escapeXml(b.start_time.slice(0, 5))}" endtime="${escapeXml(b.end_time.slice(0, 5))}" />`
    );
  });
  lines.push('  </breaks>');

  // Daysdefs
  lines.push('  <daysdefs options="canadd" columns="id,days,name,short">');
  days.forEach((d, idx) => {
    const mask = days.map((_, i) => (i === idx ? '1' : '0')).join('');
    lines.push(
      `    <daysdef id="D${idx + 1}" days="${mask}" name="${escapeXml(d)}" short="${escapeXml(d.slice(0, 3))}" />`
    );
  });
  lines.push('  </daysdefs>');

  // Subjects
  lines.push('  <subjects options="canadd" columns="id,name,short">');
  for (const sub of subjects) {
    lines.push(
      `    <subject id="${escapeXml(sub.id)}" name="${escapeXml(sub.name)}" short="${escapeXml(sub.short_name || sub.name.slice(0, 6))}" />`
    );
  }
  lines.push('  </subjects>');

  // Teachers
  lines.push('  <teachers options="canadd" columns="id,name,short,color">');
  for (const t of teachers) {
    lines.push(
      `    <teacher id="${escapeXml(t.id)}" name="${escapeXml(t.name)}" short="${escapeXml(t.name.slice(0, 8))}" color="${escapeXml(t.color || '#3b82f6')}" />`
    );
  }
  lines.push('  </teachers>');

  // Buildings
  lines.push('  <buildings options="canadd" columns="id,name">');
  for (const b of buildings) {
    lines.push(`    <building id="${escapeXml(b.id)}" name="${escapeXml(b.name)}" />`);
  }
  lines.push('  </buildings>');

  // Classrooms
  lines.push('  <classrooms options="canadd" columns="id,name,short,capacity,buildingid">');
  for (const r of classrooms) {
    lines.push(
      `    <classroom id="${escapeXml(r.id)}" name="${escapeXml(r.name)}" short="${escapeXml(r.short_name || r.name.slice(0, 6))}" capacity="${r.capacity || 40}" buildingid="${escapeXml(r.building_id || '')}" />`
    );
  }
  lines.push('  </classrooms>');

  // Classes
  lines.push('  <classes options="canadd" columns="id,name,short">');
  for (const c of classes) {
    const fullName = `${c.name}${c.section ? ' ' + c.section : ''}`.trim();
    lines.push(
      `    <class id="${escapeXml(c.id)}" name="${escapeXml(fullName)}" short="${escapeXml(fullName.slice(0, 8))}" />`
    );
  }
  lines.push('  </classes>');

  // Groups
  lines.push('  <groups options="canadd" columns="id,classid,name,entireclass,divisiontag">');
  for (const g of groups) {
    lines.push(
      `    <group id="${escapeXml(g.id)}" classid="${escapeXml(g.class_id)}" name="${escapeXml(g.group_name)}" entireclass="0" divisiontag="${escapeXml(g.division_name)}" />`
    );
  }
  lines.push('  </groups>');

  // Lessons
  lines.push('  <lessons options="canadd" columns="id,subjectid,classids,groupids,teacherids,classroomids,periodspercard,periodsperweek">');
  for (const l of lessons) {
    const classIds = getLessonClasses(l).join(',');
    const teacherIds = getLessonTeachers(l).join(',');
    const roomIds = (l.allowed_classroom_ids || []).join(',');
    lines.push(
      `    <lesson id="${escapeXml(l.id)}" subjectid="${escapeXml(l.subject_id || '')}" classids="${escapeXml(classIds)}" groupids="${escapeXml(l.group_id || '')}" teacherids="${escapeXml(teacherIds)}" classroomids="${escapeXml(roomIds)}" periodspercard="${l.periods_per_card || 1}" periodsperweek="${l.periods_per_week || 1}" />`
    );
  }
  lines.push('  </lessons>');

  // Cards
  lines.push('  <cards options="canadd" columns="lessonid,period,days,classroomids">');
  for (const e of entries) {
    const s = academicSlots.find((sl) => sl.id === e.slot_id);
    const dayIdx = days.indexOf(e.day_of_week);
    if (!s || dayIdx === -1) continue;
    const mask = days.map((_, i) => (i === dayIdx ? '1' : '0')).join('');
    lines.push(
      `    <card lessonid="${escapeXml(e.class_subject_id)}" period="${s.period_number}" days="${mask}" classroomids="${escapeXml(e.classroom_id || '')}" />`
    );
  }
  lines.push('  </cards>');

  lines.push('</timetable>');
  return lines.join('\n');
}
