const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env file
const envPath = path.join(__dirname, '..', '.env');
console.log('Reading .env from:', envPath);
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error('Error reading .env file:', e.message);
  process.exit(1);
}

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env');
  process.exit(1);
}

console.log('Initializing Supabase client with URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getOrCreateAcademicYear(name, startDate, endDate) {
  const { data: existing } = await supabase.from('academic_years').select('*').eq('name', name).maybeSingle();
  if (existing) {
    console.log(`Academic year '${name}' already exists.`);
    return existing;
  }
  
  const { data, error } = await supabase.from('academic_years').insert({
    name,
    start_date: startDate,
    end_date: endDate,
    is_active: true
  }).select().single();
  
  if (error) {
    console.error(`Error creating academic year ${name}:`, error.message);
    throw error;
  }
  
  console.log(`Created academic year '${name}' (${data.id})`);
  return data;
}

async function getOrCreateTerm(acYearId, name, startDate, endDate, isCurrent) {
  const { data: existing } = await supabase.from('terms').select('*').eq('academic_year_id', acYearId).eq('name', name).maybeSingle();
  if (existing) {
    console.log(`Term '${name}' already exists. Updating properties...`);
    const { data, error } = await supabase.from('terms').update({
      start_date: startDate,
      end_date: endDate,
      is_current: isCurrent
    }).eq('id', existing.id).select().single();
    if (error) console.error(`Error updating term ${name}:`, error.message);
    return data || existing;
  }
  
  const { data, error } = await supabase.from('terms').insert({
    academic_year_id: acYearId,
    name,
    start_date: startDate,
    end_date: endDate,
    is_current: isCurrent
  }).select().single();
  
  if (error) {
    console.error(`Error creating term ${name}:`, error.message);
    throw error;
  }
  
  console.log(`Created term '${name}' (${data.id})`);
  return data;
}

async function getOrCreateClass(name, section) {
  const { data: existing } = await supabase.from('classes').select('*').eq('name', name).eq('section', section).maybeSingle();
  if (existing) {
    console.log(`Class '${name} - ${section}' already exists.`);
    return existing;
  }
  
  const { data, error } = await supabase.from('classes').insert({
    name,
    section
  }).select().single();
  
  if (error) {
    console.error(`Error creating class ${name} - ${section}:`, error.message);
    throw error;
  }
  
  console.log(`Created class '${name} - ${section}' (${data.id})`);
  return data;
}

async function getOrCreateSubject(name, department) {
  const { data: existing } = await supabase.from('subjects').select('*').eq('name', name).maybeSingle();
  if (existing) {
    console.log(`Subject '${name}' already exists.`);
    return existing;
  }
  
  const { data, error } = await supabase.from('subjects').insert({
    name,
    department
  }).select().single();
  
  if (error) {
    console.error(`Error creating subject ${name}:`, error.message);
    throw error;
  }
  
  console.log(`Created subject '${name}' (${data.id})`);
  return data;
}

