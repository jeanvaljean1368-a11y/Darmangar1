// Working hours helper for درمانگر

import { db } from './db'

// Days of week in Persian (Saturday=0 ... Friday=6)
export const DAYS_OF_WEEK = [
  { value: 0, label: 'شنبه' },
  { value: 1, label: 'یکشنبه' },
  { value: 2, label: 'دوشنبه' },
  { value: 3, label: 'سه‌شنبه' },
  { value: 4, label: 'چهارشنبه' },
  { value: 5, label: 'پنجشنبه' },
  { value: 6, label: 'جمعه' },
]

// Get the Persian day-of-week from a date (0=شنبه)
export function getPersianDayOfWeek(date: Date): number {
  // JS: 0=Sunday, 1=Monday, ..., 6=Saturday
  // Persian: 0=Saturday, ..., 6=Friday
  const jsDay = date.getDay()
  // Convert: Saturday(6 JS) → 0 Persian
  // Sunday(0 JS) → 1 Persian
  // Monday(1 JS) → 2 Persian
  // Tuesday(2 JS) → 3 Persian
  // Wednesday(3 JS) → 4 Persian
  // Thursday(4 JS) → 5 Persian
  // Friday(5 JS) → 6 Persian
  if (jsDay === 6) return 0 // Saturday → شنبه
  return jsDay + 1
}

// Check if a provider is currently working
export async function isProviderWorking(providerId: string, now: Date = new Date()): Promise<{ working: boolean; until?: number; nextSlot?: string }> {
  const dayOfWeek = getPersianDayOfWeek(now)
  const currentHour = now.getHours()

  const hours = await db.workingHours.findMany({
    where: { providerId, dayOfWeek, isActive: true },
  })

  if (hours.length === 0) {
    // No working hours set — assume always available
    return { working: true }
  }

  const active = hours.find((h) => currentHour >= h.fromHour && currentHour < h.toHour)
  if (active) {
    return { working: true, until: active.toHour }
  }

  // Find next available slot
  const nextHours = await db.workingHours.findMany({
    where: { providerId, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { fromHour: 'asc' }],
  })

  // Find next slot today or in coming days
  for (let offset = 0; offset < 7; offset++) {
    const checkDay = (dayOfWeek + offset) % 7
    const checkHour = offset === 0 ? currentHour : 0
    const next = nextHours.find((h) => h.dayOfWeek === checkDay && h.fromHour >= checkHour)
    if (next) {
      const dayLabel = DAYS_OF_WEEK.find((d) => d.value === checkDay)?.label || ''
      return {
        working: false,
        nextSlot: `${dayLabel} از ساعت ${next.fromHour}`,
      }
    }
  }

  return { working: false }
}

// Get a provider's working hours (grouped by day)
export async function getProviderWorkingHours(providerId: string) {
  const hours = await db.workingHours.findMany({
    where: { providerId },
    orderBy: [{ dayOfWeek: 'asc' }, { fromHour: 'asc' }],
  })
  return hours.map((h) => ({
    id: h.id,
    dayOfWeek: h.dayOfWeek,
    dayLabel: DAYS_OF_WEEK.find((d) => d.value === h.dayOfWeek)?.label || '',
    fromHour: h.fromHour,
    toHour: h.toHour,
    isActive: h.isActive,
  }))
}

// Set/update working hours (replaces all)
export async function setProviderWorkingHours(
  providerId: string,
  hours: { dayOfWeek: number; fromHour: number; toHour: number }[]
): Promise<void> {
  await db.workingHours.deleteMany({ where: { providerId } })
  if (hours.length > 0) {
    await db.workingHours.createMany({
      data: hours.map((h) => ({
        providerId,
        dayOfWeek: h.dayOfWeek,
        fromHour: h.fromHour,
        toHour: h.toHour,
        isActive: true,
      })),
    })
  }
}

// Format hour as Persian-friendly
export function formatHour(hour: number): string {
  return `${hour.toLocaleString('fa-IR')}:۰۰`
}
