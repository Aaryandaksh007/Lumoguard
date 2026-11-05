import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// On Vercel / serverless: copy SQLite database to writable /tmp
function getDatabaseUrl(): string {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

  if (isVercel) {
    const tmpPath = '/tmp/custom.db'
    const sourcePath = path.join(process.cwd(), 'db', 'custom.db')
    try {
      if (!fs.existsSync(tmpPath) && fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, tmpPath)
      }
      return `file:${tmpPath}`
    } catch (e) {
      console.error('[db.ts] Failed to copy SQLite to /tmp:', e)
    }
  }

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('/home/z/')) {
    return process.env.DATABASE_URL
  }

  return `file:${path.join(process.cwd(), 'db', 'custom.db').replace(/\\/g, '/')}`
}

process.env.DATABASE_URL = getDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
