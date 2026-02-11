import { PrismaClient, SubscriptionTier } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const plans = [
    {
      id: "plan_starter",
      name: "Starter",
      description: "Access to all Standard courses.",
      tier: "starter" as SubscriptionTier,
      priceMonthlyCents: 999,
      priceAnnualCents: 9900,
    },
    {
      id: "plan_pro",
      name: "Pro",
      description: "Access to all courses + Certificates.",
      tier: "pro" as SubscriptionTier,
      priceMonthlyCents: 1999,
      priceAnnualCents: 19900,
    },
    {
      id: "plan_elite",
      name: "Elite",
      description: "Access to all courses + Learning Paths + Certificates.",
      tier: "elite" as SubscriptionTier,
      priceMonthlyCents: 2999,
      priceAnnualCents: 29900,
    }
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan
    });
  }

  console.log("Subscription plans seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
