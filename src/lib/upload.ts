// File upload utilities for درمانگر app
// Detects environment:
// - On Vercel (with BLOB_READ_WRITE_TOKEN): uses Vercel Blob storage
// - In dev/standalone: saves to local /public/uploads/

import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { put } from '@vercel/blob'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const PUBLIC_PREFIX = '/uploads'

// Check if we're on Vercel production
function isVercelProduction(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV === 'production'
}

export async function ensureUploadDir(): Promise<void> {
  if (isVercelProduction()) return // Vercel Blob handles this
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  } catch {
    // dir exists
  }
}

export interface SavedFile {
  url: string
  fileName: string
  filePath: string
}

export async function saveFile(
  file: File | { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
  subfolder = ''
): Promise<SavedFile> {
  // On Vercel production: use Vercel Blob
  if (isVercelProduction()) {
    return await saveToVercelBlob(file, subfolder)
  }
  // In dev: save to local filesystem
  return await saveToLocal(file, subfolder)
}

// Save to Vercel Blob storage
async function saveToVercelBlob(
  file: File | { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
  subfolder: string
): Promise<SavedFile> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = path.extname(file.name) || '.png'
  const safeName = `${randomUUID()}${ext}`
  const pathname = subfolder ? `darmanegar/${subfolder}/${safeName}` : `darmanegar/${safeName}`

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: file.type || 'image/png',
    addRandomSuffix: false,
  })

  return {
    url: blob.url, // full Vercel Blob URL
    fileName: file.name,
    filePath: blob.url,
  }
}

// Save to local filesystem (dev mode)
async function saveToLocal(
  file: File | { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
  subfolder: string
): Promise<SavedFile> {
  await ensureUploadDir()
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = path.extname(file.name) || '.png'
  const safeName = `${randomUUID()}${ext}`
  const dir = subfolder ? path.join(UPLOAD_DIR, subfolder) : UPLOAD_DIR
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, safeName)
  await fs.writeFile(filePath, buffer)
  const url = subfolder ? `${PUBLIC_PREFIX}/${subfolder}/${safeName}` : `${PUBLIC_PREFIX}/${safeName}`
  return { url, fileName: file.name, filePath }
}

// Validate file type and size
export function validateFile(file: File, allowedTypes: string[] = ['image/'], maxSizeMB = 5): { ok: boolean; error?: string } {
  const isValidType = allowedTypes.some((t) => file.type.startsWith(t))
  if (!isValidType) {
    return { ok: false, error: 'فرمت فایل مجاز نیست. فقط تصویر مجاز است.' }
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { ok: false, error: `حجم فایل نباید بیشتر از ${maxSizeMB} مگابایت باشد.` }
  }
  return { ok: true }
}
