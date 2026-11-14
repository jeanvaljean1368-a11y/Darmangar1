// POST /api/admin/login
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { comparePassword, signAdminToken, ensureDefaultAdmin } from '@/lib/auth'
import { ok, bad, setCookieHeader } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultAdmin()
    const { username, password } = await request.json()
    if (!username || !password) return bad('نام کاربری و رمز عبور الزامی است')

    const admin = await db.admin.findUnique({ where: { username: username.trim().toLowerCase() } })
    if (!admin) return bad('نام کاربری یا رمز عبور اشتباه است')

    const valid = await comparePassword(password, admin.password)
    if (!valid) return bad('نام کاربری یا رمز عبور اشتباه است')

    const token = signAdminToken({
      adminId: admin.id,
      username: admin.username,
      role: 'admin',
    })

    const res = ok({ ok: true, admin: { id: admin.id, username: admin.username } })
    res.headers.set('Set-Cookie', setCookieHeader('admin-token', token, 7))
    return res
  } catch (e: any) {
    console.error('Admin login error:', e)
    return bad('خطا در ورود', 500)
  }
}
