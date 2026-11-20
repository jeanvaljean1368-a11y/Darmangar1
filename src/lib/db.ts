import { PrismaClient } from '@prisma/client'

// جلوگیری از multi-instantiation در dev و serverless environments
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// در محیط production (Vercel) لاگ‌ها را کم می‌کنیم برای عملکرد بهتر
const logLevel: any[] = process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevel,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
