
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('--- COURSES ---')
    const courses = await prisma.course.findMany({ select: { id: true, title: true, imageUrl: true, categoryId: true } })
    console.log(JSON.stringify(courses, null, 2))

    console.log('\n--- LEARNING PATHS ---')
    const paths = await prisma.learningPath.findMany({ select: { id: true, title: true, imageUrl: true } })
    console.log(JSON.stringify(paths, null, 2))

    console.log('\n--- BLOGS ---')
    const posts = await prisma.blogPost.findMany({ select: { id: true, title: true, featuredImage: true } })
    console.log(JSON.stringify(posts, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
