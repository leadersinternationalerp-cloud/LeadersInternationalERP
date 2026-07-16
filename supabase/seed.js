const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

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

const curriculumData = require('../src/lib/data/curriculum/all_subjects.json');
const CAMBRIDGE_SUBJECT_CODE_MAP = {
  'Art and Craft': 'ART',
  'Computing': 'COMP',
  'Digital Literacy': 'DIGI',
  'English Language': 'ENG',
  'Global Perspectives': 'GLOB',
  'Mathematics': 'MATH',
  'Music': 'MUS',
  'Science': 'SCI'
};

async function getOrCreateCambridgeStage(stageName) {
  const { data: existing } = await supabase.from('cambridge_stages').select('*').eq('stage_name', stageName).maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase.from('cambridge_stages').insert({
    stage_name: stageName,
    description: `Cambridge syllabus content for ${stageName}`
  }).select().single();

  if (error) {
    console.error(`Error creating cambridge stage ${stageName}:`, error.message);
    throw error;
  }

  console.log(`Created stage '${stageName}' (${data.id})`);
  return data;
}

async function getOrCreateCambridgeSubject(stageId, subjectName) {
  const { data: existing } = await supabase.from('cambridge_subjects').select('*')
    .eq('stage_id', stageId)
    .eq('subject_name', subjectName)
    .maybeSingle();
  if (existing) return existing;

  const subjectCode = CAMBRIDGE_SUBJECT_CODE_MAP[subjectName] || null;
  const { data, error } = await supabase.from('cambridge_subjects').insert({
    stage_id: stageId,
    subject_name: subjectName,
    subject_code: subjectCode,
    name: subjectName,
    code: subjectCode
  }).select().single();

  if (error) {
    console.error(`Error creating cambridge subject ${subjectName} for stage ${stageId}:`, error.message);
    throw error;
  }

  console.log(`Created cambridge subject '${subjectName}' for stage ${stageId}`);
  return data;
}

async function getOrCreateCambridgeUnit(cambridgeSubjectId, unitNumber, unitTitle) {
  const { data: existing } = await supabase.from('cambridge_units').select('*')
    .eq('cambridge_subject_id', cambridgeSubjectId)
    .eq('unit_number', unitNumber)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase.from('cambridge_units').insert({
    cambridge_subject_id: cambridgeSubjectId,
    unit_number: unitNumber,
    unit_title: unitTitle
  }).select().single();

  if (error) {
    console.error(`Error creating cambridge unit ${unitTitle}:`, error.message);
    throw error;
  }

  return data;
}

async function getOrCreateCambridgeTopic(unitId, topicNumber, topicTitle) {
  const { data: existing } = await supabase.from('cambridge_topics').select('*')
    .eq('unit_id', unitId)
    .eq('topic_title', topicTitle)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase.from('cambridge_topics').insert({
    unit_id: unitId,
    topic_number: topicNumber,
    topic_title: topicTitle
  }).select().single();

  if (error) {
    console.error(`Error creating cambridge topic ${topicTitle}:`, error.message);
    throw error;
  }

  return data;
}

async function createCambridgeLearningObjectives(topicId, content) {
  const lines = String(content).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return;

  const { error: deleteError } = await supabase.from('cambridge_learning_objectives').delete().eq('topic_id', topicId);
  if (deleteError) {
    console.error(`Error clearing existing objectives for topic ${topicId}:`, deleteError.message);
  }

  for (let i = 0; i < lines.length; i += 1) {
    const objectiveText = lines[i];
    const objectiveCode = `OBJ-${i + 1}`;
    const { error } = await supabase.from('cambridge_learning_objectives').insert({
      topic_id: topicId,
      objective_code: objectiveCode,
      objective_text: objectiveText
    });
    if (error) {
      console.error(`Error creating objective for topic ${topicId}:`, error.message);
    }
  }
}

