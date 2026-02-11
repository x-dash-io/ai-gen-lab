import { Hero } from "@/components/home/Hero";
import { ValueGrid } from "@/components/home/ValueGrid";
import { FeatureShowcase } from "@/components/home/FeatureShowcase";
import { PricingPreview } from "@/components/home/PricingPreview";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ValueGrid />
      <FeatureShowcase />
      <PricingPreview />
    </>
  );
}
