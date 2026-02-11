import { PrimaryButton } from "@/components/ui/PrimaryButton";

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Explore core modules and community resources.",
    items: ["Preview lessons", "Community access", "Starter templates"],
  },
  {
    name: "Professional",
    price: "$29",
    period: "per month",
    description: "Full premium curriculum and implementation workflows.",
    items: ["All core tracks", "Live sprint labs", "Priority support"],
  },
  {
    name: "Founder",
    price: "$99",
    period: "per month",
    description: "Advanced strategy layer for teams and ambitious operators.",
    items: ["Advanced founder tracks", "Direct strategy reviews", "Team seat included"],
  },
];

export default function PricingPage() {
  return (
    <div className="section">
      <div className="container-shell">
        <header className="section-head" data-reveal>
          <span className="chip">Pricing</span>
          <h1 className="section-title">Simple plans. High leverage delivery.</h1>
          <p className="section-copy">Start free, upgrade when you need deeper implementation support.</p>
        </header>

        <div className="card-grid pricing-grid">
          {PLANS.map((plan, idx) => (
            <article
              key={plan.name}
              className="glass-card plan-card"
              data-reveal
              style={{ animationDelay: `${0.1 + idx * 0.08}s` }}
            >
              <h2>{plan.name}</h2>
              <div className="plan-price">
                <b>{plan.price}</b>
                <span>{plan.period}</span>
              </div>
              <p>{plan.description}</p>
              <ul className="plan-list">
                {plan.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <PrimaryButton href="/sign-up" variant={plan.name === "Professional" ? "solid" : "ghost"}>
                Choose {plan.name}
              </PrimaryButton>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
