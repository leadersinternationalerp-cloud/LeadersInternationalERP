const { createClient } = require('@supabase/supabase-js');
const serviceClient = createClient(
  'https://zqcjnfcwxkeapwzhifsy.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2puZmN3eGtlYXB3emhpZnN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5MjUyNSwiZXhwIjoyMDk5MTY4NTI1fQ.vx8f5zb7kCeKhEK-Tm9bUQxHRPr0F88FizWnD72Tt5o'
);

async function checkLogin() {
  const usernameOrEmail = 'sysadmin@leaders.ac.tz';
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('*')
    .or(`username.eq."${usernameOrEmail}",email.eq."${usernameOrEmail}"`)
    .maybeSingle()
  console.log("Profile:", profile);
  console.log("Error:", profileError);
}
checkLogin();
