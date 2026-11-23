// HTTP helpers for API routes

import { NextResponse } from 'next/server'

export function ok(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function unauthorized(message = 'احراز هویت نشده') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'دسترسی مجاز نیست') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFound(message = 'یافت نشد') {
  return NextResponse.json({ error: message }, { status: 404 })
}

// Set cookie helper
export function setCookieHeader(name: string, value: string, maxAgeDays = 7): string {
  const maxAge = maxAgeDays * 24 * 60 * 60
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`
}

export function clearCookieHeader(name: string): string {
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

// Validate Iranian national ID — با تشخیص کدهای ساختگی و سوری
export function isValidNationalId(nationalId: string): boolean {
  // باید دقیقاً ۱۰ رقم باشد
  if (!/^\d{10}$/.test(nationalId)) return false

  const digits = nationalId.split('').map(Number)

  // رد کردن کدهای همه‌رقم‌یکسان (مثل ۱۱۱۱۱۱۱۱۱۱، ۲۲۲۲۲۲۲۲۲۲، ...)
  const allSame = digits.every((d) => d === digits[0])
  if (allSame) return false

  // رد کردن الگوهای متوالی صعودی و نزولی
  let isAscending = true
  let isDescending = true
  for (let i = 0; i < 9; i++) {
    if (digits[i + 1] !== digits[i] + 1) isAscending = false
    if (digits[i + 1] !== digits[i] - 1) isDescending = false
  }
  if (isAscending || isDescending) return false

  // رد کردن کدهای با پیش‌شماره‌ی ۰۰۰ (نامعتبر)
  const prefix = parseInt(nationalId.substring(0, 3), 10)
  if (prefix === 0) return false

  // الگوریتم checksum استاندارد ایرانی
  const check = digits[9]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i)
  }
  const remainder = sum % 11
  const expected = remainder < 2 ? remainder : 11 - remainder

  // بررسی checksum
  if (expected !== check) return false

  // رد کردن کدهای رایج ساختگی شناخته‌شده
  const knownFake = [
    '1234567890', '9876543210', '0123456789', '1111111111',
    '0000000000', '9999999999', '1234567891', '2234567891',
    '123456789', '0012345678', '0012345679',
  ]
  if (knownFake.includes(nationalId)) return false

  // رد کردن کدهایی که ۳ رقم اول همه صفر باشند یا الگوی غیراستاندارد
  // کد ملی ایرانی: ۳ رقم اول نشان‌دهنده‌ی شهر/استان محل صدور است (۱ تا ۹۹۹)
  // کدهای با پیش‌شماره‌ی 999 نامعتبر هستند
  if (prefix >= 999) return false

  return true
}

// Validate Iranian phone
export function isValidPhone(phone: string): boolean {
  return /^09\d{9}$/.test(phone)
}

// Convert Persian digits to English
export function toEnglishDigits(s: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹'
  const arabic = '٠١٢٣٤٥٦٧٨٩'
  return s.replace(/[۰-۹٠-٩]/g, (c) => String(persian.indexOf(c) >= 0 ? persian.indexOf(c) : arabic.indexOf(c)))
}
