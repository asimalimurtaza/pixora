import { createClient } from '@/lib/supabase/client'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export interface UploadResult {
  url: string
  path: string
}

export async function uploadMediaFile(
  file: File,
  bucket: 'post-media' | 'avatars' = 'post-media'
): Promise<UploadResult> {
  // 1. Validation
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    throw new Error(`Unsupported file type (${file.type}). Allowed types: JPG, PNG, WEBP, GIF.`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 10MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB.`)
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Authentication required for media upload.')
  }

  // 2. Generate path: userId/timestamp-filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
  const filePath = `${user.id}/${fileName}`

  // 3. Upload to Supabase Storage
  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(`Storage Upload Error: ${error.message}`)
  }

  // 4. Get Public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path)

  return {
    url: publicUrl,
    path: data.path,
  }
}
