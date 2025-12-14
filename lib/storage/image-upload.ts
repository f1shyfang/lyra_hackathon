import { createClient } from '@/lib/supabase/server'

const BUCKET_NAME = 'draft-images'
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB (Gemini limit)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export interface UploadedImage {
  url: string
  path: string
}

/**
 * Upload images to Supabase Storage
 * @param files Array of File objects to upload
 * @param draftId Draft ID to organize images in storage
 * @returns Array of uploaded image URLs
 */
export async function uploadImages(
  files: File[],
  draftId: string
): Promise<UploadedImage[]> {
  const supabase = await createClient()
  const uploadedImages: UploadedImage[] = []

  for (const file of files) {
    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `drafts/${draftId}/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
    }

    // Get public URL
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)

    uploadedImages.push({
      url: data.publicUrl,
      path: filePath,
    })
  }

  return uploadedImages
}

/**
 * Delete images from Supabase Storage
 * @param paths Array of storage paths to delete
 */
export async function deleteImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return

  const supabase = await createClient()

  const { error } = await supabase.storage.from(BUCKET_NAME).remove(paths)

  if (error) {
    throw new Error(`Failed to delete images: ${error.message}`)
  }
}

/**
 * Extract storage path from public URL
 * @param url Public URL from Supabase Storage
 * @returns Storage path
 */
export function extractPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    // Supabase storage URLs typically have the path after the bucket name
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

