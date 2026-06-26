/*
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
*/

// Log 남기기
/*
export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'warn', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'error', emit: 'event' }
  ]
  // errorFormat: 'pretty',
})

prisma.$on('query', e => {
  console.log(e)
})

prisma.$on('warn', e => {
  console.log(e)
})
*/
