import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Authorize role
    const { data: roleData } = await supabase.rpc('get_user_role', { user_id: user.id })
    const userRole = (roleData || '').toString()

    const ALLOWED_ROLES = ['Teacher', 'Principal', 'Dean', 'HOS', 'System Admin', 'Director']
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized: Insufficient permissions' }, { status: 403 })
    }

    // 3. Parse FormData
    const formData = await req.formData()
    const file = formData.get('evidence') as File | null
    const studentId = formData.get('student_id') as string | null
    const learningArea = formData.get('learning_area') as string | null

    if (!file || !studentId || !learningArea) {
      return NextResponse.json({ error: 'Missing required parameters: evidence file, student_id, and learning_area are required' }, { status: 400 })
    }

    // 4. Validate image type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 })
    }
    const maxSizeBytes = 8 * 1024 * 1024 // 8MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: 'File size exceeds maximum limit of 8MB.' }, { status: 400 })
    }

    // 5. Upload to ey-evidence bucket
    const supabaseService = createServiceClient()
    const cleanArea = learningArea.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${studentId}/${cleanArea}_${Date.now()}.${ext}`
    
    const buffer = Buffer.from(await file.arrayBuffer())

    const { data, error: uploadError } = await supabaseService.storage
      .from('ey-evidence')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload error: ${uploadError.message}` }, { status: 500 })
    }

    // Get publicUrl
    const { data: { publicUrl } } = supabaseService.storage
      .from('ey-evidence')
      .getPublicUrl(fileName)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error: any) {
    console.error('Evidence upload error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
