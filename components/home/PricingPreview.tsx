import { PrimaryButton } from "@/components/ui/PrimaryButton";
import type { HomePagePlan } from "@/lib/homepage";

function formatPrice(monthlyPriceCents: number) {
  if (monthlyPriceCents <= 0) {
    return { price: "$0", period: "forever" };
  }

  return {
    price: `$${Math.round(monthlyPriceCents / 100)}`,
    period: "per month",
  };
}

export function PricingPreview({ plans }: { plans: HomePagePlan[] }) {
  return (
    <section className="section">
      <div className="container-shell">
        <header className="section-head" data-reveal>
          <span className="chip">Membership</span>
          <h2 className="section-title">Transparent pricing for serious builders</h2>
          <p className="section-copy">Choose your pace. Upgrade when you want deeper support and advanced tracks.</p>
        </header>

        <div className="card-grid pricing-grid">
          {plans.map((plan, idx) => {
            const formatted = formatPrice(plan.monthlyPriceCents);

            return (
              <article className="glass-card plan-card" key={plan.id} data-reveal style={{ animationDelay: `${0.1 + idx * 0.08}s` }}>
                <h3>{plan.name}</h3>
                <div className="plan-price">
                  <b>{formatted.price}</b>
                  <span>{formatted.period}</span>
                </div>
                <ul className="plan-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <PrimaryButton href="/pricing" variant={plan.name === "Professional" ? "solid" : "ghost"}>
                  See details
                </PrimaryButton>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
