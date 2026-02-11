import { PrismaClient, SubscriptionTier, CourseTier } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Starting Database Seed...");

    // 1. Clean Database (Delete in order to avoid FK constraints)
    console.log("Cleaning database...");
    await prisma.review.deleteMany();
    await prisma.lessonContent.deleteMany();
    await prisma.progress.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.section.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.subscriptionPayment.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.subscriptionPlan.deleteMany();
    await prisma.learningPathCourse.deleteMany();
    await prisma.certificate.deleteMany();
    await prisma.course.deleteMany();
    await prisma.learningPath.deleteMany();
    await prisma.category.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();


    // 2. Seed Subscription Plans
    console.log("Seeding Plans...");
    const plans = [
        {
            id: "plan_starter",
            name: "Starter",
            description: "Access to Free Courses.",
            tier: SubscriptionTier.starter,
            priceMonthlyCents: 0,
            priceAnnualCents: 0,
            isActive: true,
        },
        {
            id: "plan_professional",
            name: "Professional",
            description: "Access to Master AI Tools, Build AI Apps & Agents.",
            tier: SubscriptionTier.professional,
            priceMonthlyCents: 1900, // $19
            priceAnnualCents: 19000, // $190
            isActive: true,
        },
        {
            id: "plan_founder",
            name: "Founder",
            description: "Access to All Content + Traffic, Viral Content & Business Strategies.",
            tier: SubscriptionTier.founder,
            priceMonthlyCents: 4900, // $49
            priceAnnualCents: 49000, // $490
            isActive: true,
        },
    ];

    for (const plan of plans) {
        await prisma.subscriptionPlan.create({ data: plan });
    }

    // 3. Seed Categories
    console.log("Seeding Categories...");
    const categories = [
        // Starter / Free
        { name: "Free Courses", slug: "free-courses", icon: "Gift", color: "blue" },

        // Professional
        { name: "Master AI Tools", slug: "master-ai-tools", icon: "Wrench", color: "indigo" },
        { name: "Build AI Apps and Agents", slug: "build-ai-apps", icon: "Cpu", color: "violet" },

        // Founder
        { name: "Get Traffic with AI", slug: "get-traffic-with-ai", icon: "BarChart", color: "emerald" },
        { name: "Create Viral AI Content", slug: "create-viral-ai-content", icon: "Video", color: "rose" },
        { name: "Start an AI Business", slug: "start-an-ai-business", icon: "Briefcase", color: "amber" },
    ];

    const categoryMap = new Map();
    for (const cat of categories) {
        const created = await prisma.category.create({
            data: {
                id: cat.slug,
                ...cat,
                description: `${cat.name} Category`
            }
        });
        categoryMap.set(cat.slug, created.id);
    }

    // 4. Seed Sample Courses (linked to categories)
    console.log("Seeding Sample Courses...");

    const sampleCourses = [
        // Free
        { title: "AI Basics for Beginners", slug: "ai-basics", categorySlug: "free-courses", price: 0, tier: CourseTier.STANDARD },

        // Professional
        { title: "Mastering ChatGPT", slug: "mastering-chatgpt", categorySlug: "master-ai-tools", price: 4900, tier: CourseTier.PREMIUM },
        { title: "Excel AI Automation", slug: "excel-ai", categorySlug: "master-ai-tools", price: 4900, tier: CourseTier.PREMIUM },
        { title: "Build Your First AI Agent", slug: "first-ai-agent", categorySlug: "build-ai-apps", price: 9900, tier: CourseTier.PREMIUM },
        { title: "Chatbot Development 101", slug: "chatbot-101", categorySlug: "build-ai-apps", price: 9900, tier: CourseTier.PREMIUM },

        // Founder
        { title: "YouTube Growth with AI", slug: "youtube-growth-ai", categorySlug: "get-traffic-with-ai", price: 14900, tier: CourseTier.PREMIUM },
        { title: "TikTok Faceless Channels", slug: "tiktok-faceless", categorySlug: "get-traffic-with-ai", price: 14900, tier: CourseTier.PREMIUM },
        { title: "SEO Domination with AI", slug: "seo-domination", categorySlug: "create-viral-ai-content", price: 19900, tier: CourseTier.PREMIUM },
        { title: "Launch Your AI Agency", slug: "launch-ai-agency", categorySlug: "start-an-ai-business", price: 29900, tier: CourseTier.PREMIUM },
    ];

    for (const course of sampleCourses) {
        await prisma.course.create({
            data: {
                id: `course_${course.slug}`,
                title: course.title,
                slug: course.slug,
                description: `Learn everything about ${course.title} in this comprehensive course.`,
                imageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80", // Generic AI image
                priceCents: course.price,
                tier: course.tier,
                isPublished: true,
                categoryId: categoryMap.get(course.categorySlug),
                updatedAt: new Date(),
            }
        });
    }

    // 5. Seed Blog Tags & Posts
    console.log("Seeding Blog...");

    // Clean blog tables first (to be safe, though handled at top)
    await prisma.blogReview.deleteMany();
    await prisma.blogPost.deleteMany(); // Cascade deletes tags relation but not tags themselves? No, explicit many-to-many.
    await prisma.blogTag.deleteMany();

    const blogTags = [
        { name: "AI News", slug: "ai-news" },
        { name: "Tutorials", slug: "tutorials" },
        { name: "Business", slug: "business" },
        { name: "Ethics", slug: "ethics" },
        { name: "Generative AI", slug: "generative-ai" },
    ];

    const tagMap = new Map();
    for (const tag of blogTags) {
        const created = await prisma.blogTag.create({ data: tag });
        tagMap.set(tag.slug, created.id);
    }

    const blogPosts = [
        {
            title: "The Future of AI in 2026: Trends to Watch",
            slug: "future-of-ai-2026",
            excerpt: "From autonomous agents to hyper-personalized education, here is what the next year holds for artificial intelligence.",
            content: `
# The Future of AI in 2026

Artificial Intelligence continues to evolve at a breakneck pace. As we settle into 2026, several key trends are emerging that will define the landscape for developers, businesses, and consumers alike.

## 1. Autonomous Agents
The shift from "prompts" to "goals" is complete. Agents can now plan, execute, and iterate on complex tasks without constant human intervention.

## 2. Hyper-Personalized Education
AI is revolutionizing how we learn. Platforms like AI Genius Lab are at the forefront, offering curriculum that adapts in real-time to your learning style.

## 3. Sustainable AI
With the massive compute requirements of LLMs, the focus is shifting towards efficient, small language models (SLMs) and green computing.
            `,
            featuredImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80", // Futurist AI layout
            tags: ["ai-news", "generative-ai"],
            readTimeMinutes: 5,
            views: 1250,
        },
        {
            title: "How to Build Your First AI Agent with Python",
            slug: "build-first-ai-agent-python",
            excerpt: "A step-by-step guide to creating a simple autonomous agent using LangChain and OpenAI.",
            content: `
# Building Your First AI Agent

Agents are the new apps. In this tutorial, we'll build a simple research agent that can search the web and summarize findings.

## Prerequisites
- Python 3.10+
- OpenAI API Key
- LangChain

## Step 1: Setup
First, install the necessary packages...

(Content truncated for brevity, but imagine a high-quality tutorial here).
            `,
            featuredImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80", // Matrix code / Python feel
            tags: ["tutorials", "generative-ai"],
            readTimeMinutes: 12,
            views: 3400,
        },
        {
            title: "Monetizing AI: 5 Business Models for 2026",
            slug: "monetizing-ai-business-models",
            excerpt: "Stop selling prompts. Start selling outcomes. Here are the most profitable AI business models right now.",
            content: `
# Monetizing AI

The "wrapper" era is over. To build a sustainable AI business in 2026, you need defensible value.

## 1. Enterprise Workflows
Deep vertical integration into specific industries (e.g., Legal AI, Medical AI) remains highly profitable.

## 2. Agent-as-a-Service (AaaS)
Instead of SaaS, offer agents that do the work. "Hiring" an AI employee is the new subscription.
            `,
            featuredImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80", // Business / Charts
            tags: ["business", "ai-news"],
            readTimeMinutes: 7,
            views: 890,
        },
        {
            title: "The Ethics of AI-Generated Content",
            slug: "ethics-ai-content",
            excerpt: "As AI fills the web with content, how do we distinguish truth from hallucination? A deep dive into provenance.",
            content: `
# The Ethics of AI Content

With the rise of multi-modal models, creating realistic fake media is easier than ever. This poses significant challenges for society.

## Watermarking & Provenance
Standard like C2PA are becoming essential. We must ensure that human creativity is respected while embracing AI tools.
            `,
            featuredImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80", // Cyber/Human hybrid conceptual
            tags: ["ethics", "ai-news"],
            readTimeMinutes: 6,
            views: 2100,
        },
    ];

    for (const post of blogPosts) {
        await prisma.blogPost.create({
            data: {
                title: post.title,
                slug: post.slug,
                excerpt: post.excerpt,
                content: post.content,
                featuredImage: post.featuredImage,
                status: "published",
                readTimeMinutes: post.readTimeMinutes,
                views: post.views,
                tags: {
                    connect: post.tags.map(slug => ({ id: tagMap.get(slug) }))
                }
            }
        });
    }

    // 6. Seed Testimonials
    console.log("Seeding Testimonials...");
    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Marketing Manager",
            rating: 5,
            text: "AI Genius Lab transformed how I approach content creation. The courses are practical, well-structured, and immediately applicable. I've automated 60% of my content workflow!",
            category: "courses",
            courseOrPath: "AI for Content Creation",
            date: new Date("2024-01-15"),
            featured: true,
        },
        {
            name: "Michael Chen",
            role: "Software Developer",
            rating: 5,
            text: "The learning paths are incredible! Going from beginner to building production AI apps in just 3 months. The structured approach made all the difference.",
            category: "learning-paths",
            courseOrPath: "Full-Stack AI Developer Path",
            date: new Date("2024-01-10"),
            featured: true,
        },
        {
            name: "David Thompson",
            role: "Entrepreneur",
            rating: 5,
            text: "The platform is intuitive and the progress tracking keeps me motivated. Lifetime access means I can learn at my own pace without pressure. Best investment I've made!",
            category: "platform",
            date: new Date("2024-01-05"),
            featured: true,
        },
        {
            name: "James Wilson",
            role: "Product Manager",
            rating: 5,
            text: "The AI Product Management path gave me the confidence to lead AI initiatives at my company. Practical case studies and hands-on projects were game-changers.",
            category: "learning-paths",
            courseOrPath: "AI Product Management Path",
            date: new Date("2023-12-20"),
            featured: true,
        },
        {
            name: "Emily Rodriguez",
            role: "Business Analyst",
            rating: 5,
            text: "I had zero AI experience before this. Now I'm implementing AI solutions at my company and getting recognized for it. The courses break down complex concepts beautifully.",
            category: "courses",
            courseOrPath: "AI for Business Professionals",
            date: new Date("2024-01-08"),
            featured: false,
        }
    ];

    for (const t of testimonials) {
        await prisma.testimonial.create({ data: t });
    }

    console.log("✅ Database reset and seeded successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
