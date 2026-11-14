// File upload utilities for درمانگر app
// Saves files to /public/uploads/ and returns the relative URL

import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const PUBLIC_PREFIX = '/uploads'

export async function ensureUploadDir(): Promise<void> {
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
