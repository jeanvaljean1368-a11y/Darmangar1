// Constants for درمانگر app

import { ServiceType, DocumentType } from '@prisma/client'

export const SERVICE_TYPES: {
  value: ServiceType
  label: string
  description: string
  icon: string
  needsWoundSpecialistOption?: boolean
}[] = [
  {
    value: 'NURSING',
    label: 'پرستاری',
    description: 'تزریقات، پانسمان زخم، برداشتن بخیه، سونداژ معده و مثانه',
    icon: 'syringe',
  },
  {
    value: 'CAREGIVER',
    label: 'کمک‌پرستاری (مراقبت از سالمند)',
    description: 'مراقبت و رسیدگی به سالمندان',
    icon: 'heart',
  },
  {
    value: 'WOUND_SPECIALIST',
    label: 'کارشناس زخم',
    description: 'تخصصی پانسمان و درمان زخم‌های مزمن',
    icon: 'bandage',
  },
  {
    value: 'MASSAGE',
    label: 'ماساژ درمانی',
    description: 'ماساژ درمانی و فیزیکی',
    icon: 'hand',
  },
  {
    value: 'PHYSIOTHERAPY',
    label: 'فیزیوتراپی',
    description: 'خدمات فیزیوتراپی و توانبخشی',
    icon: 'activity',
  },
]

// Documents required per service type
export const REQUIRED_DOCUMENTS: Record<ServiceType, DocumentType[]> = {
  NURSING: ['NURSING_DEGREE', 'PROFESSIONAL_COMPETENCY', 'NURSING_CARD'],
  CAREGIVER: ['CAREGIVER_CERT'],
  WOUND_SPECIALIST: ['NURSING_DEGREE', 'PROFESSIONAL_COMPETENCY', 'NURSING_CARD', 'WOUND_CERT'],
  MASSAGE: ['MASSAGE_CERT'],
  PHYSIOTHERAPY: ['PHYSIO_CERT'],
}

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  NURSING_DEGREE: 'مدرک کارشناسی پرستاری',
  PROFESSIONAL_COMPETENCY: 'صلاحیت حرفه‌ای',
  NURSING_CARD: 'کارت نظام پرستاری',
  CAREGIVER_CERT: 'مدرک کمک‌پرستاری یک‌ساله',
  WOUND_CERT: 'مدرک کارشناس زخم',
  MASSAGE_CERT: 'مدرک مهارتی ماساژ',
  PHYSIO_CERT: 'مدرک فیزیوتراپی',
  PROFILE_PHOTO: 'عکس پروفایل',
}

// Iran provinces (31 provinces)
export const IRAN_PROVINCES: string[] = [
  'آذربایجان شرقی',
  'آذربایجان غربی',
  'اردبیل',
  'اصفهان',
  'البرز',
  'ایلام',
  'بوشهر',
  'تهران',
  'چهارمحال و بختیاری',
  'خراسان جنوبی',
  'خراسان رضوی',
  'خراسان شمالی',
  'خوزستان',
  'زنجان',
  'سمنان',
  'سیستان و بلوچستان',
  'فارس',
  'قزوین',
  'قم',
  'کردستان',
  'کرمان',
  'کرمانشاه',
  'کهگیلویه و بویراحمد',
  'گلستان',
  'گیلان',
  'لرستان',
  'مازندران',
  'مرکزی',
  'هرمزگان',
  'همدان',
  'یزد',
]

