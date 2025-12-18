'use client'

import { useState, useRef } from 'react'

export interface UploadedImage {
  id: string
  file: File
  preview: string
  mime: string
}

interface ImageUploadProps {
  images: UploadedImage[]
  onImagesChange: (images: UploadedImage[]) => void
  maxImages?: number
  disabled?: boolean
}

/**
 * Image upload component for LinkedIn draft analysis.
 * Supports multiple image uploads with preview and removal.
 */
export function ImageUpload({
  images,
  onImagesChange,
  maxImages = 4,
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: UploadedImage[] = []

    for (let i = 0; i < files.length; i++) {
      if (images.length + newImages.length >= maxImages) break

      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      newImages.push({
        id: `img-${Date.now()}-${i}`,
        file,
        preview: URL.createObjectURL(file),
        mime: file.type,
      })
    }

    onImagesChange([...images, ...newImages])

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (id: string) => {
    const image = images.find((img) => img.id === id)
    if (image) {
      URL.revokeObjectURL(image.preview)
    }
    onImagesChange(images.filter((img) => img.id !== id))
  }

  const canAddMore = images.length < maxImages

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || !canAddMore}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 disabled:bg-white/5 disabled:cursor-not-allowed border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white transition-all"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Add Photo
        </button>

        {images.length > 0 && (
          <span className="text-xs text-slate-500">
            {images.length}/{maxImages} images
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group w-20 h-20 rounded-lg overflow-hidden border border-white/10"
            >
              <img
                src={img.preview}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                disabled={disabled}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Convert UploadedImage to base64 for API consumption.
 */
export async function imageToBase64(image: UploadedImage): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(image.file)
  })
}

/**
 * Convert all uploaded images to API format.
 */
export async function prepareImagesForAPI(
  images: UploadedImage[]
): Promise<{ id: string; mime: string; data: string }[]> {
  return Promise.all(
    images.map(async (img) => ({
      id: img.id,
      mime: img.mime,
      data: await imageToBase64(img),
    }))
  )
}
