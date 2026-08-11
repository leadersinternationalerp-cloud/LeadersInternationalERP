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
  console.log('--- classes columns and rows ---');
  const classes = await supabase.rpc('pg_table_columns', { table_name: 'classes' }).limit(50);
  console.log('classes columns result', classes.error || classes.data);
})();