// Common city per province (simplified - one major city per province)
export const PROVINCE_CITIES: Record<string, string[]> = {
  'تهران': ['تهران', 'اسلام‌شهر', 'شهریار', 'ورامین', 'ری', 'پاکدشت', 'رباط‌کریم'],
  'اصفهان': ['اصفهان', 'کاشان', 'نجف‌آباد', 'خمینی‌شهر', 'شاهین‌شهر', 'فولادشهر'],
  'فارس': ['شیراز', 'مرودشت', 'کازرون', 'جهرم', 'فسا', 'داراب'],
  'خراسان رضوی': ['مشهد', 'نیشابور', 'سبزوار', 'تربت حیدریه', 'قوچان'],
  'آذربایبان شرقی': ['تبریز', 'مراغه', 'میانه', 'اهر', 'بناب'],
  'گیلان': ['رشت', 'انزلی', 'لاهیجان', 'آستارا', 'صومعه‌سرا'],
  'مازندران': ['ساری', 'بابل', 'آمل', 'قائم‌شهر', 'نوشهر'],
  'خوزستان': ['اهواز', 'آبادان', 'خرمشهر', 'دزفول', 'بهبهان'],
  'کرمان': ['کرمان', 'سیرجان', 'رفسنجان', 'جیرفت', 'بم'],
  'قم': ['قم', 'کهک', 'جعفریه'],
  'البرز': ['کرج', 'فردیس', 'نظرآباد', 'اشتهارد', 'هشتگرد'],
  'یزد': ['یزد', 'میبد', 'اردکان', 'بافق', 'تفت'],
  'گلستان': ['گرگان', 'گنبد', 'علی‌آباد', 'آق‌قلا', 'بندرترکمن'],
  'اردبیل': ['اردبیل', 'خلخال', 'مشکین‌شهر', 'پارس‌آباد'],
  'همدان': ['همدان', 'ملایر', 'نهاوند', 'تویسرکان', 'اسدآباد'],
  'کردستان': ['سنندج', 'سقز', 'مریوان', 'بانه', 'قروه'],
  'کرمانشاه': ['کرمانشاه', 'اسلام‌آباد', 'هرسین', 'صحنه', 'کنگاور'],
  'لرستان': ['خرم‌آباد', 'بروجرد', 'دورود', 'الیگودرز', 'کوهدشت'],
  'مرکزی': ['اراک', 'ساوه', 'خمین', 'محلات', 'دلیجان'],
  'زنجان': ['زنجان', 'ابهر', 'خرمدره', 'قیدار', 'ماه‌نشان'],
  'قزوین': ['قزوین', 'تاکستان', 'آبیک', 'بوئین‌زهرا', 'الوند'],
  'سمنان': ['سمنان', 'شاهرود', 'دامغان', 'گرمسار', 'مهدی‌شهر'],
  'بوشهر': ['بوشهر', 'برازجان', 'گناوه', 'خارک', 'دیلم'],
  'هرمزگان': ['بندرعباس', 'میناب', 'قشم', 'بندرلنگه', 'کیش'],
  'سیستان و بلوچستان': ['زاهدان', 'زابل', 'چابهار', 'ایرانشهر', 'خاش'],
  'چهارمحال و بختیاری': ['شهرکرد', 'بروجن', 'فارسان', 'لردگان', 'سامان'],
  'کهگیلویه و بویراحمد': ['یاسوج', 'گچساران', 'دهدشت', 'سی‌سخت', 'لیکک'],
  'ایلام': ['ایلام', 'دهلران', 'آبدانان', 'مهران', 'ایوان'],
  'خراسان شمالی': ['بجنورد', 'اسفراین', 'شیروان', 'جاجرم', 'آشخانه'],
  'خراسان جنوبی': ['بیرجند', 'قاین', 'فردوس', 'نهبندان', 'طبس'],
  'آذربایجان غربی': ['ارومیه', 'خوی', 'میاندوآب', 'مراغه', 'ماکو'],
}

// Get cities for a province (returns at least one city)
export function getCitiesForProvince(province: string): string[] {
  if (!province) return []
  return PROVINCE_CITIES[province] || [province]
}

// Pricing
export const PROPOSAL_FEE = 15000 // Toman, charged after 5 free proposals
export const FREE_PROPOSAL_LIMIT = 5
export const FREE_PROPOSAL_WITH_REFERRAL = 7 // 5 + 2 extra for referred users
export const REFERRAL_BONUS_PROPOSALS = 2
export const REQUEST_VALIDITY_MINUTES = 20
export const MAX_PROPOSALS_PER_REQUEST = 5

// Admin credentials (default)
export const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'darmanegar1403', // changed by user after first login
}

// JWT
export const JWT_SECRET = process.env.JWT_SECRET || 'darmanegar-secret-key-change-in-production'
export const JWT_EXPIRES_IN = '7d'
