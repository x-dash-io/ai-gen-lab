import { Hero } from "@/components/home/Hero";
import { ValueGrid } from "@/components/home/ValueGrid";
import { FeatureShowcase } from "@/components/home/FeatureShowcase";
import { PricingPreview } from "@/components/home/PricingPreview";
import { getHomePageData } from "@/lib/homepage";

export default async function HomePage() {
  const { stats, plans } = await getHomePageData();

  return (
    <>
      <Hero stats={stats} />
      <ValueGrid />
      <FeatureShowcase />
      <PricingPreview plans={plans} />
    </>
  );
}