function normalizeTextKey(value) {
  return (value || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function buildDefaultObjectives(subjectName, stageName, topicTitle) {
  const cleanSubject = normalizeTextKey(subjectName);
  const cleanTopic = topicTitle.trim();
  const gradeText = stageName.replace(/Stage/gi, 'Grade').trim();
  const objectives = [];

  if (cleanSubject.includes('mathematics') || cleanSubject === 'math') {
    objectives.push(`Understand the key idea behind ${cleanTopic}.`);
    objectives.push(`Use simple examples to explain ${cleanTopic} in a real-world context.`);
    objectives.push(`Solve a basic problem or question related to ${cleanTopic}.`);
  } else if (cleanSubject.includes('science')) {
    objectives.push(`Describe what ${cleanTopic} is and why it matters in science.`);
    objectives.push(`Identify one or two important facts or features about ${cleanTopic}.`);
    objectives.push(`Use a local example to explain ${cleanTopic} in Tanzania.`);
  } else if (cleanSubject.includes('english')) {
    objectives.push(`Read and understand the language ideas in ${cleanTopic}.`);
    objectives.push(`Use correct words or sentences related to ${cleanTopic}.`);
    objectives.push(`Answer simple questions about ${cleanTopic}.`);
  } else if (cleanSubject.includes('computing') || cleanSubject.includes('digital literacy')) {
    objectives.push(`Explain the main concept of ${cleanTopic} in simple terms.`);
    objectives.push(`Recognize how ${cleanTopic} is used in everyday technology.`);
    objectives.push(`Apply a basic idea from ${cleanTopic} to a small activity or example.`);
  } else if (cleanSubject.includes('art') || cleanSubject.includes('craft')) {
    objectives.push(`Understand the materials and process used in ${cleanTopic}.`);
    objectives.push(`Describe how ${cleanTopic} can show ideas, feelings, or local culture.`);
    objectives.push(`Create or imagine a simple art activity based on ${cleanTopic}.`);
  } else if (cleanSubject.includes('music')) {
    objectives.push(`Recognize the sound, rhythm, or instrument related to ${cleanTopic}.`);
    objectives.push(`Explain one basic idea about ${cleanTopic} in a simple sentence.`);
    objectives.push(`Use a local or cultural example to describe ${cleanTopic}.`);
  } else if (cleanSubject.includes('global') || cleanSubject.includes('perspectives')) {
    objectives.push(`Explain why ${cleanTopic} is important for the community or environment.`);
    objectives.push(`Identify one local connection for ${cleanTopic} in Zanzibar.`);
    objectives.push(`Share a simple idea about how ${cleanTopic} helps people learn about the world.`);
  } else {
    objectives.push(`Understand the main idea of ${cleanTopic}.`);
    objectives.push(`Name one important fact or example about ${cleanTopic}.`);
    objectives.push(`Use ${cleanTopic} in a simple real-world sentence or example.`);
  }

  return objectives.join('\n');
}

async function generateLearningObjectivesWithGemini(subjectName, stageName, topicTitle) {
  if (!geminiApiKey) {
    return null;
  }

  try {
    const prompt = `Create three concise Cambridge Primary learning objectives for ${subjectName} ${stageName} on the topic '${topicTitle}'. Each objective should be simple enough for ${stageName.replace(/Stage/gi, 'Grade')} students in Zanzibar, Tanzania. Return one objective per line with no extra explanation.`;
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const lines = text
      .split(/\r?\n/)
      .map(line => line.replace(/^\d+\.|^-\s*/, '').trim())
      .filter(Boolean);
    if (lines.length) {
      return lines.join('\n');
    }
  } catch (err) {
    console.warn('Gemini objective generation failed:', err?.message || err);
  }

  return null;
}

async function resolveLearningObjectives(subjectName, stageName, topicTitle) {
  const geminiResult = await generateLearningObjectivesWithGemini(subjectName, stageName, topicTitle);
  if (geminiResult) {
    return geminiResult;
  }
  return buildDefaultObjectives(subjectName, stageName, topicTitle);
}

async function seedCambridgeSyllabus() {
  console.log('\n--- Seeding Cambridge syllabus tables ---');

  const stageNames = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Stage 6'];

  for (const stageName of stageNames) {
    const stage = await getOrCreateCambridgeStage(stageName);

    for (const subjectName of Object.keys(curriculumData)) {
      const subjectEntry = await getOrCreateCambridgeSubject(stage.id, subjectName);
      const unitTitle = `${subjectName} ${stageName}`;
      const unit = await getOrCreateCambridgeUnit(subjectEntry.id, 1, unitTitle);

      const topics = curriculumData[subjectName][stageName] || [];
      for (let idx = 0; idx < topics.length; idx += 1) {
        const topicItem = topics[idx];
        const topicTitle = (topicItem.topic || '').trim();
        if (!topicTitle) continue;
        const topicNumber = `T${idx + 1}`;
        const topicRow = await getOrCreateCambridgeTopic(unit.id, topicNumber, topicTitle);
      const hasContent = String(topicItem.content || '').trim();
      const objectivesSource = hasContent
        ? topicItem.content
        : await resolveLearningObjectives(subjectName, stageName, topicTitle);

      await createCambridgeLearningObjectives(topicRow.id, objectivesSource);
    }
  }
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
      username: acc.email.split('@')[0],
      role: acc.role,
      roles: [acc.role],
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

  await seedCambridgeSyllabus();
  
  console.log('\nSeeding completed successfully!');
}

seed().catch(err => {
  console.error('Unhandled seeding error:', err);
  process.exit(1);
});
