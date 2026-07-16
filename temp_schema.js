const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://zqcjnfcwxkeapwzhifsy.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2puZmN3eGtlYXB3emhpZnN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU5MjUyNSwiZXhwIjoyMDk5MTY4NTI1fQ.vx8f5zb7kCeKhEK-Tm9bUQxHRPr0F88FizWnD72Tt5o'
);

// We can infer the columns by trying to select all of them
supabase.from('notifications').select('*').limit(1).then(console.log).catch(console.error);
