import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding blog posts...");

  const posts = [
    {
      title: "The Future of AI in 2026: What to Expect",
      slug: "future-of-ai-2026",
      content: `
        <h2>The AI Landscape in 2026</h2>
        <p>As we move into 2026, Artificial Intelligence has moved beyond simple chat interfaces into deeply integrated autonomous agents. These agents now handle complex multi-step workflows across various industries.</p>
        <h3>Key Trends:</h3>
        <ul>
          <li><strong>Autonomous Reasoning:</strong> AI models no longer just predict text; they reason through logic gates and verify their own outputs.</li>
          <li><strong>Personalized Local Models:</strong> Most professionals now run highly specialized, small language models locally on their devices for privacy and speed.</li>
          <li><strong>AI-Human Synergy:</strong> Education has shifted from testing knowledge to testing the ability to orchestrate AI tools.</li>
        </ul>
        <p>Stay tuned as we explore how these changes impact your learning journey at AI Genius Lab.</p>
      `,
      excerpt: "Deep dive into the autonomous agent revolution and the shift in educational paradigms in 2026.",
      featuredImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1000",
      status: "published" as const,
      tags: ["AI", "Future", "Technology"],
      readTimeMinutes: 5,
    },
    {
      title: "Mastering Prompt Engineering for 2026 Models",
      slug: "mastering-prompt-engineering-2026",
      content: `
        <h2>Beyond Simple Instructions</h2>
        <p>In 2026, prompting has evolved into 'Logic Orchestration'. It's no longer about finding the right words, but about defining the right constraints and reasoning paths for agentic systems.</p>
        <p>We'll look at the new protocols like <em>Reasoning-by-Constraint</em> and <em>Recursive-Feedback Loops</em> that are now standard in the industry.</p>
      `,
      excerpt: "Learn the latest techniques in Logic Orchestration and how to guide 2026's most powerful reasoning models.",
      featuredImage: "https://images.unsplash.com/photo-1620712943543-bcc4628c9757?auto=format&fit=crop&q=80&w=1000",
      status: "published" as const,
      tags: ["Prompt Engineering", "Tutorial", "AI"],
      readTimeMinutes: 8,
    },
    {
      title: "Why Continuous Learning is the Only Skill that Matters",
      slug: "continuous-learning-2026",
      content: `
        <h2>The Half-Life of Skills</h2>
        <p>In the age of rapid AI iteration, the half-life of technical skills has dropped to less than 18 months. What you learned in 2024 is now foundational at best, and obsolete at worst.</p>
        <p>At AI Genius Lab, we focus on the meta-skill: <strong>Learning how to learn.</strong></p>
      `,
      excerpt: "How to stay relevant in a world where technical skills expire faster than ever.",
      featuredImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1000",
      status: "published" as const,
      tags: ["Education", "Mindset", "Career"],
      readTimeMinutes: 4,
    }
  ];

  for (const postData of posts) {
    const { tags, ...data } = postData;
    await prisma.blogPost.upsert({
      where: { slug: data.slug },
      update: {
        ...data,
        tags: {
          connectOrCreate: tags.map(tag => ({
            where: { name: tag },
            create: {
              name: tag,
              slug: tag.toLowerCase().replace(/\s+/g, "-")
            }
          }))
        }
      },
      create: {
        ...data,
        tags: {
          connectOrCreate: tags.map(tag => ({
            where: { name: tag },
            create: {
              name: tag,
              slug: tag.toLowerCase().replace(/\s+/g, "-")
            }
          }))
        }
      }
    });
  }

  console.log("Blog seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
