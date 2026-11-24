// POST /api/feedback/submit — submit system feedback (public, no auth needed)
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, bad, toEnglishDigits } from '@/lib/http'
import { FeedbackType } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_TYPES: FeedbackType[] = ['SUGGESTION', 'COMPLAINT', 'COMPLIMENT', 'BUG_REPORT', 'QUESTION', 'OTHER']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = body.name?.trim() || null
    const phone = body.phone ? toEnglishDigits(body.phone.trim()) : null
    const email = body.email?.trim() || null
    const type = body.type as FeedbackType
    const subject = body.subject?.trim()
    const message = body.message?.trim()
    const userRole = body.userRole?.trim() || null
    const providerId = body.providerId?.trim() || null

    // Validation
    if (!type || !VALID_TYPES.includes(type)) {
      return bad('نوع بازخورد معتبر نیست')
    }
    if (!subject || subject.length < 3) {
      return bad('موضوع باید حداقل ۳ کاراکتر باشد')
    }
    if (subject.length > 200) {
      return bad('موضوع نباید بیشتر از ۲۰۰ کاراکتر باشد')
    }
    if (!message || message.length < 10) {
      return bad('متن بازخورد باید حداقل ۱۰ کاراکتر باشد')
    }
    if (message.length > 2000) {
      return bad('متن بازخورد نباید بیشتر از ۲۰۰۰ کاراکتر باشد')
    }
    if (phone && !/^09\d{9}$/.test(phone)) {
      return bad('شماره موبایل معتبر نیست (مثال: 09121234567)')
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return bad('ایمیل معتبر نیست')
    }

    const feedback = await db.systemFeedback.create({
      data: {
        name,
        phone,
        email,
        type,
        subject,
        message,
        userRole,
        providerId: providerId || null,
      },
    })

    return ok({
      ok: true,
      id: feedback.id,
      message: 'بازخورد شما با موفقیت ثبت شد. از همراهی شما سپاسگزاریم!',
    })
  } catch (e: any) {
    console.error('Feedback submit error:', e)
    return bad(`خطا در ثبت بازخورد: ${e.message || 'نامشخص'}`, 500)
  }
}