async function seed() {
  console.log('\n--- Seeding academic years & terms ---');
  const acYear = await getOrCreateAcademicYear('2025-2026', '2025-08-01', '2026-06-30');
  const term1 = await getOrCreateTerm(acYear.id, 'Term 1', '2025-08-01', '2025-11-30', false);
  const term2 = await getOrCreateTerm(acYear.id, 'Term 2', '2025-12-01', '2026-03-31', false);
  const term3 = await getOrCreateTerm(acYear.id, 'Term 3', '2026-04-01', '2026-07-31', true);
  
  console.log('\n--- Seeding classes ---');
  const c1A = await getOrCreateClass('Grade 1', 'A');
  const c1B = await getOrCreateClass('Grade 1', 'B');
  const c2A = await getOrCreateClass('Grade 2', 'A');
  const c3A = await getOrCreateClass('Grade 3', 'A');
  
  console.log('\n--- Seeding subjects ---');
  const subMath = await getOrCreateSubject('Mathematics', 'Mathematics');
  const subEng = await getOrCreateSubject('English Language', 'Languages');
  const subSci = await getOrCreateSubject('Science', 'Sciences');
  const subSoc = await getOrCreateSubject('Social Studies', 'Humanities');
  const subKisw = await getOrCreateSubject('Kiswahili', 'Languages');
  
  console.log('\n--- Fetching existing Auth Users ---');
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 1000
  });
  
  if (listError) {
    console.error('Error listing auth users:', listError.message);
    process.exit(1);
  }
  
  const accountsToCreate = [
    { email: 'admin@leaders.ac.tz', password: 'Admin123!', role: 'System Admin', fn: 'Asha', ln: 'Khamis' },
    { email: 'director@leaders.ac.tz', password: 'Director123!', role: 'Director', fn: 'Juma', ln: 'Hamad' },
    { email: 'principal@leaders.ac.tz', password: 'Principal123!', role: 'Principal', fn: 'Fatma', ln: 'Suleiman' },
    { email: 'accountant@leaders.ac.tz', password: 'Accountant123!', role: 'Accountant', fn: 'Salum', ln: 'Said' },
    { email: 'teacher@leaders.ac.tz', password: 'Teacher123!', role: 'Teacher', fn: 'Mariam', ln: 'Rashid' },
    { email: 'dean@leaders.ac.tz', password: 'Dean123!', role: 'Dean', fn: 'Ali', ln: 'Hassan' },
    { email: 'parent1@leaders.ac.tz', password: 'Parent123!', role: 'Parent', fn: 'Khamis', ln: 'Juma' },
    { email: 'parent2@leaders.ac.tz', password: 'Parent123!', role: 'Parent', fn: 'Mwajuma', ln: 'Ali' },
    { email: 'student1@leaders.ac.tz', password: 'Student123!', role: 'Student', fn: 'Suleiman', ln: 'Khamis' },
    { email: 'student2@leaders.ac.tz', password: 'Student123!', role: 'Student', fn: 'Khadija', ln: 'Khamis' },
    { email: 'student3@leaders.ac.tz', password: 'Student123!', role: 'Student', fn: 'Nassor', ln: 'Ali' },
    { email: 'student4@leaders.ac.tz', password: 'Student123!', role: 'Student', fn: 'Amina', ln: 'Ali' }
  ];
  
  const createdProfiles = {};
  
  console.log('\n--- Seeding Users, Profiles, Staff, Parents ---');
  for (const acc of accountsToCreate) {
    let userId;
    const existingAuthUser = users.find(u => u.email === acc.email);
    
    if (existingAuthUser) {
      userId = existingAuthUser.id;
      console.log(`Auth user ${acc.email} already exists (${userId}). Updating metadata & password...`);
      const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(userId, {
        password: acc.password,
        user_metadata: {
          first_name: acc.fn,
          last_name: acc.ln,
          role: acc.role
        }
      });
      if (updateAuthErr) {
        console.error(`Failed to update Auth User metadata for ${acc.email}:`, updateAuthErr.message);
      }
    } else {
      console.log(`Creating Auth User: ${acc.email}`);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          first_name: acc.fn,
          last_name: acc.ln,
          role: acc.role
        }
      });
      
      if (authError) {
        console.error(`Failed to create Auth User ${acc.email}:`, authError.message);
        continue;
      }
      userId = authData.user.id;
    }
    
    // Upsert Profile
    console.log(`Upserting Profile: ${acc.fn} ${acc.ln} (${acc.role})`);
    const { data: profile, error: profileErr } = await supabase.from('profiles').upsert({
      id: userId,
      first_name: acc.fn,
      last_name: acc.ln,
      email: acc.email,
      role: acc.role,
      is_active: true
    }).select().single();
    
    if (profileErr) {
      console.error(`Failed to upsert Profile for ${acc.email}:`, profileErr.message);
      continue;
    }
    
    createdProfiles[acc.email] = profile;
    
    // Upsert Staff
    const staffRoles = ['System Admin', 'Director', 'Principal', 'Accountant', 'Teacher', 'Dean'];
    if (staffRoles.includes(acc.role)) {
      console.log(`Upserting Staff record for: ${acc.email}`);
      const empNum = Math.floor(1000 + Math.random() * 9000);
      const { error: staffErr } = await supabase.from('staff').upsert({
        id: userId,
        employee_id: `EMP-${empNum}`,
        job_title: acc.role,
        department: ['Teacher', 'Dean'].includes(acc.role) ? 'Academics' : (acc.role === 'Accountant' ? 'Finance' : 'Administration'),
        hire_date: '2020-01-15'
      });
      if (staffErr) {
        console.error(`Failed to upsert Staff record for ${acc.email}:`, staffErr.message);
      }
    }
    
    // Upsert Parent
    if (acc.role === 'Parent') {
      console.log(`Upserting Parent record for: ${acc.email}`);
      const { error: parentErr } = await supabase.from('parents').upsert({
        id: userId,
        occupation: acc.email.includes('1') ? 'Business Owner' : 'Architect',
        phone_primary: acc.email.includes('1') ? '+255712345678' : '+255787654321'
      });
      if (parentErr) {
        console.error(`Failed to upsert Parent record for ${acc.email}:`, parentErr.message);
      }
    }
  }
  
  console.log('\n--- Seeding students records ---');
  const studentsToEnroll = [
    { email: 'student1@leaders.ac.tz', student_id: 'STUD-0001', grade_level: 'Grade 1', section: 'A', dob: '2015-05-12', gender: 'Male', biometric_id: 'BIO-001' },
    { email: 'student2@leaders.ac.tz', student_id: 'STUD-0002', grade_level: 'Grade 1', section: 'A', dob: '2015-09-22', gender: 'Female', biometric_id: 'BIO-002' },
    { email: 'student3@leaders.ac.tz', student_id: 'STUD-0003', grade_level: 'Grade 2', section: 'A', dob: '2014-04-18', gender: 'Male', biometric_id: 'BIO-003' },
    { email: 'student4@leaders.ac.tz', student_id: 'STUD-0004', grade_level: 'Grade 3', section: 'A', dob: '2013-11-05', gender: 'Female', biometric_id: 'BIO-004' }
  ];
  
  for (const s of studentsToEnroll) {
    const profile = createdProfiles[s.email];
    if (!profile) {
      console.error(`Skipping student record for ${s.email} - Profile not found.`);
      continue;
    }
    
    console.log(`Upserting Student: ${s.email} (${s.student_id})`);
    const { error: studErr } = await supabase.from('students').upsert({
      id: profile.id,
      student_id: s.student_id,
      grade_level: s.grade_level,
      section: s.section,
      dob: s.dob,
      gender: s.gender,
      nationality: 'Tanzanian',
      biometric_id: s.biometric_id
    });
    
    if (studErr) {
      console.error(`Failed to upsert student ${s.email}:`, studErr.message);
    }
  }
  
  console.log('\n--- Seeding student-parent relationships ---');
  const studentParentLinks = [
    { studentEmail: 'student1@leaders.ac.tz', parentEmail: 'parent1@leaders.ac.tz', relationship: 'Father' },
    { studentEmail: 'student2@leaders.ac.tz', parentEmail: 'parent1@leaders.ac.tz', relationship: 'Father' },
    { studentEmail: 'student3@leaders.ac.tz', parentEmail: 'parent2@leaders.ac.tz', relationship: 'Mother' },
    { studentEmail: 'student4@leaders.ac.tz', parentEmail: 'parent2@leaders.ac.tz', relationship: 'Mother' }
  ];
  
  for (const link of studentParentLinks) {
    const studProfile = createdProfiles[link.studentEmail];
    const parentProfile = createdProfiles[link.parentEmail];
    
    if (!studProfile || !parentProfile) {
      console.error(`Skipping link for ${link.studentEmail} and ${link.parentEmail} - profiles missing.`);
      continue;
    }
    
    console.log(`Linking parent ${link.parentEmail} to student ${link.studentEmail}`);
    const { error: linkErr } = await supabase.from('student_parents').upsert({
      student_id: studProfile.id,
      parent_id: parentProfile.id,
      relationship: link.relationship,
      is_emergency_contact: true
    });
    
    if (linkErr) {
      console.error(`Failed to link parent/student:`, linkErr.message);
    }
  }
  
  console.log('\n--- Seeding class-subject assignments ---');
  // Clear any existing class subject assignments first
  await supabase.from('class_subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Link Sarah Teacher (teacher@leaders.ac.tz) to Grade 1-A Mathematics, English, Science
  const teacherProfile = createdProfiles['teacher@leaders.ac.tz'];
  if (teacherProfile && c1A) {
    console.log(`Assigning Teacher (${teacherProfile.first_name}) to Grade 1-A subjects...`);
    
    const subjectList = [subMath, subEng, subSci];
    for (const sub of subjectList) {
      console.log(`Assigning ${sub.name} to teacher...`);
      const { error: assignErr } = await supabase.from('class_subjects').insert({
        class_id: c1A.id,
        subject_id: sub.id,
        teacher_id: teacherProfile.id
      });
      
      if (assignErr) {
        console.error(`Failed to assign subject ${sub.name}:`, assignErr.message);
      }
    }
  }
  
  console.log('\nSeeding completed successfully!');
}

seed().catch(err => {
  console.error('Unhandled seeding error:', err);
  process.exit(1);
});
