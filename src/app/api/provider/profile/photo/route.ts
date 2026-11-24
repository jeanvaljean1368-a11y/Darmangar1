// POST /api/provider/profile/photo — change profile photo
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getProviderFromRequest } from '@/lib/auth'
import { ok, unauthorized, bad } from '@/lib/http'
import { saveFile, validateFile } from '@/lib/upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const provider = await getProviderFromRequest(request)
  if (!provider) return unauthorized()

  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File | null

    if (!file || file.size === 0) {
      return bad('فایل عکس الزامی است')
    }

    const check = validateFile(file, ['image/'], 5)
    if (!check.ok) return bad(check.error!)

    const saved = await saveFile(file, 'profiles')

    await db.provider.update({
      where: { id: provider.id },
      data: { profilePhoto: saved.url },
    })

    return ok({
      ok: true,
      profilePhoto: saved.url,
      message: 'عکس پروفایل به‌روزرسانی شد',
    })
  } catch (e: any) {
    console.error('Profile photo error:', e)
    return bad(`خطا در آپلود عکس: ${e.message || 'نامشخص'}`, 500)
  }
}
