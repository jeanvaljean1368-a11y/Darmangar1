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

// Validate Iranian national ID
export function isValidNationalId(nationalId: string): boolean {
  if (!/^\d{10}$/.test(nationalId)) return false
  const digits = nationalId.split('').map(Number)
  const check = digits[9]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i)
  }
  const remainder = sum % 11
  const expected = remainder < 2 ? remainder : 11 - remainder
  return expected === check
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
