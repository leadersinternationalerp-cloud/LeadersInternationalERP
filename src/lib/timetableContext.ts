import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeRoles } from '@/lib/auth/roles';
import type {
  CardRelationship,
  ClassConstraint,
  EngineBuilding,
  EngineClassroom,
  EngineEntry,
  EngineGroup,
  EngineLesson,
  EngineSettings,
  EngineSlot,
  SubjectConstraint,
  TeacherConstraint,
  TimetableContext,
} from './timetableEngine';

export interface ErpTeacher {
  id: string;
  first_name: string;
  last_name: string;
}

/**
 * Fetches all teachers configured via User Management using `normalizeRoles`
 * so both single-role (`role = 'Teacher'`) and multi-role (`roles` includes `'Teacher'`)
 * accounts are uniformly included.
 */
export async function fetchErpTeachers(supabase: SupabaseClient): Promise<ErpTeacher[]> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, roles')
    .order('first_name', { ascending: true });

  return (profiles || [])
    .filter((p: { role?: string | null; roles?: string[] | null }) =>
      normalizeRoles(p).includes('Teacher')
    )
    .map((p: { id: string; first_name?: string | null; last_name?: string | null }) => ({
      id: p.id,
      first_name: p.first_name || '',
      last_name: p.last_name || '',
    }));
}

/**
 * Loads the complete aSc TimetableContext from Supabase for diagnostics, generation, and ranking.
 */
export async function loadTimetableContext(
  supabase: SupabaseClient,
  classIdForSlots?: string | null
): Promise<TimetableContext> {
  // 1. Load slots (prefer class-specific if provided, fallback to global)
  let slots: EngineSlot[] = [];
  if (classIdForSlots) {
    const { data: classSlots } = await supabase
      .from('timetable_slots')
      .select('*')
      .eq('class_id', classIdForSlots)
      .order('period_number', { ascending: true });
    slots = (classSlots || []) as EngineSlot[];
  }
  if (slots.length === 0) {
    const { data: globalSlots } = await supabase
      .from('timetable_slots')
      .select('*')
      .is('class_id', null)
      .order('period_number', { ascending: true });
    slots = (globalSlots || []) as EngineSlot[];
  }

  // 2. Load all parallel config & data tables
  const [
    allocRes,
    entriesRes,
    buildingsRes,
    classroomsRes,
    groupsRes,
    teacherConsRes,
    classConsRes,
    subjectConsRes,
    relsRes,
    settingsRes,
  ] = await Promise.all([
    supabase
      .from('class_subjects')
      .select(
        'id, class_id, subject_id, teacher_id, periods_per_week, periods_per_card, group_id, allowed_classroom_ids, joint_class_ids, co_teacher_ids, color, profiles(first_name, last_name), subjects(name)'
      ),
    supabase
      .from('timetable_entries')
      .select('id, class_id, class_subject_id, day_of_week, slot_id, classroom_id, room, group_id, is_locked, week_code, card_group_id')
      .eq('is_current', true),
    supabase.from('timetable_buildings').select('*').order('name', { ascending: true }),
    supabase.from('timetable_classrooms').select('*').order('name', { ascending: true }),
    supabase.from('timetable_groups').select('*').order('division_name', { ascending: true }),
    supabase.from('timetable_teacher_constraints').select('*'),
    supabase.from('timetable_class_constraints').select('*'),
    supabase.from('timetable_subject_constraints').select('*'),
    supabase.from('timetable_card_relationships').select('*').order('created_at', { ascending: false }),
    supabase.from('timetable_settings').select('*').eq('id', 1).maybeSingle(),
  ]);

  const lessons: EngineLesson[] = (allocRes.data || []).map((a: Record<string, unknown>) => {
    const prof = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    const sub = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects;
    const p = prof as { first_name?: string; last_name?: string } | null;
    const s = sub as { name?: string } | null;
    return {
      id: String(a.id),
      class_id: String(a.class_id),
      subject_id: a.subject_id ? String(a.subject_id) : null,
      subject_name: s?.name || 'Subject',
      teacher_id: String(a.teacher_id || ''),
      teacher_name: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unassigned',
      periods_per_week: Number(a.periods_per_week || 3),
      periods_per_card: Number(a.periods_per_card || 1),
      group_id: a.group_id ? String(a.group_id) : null,
      allowed_classroom_ids: (a.allowed_classroom_ids as string[]) || [],
      joint_class_ids: (a.joint_class_ids as string[]) || [],
      co_teacher_ids: (a.co_teacher_ids as string[]) || [],
      color: a.color ? String(a.color) : null,
    };
  });

  const teacherConstraints: Record<string, TeacherConstraint> = {};
  for (const tc of (teacherConsRes.data || []) as TeacherConstraint[]) {
    teacherConstraints[tc.teacher_id] = tc;
  }

  const classConstraints: Record<string, ClassConstraint> = {};
  for (const cc of (classConsRes.data || []) as ClassConstraint[]) {
    classConstraints[cc.class_id] = cc;
  }

  const subjectConstraints: Record<string, SubjectConstraint> = {};
  for (const sc of (subjectConsRes.data || []) as SubjectConstraint[]) {
    subjectConstraints[sc.subject_id] = sc;
  }

  const settingsRow = settingsRes.data as Partial<EngineSettings> | null;
  const settings: EngineSettings = {
    days_of_week: settingsRow?.days_of_week?.length
      ? settingsRow.days_of_week
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    auto_relax_constraints: settingsRow?.auto_relax_constraints ?? true,
    lunch_enabled: settingsRow?.lunch_enabled ?? false,
    lunch_min_period: settingsRow?.lunch_min_period ?? 4,
    lunch_max_period: settingsRow?.lunch_max_period ?? 6,
  };

  return {
    slots,
    lessons,
    existingEntries: (entriesRes.data || []) as EngineEntry[],
    buildings: (buildingsRes.data || []) as EngineBuilding[],
    classrooms: (classroomsRes.data || []) as EngineClassroom[],
    groups: (groupsRes.data || []) as EngineGroup[],
    teacherConstraints,
    classConstraints,
    subjectConstraints,
    cardRelationships: (relsRes.data || []) as CardRelationship[],
    settings,
  };
}
