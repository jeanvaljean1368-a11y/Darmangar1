// POST /api/provider/register
// Provider registration with documents

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, signProviderToken } from '@/lib/auth'
import { ok, bad, setCookieHeader, isValidNationalId, toEnglishDigits } from '@/lib/http'
import { saveFile, validateFile } from '@/lib/upload'
import { REQUIRED_DOCUMENTS, FREE_PROPOSAL_LIMIT, FREE_PROPOSAL_WITH_REFERRAL, DOCUMENT_LABELS } from '@/lib/constants'
import { ServiceType, DocumentType } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const firstName = (formData.get('firstName') as string)?.trim()
    const lastName = (formData.get('lastName') as string)?.trim()
    const nationalId = toEnglishDigits((formData.get('nationalId') as string)?.trim() || '')
    const username = (formData.get('username') as string)?.trim().toLowerCase()
    const password = (formData.get('password') as string)?.trim()
    const serviceType = (formData.get('serviceType') as string)?.trim() as ServiceType
    const isWoundSpecialist = formData.get('isWoundSpecialist') === 'true' || formData.get('isWoundSpecialist') === 'on'
    const province = (formData.get('province') as string)?.trim()
    const city = (formData.get('city') as string)?.trim()
    const servedNeighborhoodsRaw = (formData.get('servedNeighborhoods') as string)?.trim() || '[]'
    let servedNeighborhoods: string[] = []
    try {
      const parsed = JSON.parse(servedNeighborhoodsRaw)
      if (Array.isArray(parsed)) {
        servedNeighborhoods = parsed.filter((n) => typeof n === 'string' && n.trim().length > 0).map((n) => n.trim())
      }
    } catch {
      // ignore parse error
    }
    const referralCode = (formData.get('referralCode') as string)?.trim() || null

    // Validate required fields
    if (!firstName || !lastName) return bad('نام و نام خانوادگی الزامی است')
    if (!nationalId || !isValidNationalId(nationalId)) return bad('کد ملی معتبر نیست')
    if (!username || username.length < 4) return bad('نام کاربری باید حداقل ۴ کاراکتر باشد')
    if (!password || password.length < 6) return bad('رمز عبور باید حداقل ۶ کاراکتر باشد')
    if (!serviceType || !['NURSING', 'CAREGIVER', 'WOUND_SPECIALIST', 'MASSAGE', 'PHYSIOTHERAPY'].includes(serviceType)) {
      return bad('نوع خدمت معتبر نیست')
    }
    if (!province) return bad('استان الزامی است')
    if (!city) return bad('شهر الزامی است')
    if (servedNeighborhoods.length === 0) return bad('حداقل یک محله برای سرویس‌دهی انتخاب کنید')

    // Check unique fields
    const existingUser = await db.provider.findFirst({
      where: {
        OR: [
          { username },
          { nationalId },
        ],
      },
    })
    if (existingUser) {
      if (existingUser.username === username) return bad('این نام کاربری قبلاً ثبت شده')
      return bad('این کد ملی قبلاً ثبت شده')
    }

    // Validate referral code if provided
    let referrerId: string | null = null
    if (referralCode) {
      const referrer = await db.provider.findFirst({
        where: { referralCode },
        select: { id: true, status: true },
      })
      if (!referrer) return bad('کد معرف معتبر نیست')
      referrerId = referrer.id
    }

    // Get required documents
    const requiredDocs = REQUIRED_DOCUMENTS[serviceType] || []
    const uploadedDocs: { type: DocumentType; fileUrl: string; fileName: string }[] = []

    // Profile photo (required)
    const profilePhoto = formData.get('profilePhoto') as File | null
    if (!profilePhoto || profilePhoto.size === 0) {
      return bad('عکس پروفایل الزامی است')
    }
    const photoCheck = validateFile(profilePhoto)
    if (!photoCheck.ok) return bad(photoCheck.error!)
    let photoSaved
    try {
      photoSaved = await saveFile(profilePhoto, 'profiles')
    } catch (uploadErr: any) {
      console.error('Profile photo upload error:', uploadErr)
      return bad(`خطا در آپلود عکس پروفایل: ${uploadErr.message || 'خطای نامشخص'}. لطفاً دوباره تلاش کنید.`)
    }

    // Validate and save each required document
    for (const docType of requiredDocs) {
      const file = formData.get(`doc_${docType}`) as File | null
      if (!file || file.size === 0) {
        return bad(`بارگذاری ${DOCUMENT_LABELS[docType]} الزامی است`)
      }
      const check = validateFile(file)
      if (!check.ok) return bad(check.error!)
      let saved
      try {
        saved = await saveFile(file, 'documents')
      } catch (uploadErr: any) {
        console.error(`Document ${docType} upload error:`, uploadErr)
        return bad(`خطا در آپلود ${DOCUMENT_LABELS[docType]}: ${uploadErr.message || 'خطای نامشخص'}. لطفاً دوباره تلاش کنید.`)
      }
      uploadedDocs.push({
        type: docType,
        fileUrl: saved.url,
        fileName: saved.fileName,
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Determine free proposal count
    const freeProposalCount = referrerId ? FREE_PROPOSAL_WITH_REFERRAL : FREE_PROPOSAL_LIMIT

    // Create provider with documents
    const provider = await db.provider.create({
      data: {
        firstName,
        lastName,
        nationalId,
        username,
        password: hashedPassword,
        profilePhoto: photoSaved.url,
        serviceType,
        isWoundSpecialist: serviceType === 'WOUND_SPECIALIST' || isWoundSpecialist,
        province,
        city,
        servedNeighborhoods: JSON.stringify(servedNeighborhoods),
        referredById: referrerId,
        freeProposalCount,
        status: 'PENDING',
        documents: {
          create: uploadedDocs.map((d) => ({
            type: d.type,
            fileUrl: d.fileUrl,
            fileName: d.fileName,
          })),
        },
      },
      include: { documents: true },
    })

    // Generate token
    const token = signProviderToken({
      providerId: provider.id,
      username: provider.username,
      role: 'provider',
    })

    const responseBody = ok({
      ok: true,
      provider: {
        id: provider.id,
        username: provider.username,
        firstName: provider.firstName,
        lastName: provider.lastName,
        serviceType: provider.serviceType,
        status: provider.status,
        freeProposalCount: provider.freeProposalCount,
        referralCode: provider.referralCode,
      },
      message: 'ثبت‌نام موفقیت‌آمیز بود. مدارک شما پس از تأیید مدیر فعال خواهد شد.',
    })
    responseBody.headers.set('Set-Cookie', setCookieHeader('provider-token', token, 7))
    return responseBody
  } catch (e: any) {
    console.error('Provider register error:', e)
    return bad(`خطا در ثبت‌نام: ${e.message || 'نامشخص'}`, 500)
  }
}
