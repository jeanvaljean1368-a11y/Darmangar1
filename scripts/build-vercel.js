// Build script for Vercel deployment
// اگر در محیط production هستیم (DATABASE_URL به postgresql اشاره می‌کند)
// schema.prisma را به postgresql تغییر می‌دهد

/* eslint-disable @typescript-eslint/no-require-imports */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma')
const databaseUrl = process.env.DATABASE_URL || ''

console.log('[build-vercel] DATABASE_URL prefix:', databaseUrl.split(':')[0] || '(not set)')

// اگر DATABASE_URL به postgresql اشاره می‌کند، schema را به postgresql تغییر بده
if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
  console.log('[build-vercel] PostgreSQL detected — switching schema to postgresql')
  let schema = readFileSync(schemaPath, 'utf-8')
  schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"')
  writeFileSync(schemaPath, schema)
  console.log('[build-vercel] ✅ schema.prisma updated to postgresql')
} else if (databaseUrl.startsWith('file:')) {
  console.log('[build-vercel] SQLite detected — keeping schema as sqlite')
} else {
  console.log('[build-vercel] DATABASE_URL not set — keeping default (sqlite)')
  // در Vercel اگر DATABASE_URL ست نشده، خطا بده
  if (process.env.VERCEL) {
    console.error('[build-vercel] ❌ DATABASE_URL is required on Vercel!')
    process.exit(1)
  }
}

// تولید Prisma Client
console.log('[build-vercel] Generating Prisma Client...')
try {
  execSync('bun run db:generate', { stdio: 'inherit' })
  console.log('[build-vercel] ✅ Prisma Client generated')
} catch (e) {
  console.error('[build-vercel] ❌ Prisma generate failed:', e.message)
  process.exit(1)
}
