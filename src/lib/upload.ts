// File upload utilities for درمانگر app
// Detects environment:
// - On Vercel with BLOB_READ_WRITE_TOKEN: uses Vercel Blob storage
// - On Vercel without BLOB_READ_WRITE_TOKEN: stores as base64 data URL (fallback)
// - In dev/standalone: saves to local /public/uploads/

import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// Lazy import of @vercel/blob to avoid issues when not available
let putFunction: any = null
async function getVercelBlobPut() {
  if (putFunction !== null) return putFunction
  try {
    const mod = await import('@vercel/blob')
    putFunction = mod.put
  } catch {
    putFunction = false
  }
  return putFunction
}

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const PUBLIC_PREFIX = '/uploads'

// Check if we're on Vercel production
function isVercelProduction(): boolean {
  return !!process.env.VERCEL && process.env.NODE_ENV === 'production'
}

// Check if Vercel Blob is available
function hasVercelBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

export async function ensureUploadDir(): Promise<void> {
  if (isVercelProduction()) return // Cloud storage handles this
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
  const buffer = Buffer.from(await file.arrayBuffer())

  // Strategy 1: Vercel Blob (if token is available)
  if (isVercelProduction() && hasVercelBlob()) {
    try {
      return await saveToVercelBlob(file, buffer, subfolder)
    } catch (e) {
      console.error('Vercel Blob upload failed, falling back to base64:', e)
      // Fall through to base64
    }
  }

  // Strategy 2: Local filesystem (dev or standalone server)
  if (!isVercelProduction()) {
    try {
      return await saveToLocal(file, buffer, subfolder)
    } catch (e) {
      console.error('Local save failed, falling back to base64:', e)
      // Fall through to base64
    }
  }

  // Strategy 3: Base64 data URL (universal fallback — works everywhere)
  return await saveAsBase64(file, buffer)
}

// Save to Vercel Blob storage
async function saveToVercelBlob(
  file: File | { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
  buffer: Buffer,
  subfolder: string
): Promise<SavedFile> {
  const put = await getVercelBlobPut()
  if (!put) throw new Error('@vercel/blob not available')

  const ext = path.extname(file.name) || '.png'
  const safeName = `${randomUUID()}${ext}`
  const pathname = subfolder ? `darmanegar/${subfolder}/${safeName}` : `darmanegar/${safeName}`

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: file.type || 'image/png',
    addRandomSuffix: false,
  })

  return {
    url: blob.url,
    fileName: file.name,
    filePath: blob.url,
  }
}

// Save to local filesystem (dev mode)
async function saveToLocal(
  file: File | { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
  buffer: Buffer,
  subfolder: string
): Promise<SavedFile> {
  await ensureUploadDir()
  const ext = path.extname(file.name) || '.png'
  const safeName = `${randomUUID()}${ext}`
  const dir = subfolder ? path.join(UPLOAD_DIR, subfolder) : UPLOAD_DIR
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, safeName)
  await fs.writeFile(filePath, buffer)
  const url = subfolder ? `${PUBLIC_PREFIX}/${subfolder}/${safeName}` : `${PUBLIC_PREFIX}/${safeName}`
  return { url, fileName: file.name, filePath }
}

// Save as base64 data URL (universal fallback — works on Vercel without Blob)
async function saveAsBase64(
  file: File | { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
  buffer: Buffer
): Promise<SavedFile> {
  const mimeType = file.type || 'image/png'
  const base64 = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`
  return {
    url: dataUrl,
    fileName: file.name,
    filePath: dataUrl,
  }
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
