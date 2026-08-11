const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = envFile.split(/\r?\n/).reduce((acc, line) => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
  if (m) {
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    acc[m[1]] = value;
  }
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const schema = await supabase.from('information_schema.columns').select('column_name,data_type').eq('table_name','classes');
  console.log('classes schema', schema.error || schema.data);

  const classes = await supabase.from('classes').select('*').limit(50);
  console.log('classes error', classes.error);
  console.log('classes count', classes.data?.length);
  console.log(JSON.stringify(classes.data, null, 2));

  const students = await supabase.from('students').select('id,student_id,grade_level,section,class_id').limit(50);
  console.log('students error', students.error);
  console.log('students count', students.data?.length);
  console.log(JSON.stringify(students.data, null, 2));

  const studentClasses = await supabase.from('student_classes').select('student_id,class_id').limit(50);
  console.log('student_classes error', studentClasses.error);
  console.log('student_classes count', studentClasses.data?.length);
  console.log(JSON.stringify(studentClasses.data, null, 2));

  const match = await supabase.from('classes').select('id,name,section,grade_level,class_name').eq('name','Grade 1').eq('section','A').maybeSingle();
  console.log('Grade 1 A class record', JSON.stringify(match.data, null, 2));

  const st = await supabase.from('students').select('id,student_id,grade_level,section,class_id').eq('grade_level','Grade 1').eq('section','A');
  console.log('Grade 1 A students count', st.data?.length);
  console.log(JSON.stringify(st.data, null, 2));
})();
