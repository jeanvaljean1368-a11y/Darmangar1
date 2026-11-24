// POST /api/admin/change-password — change admin password
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromRequest, hashPassword, comparePassword } from '@/lib/auth'
import { ok, unauthorized, bad } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json()
    const currentPassword = body.currentPassword
    const newPassword = body.newPassword

    if (!currentPassword || !newPassword) {
      return bad('رمز فعلی و رمز جدید الزامی است')
    }
    if (newPassword.length < 6) {
      return bad('رمز جدید باید حداقل ۶ کاراکتر باشد')
    }

    const fullAdmin = await db.admin.findUnique({
      where: { id: admin.id },
      select: { id: true, password: true },
    })
    if (!fullAdmin) return unauthorized()

    const valid = await comparePassword(currentPassword, fullAdmin.password)
    if (!valid) return bad('رمز فعلی اشتباه است')

    const hashed = await hashPassword(newPassword)
    await db.admin.update({
      where: { id: admin.id },
      data: { password: hashed },
    })

    return ok({ ok: true, message: 'رمز عبور با موفقیت تغییر کرد' })
  } catch (e: any) {
    return bad('خطا در تغییر رمز', 500)
  }
}
