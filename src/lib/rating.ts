// Rating helper functions for درمانگر

import { db } from './db'

export interface ProviderRatingSummary {
  averageRating: number
  totalRatings: number
  starsBreakdown: { 1: number; 2: number; 3: number; 4: number; 5: number }
  recentComments: {
    id: string
    stars: number
    comment: string | null
    createdAt: Date
    requesterName: string
  }[]
}

export async function getProviderRatingSummary(providerId: string): Promise<ProviderRatingSummary> {
  const ratings = await db.rating.findMany({
    where: { providerId },
    include: {
      request: {
        select: { requesterName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (ratings.length === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      starsBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recentComments: [],
    }
  }

  const sum = ratings.reduce((acc, r) => acc + r.stars, 0)
  const average = sum / ratings.length

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  ratings.forEach((r) => {
    if (r.stars >= 1 && r.stars <= 5) breakdown[r.stars as 1 | 2 | 3 | 4 | 5]++
  })

  const recentComments = ratings
    .filter((r) => r.comment && r.comment.trim().length > 0)
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      stars: r.stars,
      comment: r.comment,
      createdAt: r.createdAt,
      requesterName: r.request.requesterName,
    }))

  return {
    averageRating: Math.round(average * 10) / 10,
    totalRatings: ratings.length,
    starsBreakdown: breakdown,
    recentComments,
  }
}

// Format stars for display (returns Persian stars)
export function formatStars(stars: number): string {
  if (stars === 0) return 'بدون امتیاز'
  const filled = Math.round(stars)
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

// Render star rating as stars + average + count
export function ratingDisplay(summary: ProviderRatingSummary): { label: string; color: string } {
  if (summary.totalRatings === 0) {
    return { label: 'بدون امتیاز', color: 'text-muted-foreground' }
  }
  const avg = summary.averageRating
  let color = 'text-amber-500'
  if (avg >= 4.5) color = 'text-green-600'
  else if (avg >= 3.5) color = 'text-amber-500'
  else if (avg >= 2.5) color = 'text-orange-500'
  else color = 'text-red-500'
  return {
    label: `${avg.toLocaleString('fa-IR')} (${summary.totalRatings.toLocaleString('fa-IR')} امتیاز)`,
    color,
  }
}
