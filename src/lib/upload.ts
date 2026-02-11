import { apiFetch } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const EXTENSION_TYPE_MAP: Record<string, string> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'txt',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check MIME type with extension fallback
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const isValidMime = ALLOWED_MIME_TYPES.includes(file.type)
  const isValidExt = ext in EXTENSION_TYPE_MAP

  if (!isValidMime && !isValidExt) {
    return { valid: false, error: 'Only PDF, DOCX, and TXT files are accepted.' }
  }

  if (file.size <= 0) {
    return { valid: false, error: 'File is empty.' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds 10 MB limit.' }
  }

  return { valid: true }
}

function getFileType(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPE_MAP[ext] ?? 'pdf'
}

export async function uploadToStorage(
  file: File,
  uploadType: 'cv' | 'jd',
  userId: string,
): Promise<string> {
  const supabase = createClient()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${userId}/${uploadType}/${Date.now()}_${sanitizedName}`

  const { error } = await supabase.storage.from('documents').upload(storagePath, file)

  if (error) throw new Error(`Upload failed: ${error.message}`)
  return storagePath
}

export async function removeFromStorage(storagePath: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from('documents').remove([storagePath])
}

interface UploadResult {
  uploadId: string
  storagePath: string
}

export async function uploadAndNotify(
  file: File,
  uploadType: 'cv' | 'jd',
  userId: string,
): Promise<UploadResult> {
  // 1. Upload to Storage
  const storagePath = await uploadToStorage(file, uploadType, userId)

  // 2. Notify backend (retry up to 3 times)
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await apiFetch<{ upload_id: string; storage_path: string }>('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
          storage_path: storagePath,
          file_name: file.name,
          file_type: getFileType(file),
          file_size: file.size,
          upload_type: uploadType,
        }),
      })
      return { uploadId: result.upload_id, storagePath: result.storage_path }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }

  // All retries failed — clean up orphaned file
  await removeFromStorage(storagePath).catch(() => {})
  throw lastError ?? new Error('Upload notification failed')
}
