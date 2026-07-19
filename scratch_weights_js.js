const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envFiles = ['.env', '.env.local']
  envFiles.forEach(file => {
    const envPath = path.join(__dirname, file)
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      content.split('\n').forEach(line => {
        const parts = line.split('=')
        if (parts.length >= 2) {
          const key = parts[0].trim()
          const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '')
          process.env[key] = value
        }
      })
    }
  })
}

loadEnv()

async function test() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .limit(1)

  console.log('--- Table classes ---')
  console.log('Error:', error)
  console.log('Data:', data)
}

test().catch(console.error)
