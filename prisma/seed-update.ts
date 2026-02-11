
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 1
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const coursesToUpdate = [
    {
        title: "Data Mining Foundations and Practice",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
        category: "Data Science"
    },
    {
        title: "Power BI Data Analyst Associate",
        image: "https://images.unsplash.com/photo-1543286386-713df548e9cc?auto=format&fit=crop&w=800&q=80",
        category: "Data Analysis"
    },
    {
        title: "Statistics And Machine Learning",
        image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80",
        category: "Machine Learning"
    },
    {
        title: "Big Data Management And Analytics",
        image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80",
        category: "Data Science"
    },
    {
        title: "Applied Artificial Intelligence And Automation ",
        trimTitle: true,
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80",
        category: "Artificial Intelligence"
    },
    {
        title: "End-to-End Software Engineering ",
        trimTitle: true,
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
        category: "Engineering"
    },
    {
        title: "Business Development And Growth Strategy ",
        trimTitle: true,
        image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80",
        category: "Business"
    },
    {
        title: "AI AUTOMATION AND TEMPLATES",
        image: "https://images.unsplash.com/photo-1642427749670-f20e2e76ed8c?auto=format&fit=crop&w=800&q=80",
        category: "Automation"
    },
    {
        title: "THE AI SYSTEM ",
        trimTitle: true,
        image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80",
        category: "Artificial Intelligence"
    },
    {
        title: "The AI Creator ",
        trimTitle: true,
        image: "https://images.unsplash.com/photo-1535378437327-b7102b743231?auto=format&fit=crop&w=800&q=80",
        category: "Creative AI"
    },
    {
        title: "Audio Effects Course",
        image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80",
        category: "Audio"
    },
    {
        title: "Audio 1",
        image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
        category: "Audio"
    }
]

const newCourses = [
    {
        title: "Advanced NLP with Transformers",
        slug: "advanced-nlp-transformers",
        image: "https://images.unsplash.com/photo-1518932945647-7a1c969f8be1?auto=format&fit=crop&w=800&q=80",
        description: "Master Natural Language Processing with state-of-the-art Transformer models.",
        priceCents: 12900,
        category: "Artificial Intelligence"
    },
    {
        title: "Computer Vision Mastery",
        slug: "computer-vision-mastery",
        image: "https://images.unsplash.com/photo-1561736778-92e52a7769ef?auto=format&fit=crop&w=800&q=80",
        description: "Build advanced computer vision applications using PyTorch and OpenCV.",
        priceCents: 14900,
        category: "Computer Vision"
    }
]

const learningPaths = [
    {
        title: "AI Engineer Career Track",
        slug: "ai-engineer-career-track",
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
        description: "From basics to advanced AI engineering. Complete roadmap.",
        courses: ["Statistics And Machine Learning", "Applied Artificial Intelligence And Automation", "Deep Learning Fundamentals"]
    },
    {
        title: "Data Scientist Specialist",
        slug: "data-scientist-specialist",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
        description: "Master data science skills from mining to analytics.",
        courses: ["Data Mining Foundations and Practice", "Big Data Management And Analytics"]
    }
]

const blogPosts = [
    {
        title: "The Future of LLMs",
        slug: "the-future-of-llms",
        content: "Large Language Models are rapidly evolving...",
        excerpt: "Exploring what comes next after GPT-4.",
        image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80" // High tech AI abstract
    },
    {
        title: "Getting Started with AI Automation",
        slug: "getting-started-ai-automation",
        content: "Automation is the key to productivity...",
        excerpt: "How to leverage AI for your daily workflows.",
        image: "https://images.unsplash.com/photo-1488229297570-58520851e868?auto=format&fit=crop&w=800&q=80" // Workplace technology
    }
]

async function main() {
    console.log('Starting content update...')

    // 1. Update Existing Courses
    console.log('--- Updating Existing Courses ---')
    for (const course of coursesToUpdate) {
        try {
            const searchTitle = course.trimTitle ? course.title.trim() : course.title

            // Attempt to find by exact title (or trimmed)
            const existing = await prisma.course.findFirst({
                where: {
                    title: {
                        contains: searchTitle.substring(0, 15), // flexible match
                        mode: 'insensitive'
                    }
                }
            })

            if (existing) {
                console.log(`Updating image for: ${existing.title}`)
                await prisma.course.update({
                    where: { id: existing.id },
                    data: {
                        imageUrl: course.image,
                        // We could also update category if we had a mechanism to look up Category IDs
                    }
                })
            } else {
                console.log(`Could not find existing course: ${course.title}`)
            }
        } catch (e) {
            console.error(`Error updating course ${course.title}:`, e)
        }
    }

    // 2. Add New Courses
    console.log('--- Adding New Courses ---')
    for (const course of newCourses) {
        try {
            const exists = await prisma.course.findFirst({ where: { slug: course.slug } })
            if (!exists) {
                console.log(`Creating new course: ${course.title}`)
                await prisma.course.create({
                    data: {
                        id: `new_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                        title: course.title,
                        slug: course.slug,
                        description: course.description,
                        imageUrl: course.image,
                        priceCents: course.priceCents,
                        isPublished: true,
                        updatedAt: new Date(),
                    }
                })
            } else {
                console.log(`Course already exists: ${course.title}, updating image...`)
                await prisma.course.update({
                    where: { id: exists.id },
                    data: { imageUrl: course.image }
                })
            }
        } catch (e) {
            console.error(`Error adding course ${course.title}:`, e)
        }
    }

    // 3. Learning Paths
    console.log('--- Updating Learning Paths ---')
    for (const path of learningPaths) {
        try {
            const exists = await prisma.learningPath.findFirst({ where: { slug: path.slug } })
            if (!exists) {
                console.log(`Creating learning path: ${path.title}`)
                await prisma.learningPath.create({
                    data: {
                        id: `lp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                        title: path.title,
                        slug: path.slug,
                        description: path.description,
                        imageUrl: path.image,
                        updatedAt: new Date()
                    }
                })
            } else {
                console.log(`Learning Path exists: ${path.title}, updating image...`)
                await prisma.learningPath.update({
                    where: { id: exists.id },
                    data: { imageUrl: path.image }
                })
            }
        } catch (e) {
            console.error(`Error working on Learning Path ${path.title}:`, e)
        }
    }

    // 4. Blogs
    console.log('--- Updating Blogs ---')
    for (const post of blogPosts) {
        try {
            const exists = await prisma.blogPost.findFirst({ where: { slug: post.slug } })
            if (!exists) {
                console.log(`Creating blog: ${post.title}`)
                await prisma.blogPost.create({
                    data: {
                        title: post.title,
                        slug: post.slug,
                        content: post.content,
                        excerpt: post.excerpt,
                        featuredImage: post.image,
                        status: 'published',
                        updatedAt: new Date()
                    }
                })
            } else {
                console.log(`Blog exists: ${post.title}, updating image...`)
                await prisma.blogPost.update({
                    where: { id: exists.id },
                    data: { featuredImage: post.image }
                })
            }
        } catch (e) {
            console.error(`Error working on Blog ${post.title}:`, e)
        }
    }

    console.log('Content update complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
