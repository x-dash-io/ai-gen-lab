import { PrimaryButton } from "@/components/ui/PrimaryButton";

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    features: ["Preview lessons", "Community feed", "Limited templates"],
  },
  {
    name: "Professional",
    price: "$29",
    period: "per month",
    features: ["Full course access", "Live sprint labs", "Priority implementation support"],
  },
  {
    name: "Founder",
    price: "$99",
    period: "per month",
    features: ["Advanced tracks", "1:1 strategy reviews", "Team collaboration seat"],
  },
];

export function PricingPreview() {
  return (
    <section className="section">
      <div className="container-shell">
        <header className="section-head" data-reveal>
          <span className="chip">Membership</span>
          <h2 className="section-title">Transparent pricing for serious builders</h2>
          <p className="section-copy">Choose your pace. Upgrade when you want deeper support and advanced tracks.</p>
        </header>

        <div className="card-grid pricing-grid">
          {PLANS.map((plan, idx) => (
            <article className="glass-card plan-card" key={plan.name} data-reveal style={{ animationDelay: `${0.1 + idx * 0.08}s` }}>
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <b>{plan.price}</b>
                <span>{plan.period}</span>
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
          ))}
        </div>
      </div>
    </section>
  );
}
