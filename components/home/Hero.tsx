import { PrimaryButton } from "@/components/ui/PrimaryButton";

const SIGNALS = [
  {
    title: "Live Sprint Labs",
    copy: "Weekly execution labs that move ideas into production in under seven days.",
  },
  {
    title: "Operator Curriculum",
    copy: "No theory theater. Just tactical frameworks for teams shipping AI products.",
  },
  {
    title: "Elite Feedback Loop",
    copy: "Priority review channels for founders, PMs, creators, and technical operators.",
  },
];

export function Hero() {
  return (
    <section className="hero">
      <div className="container-shell hero-grid">
        <div className="hero-panel hero-copy" data-reveal style={{ animationDelay: "0.04s" }}>
          <span className="chip">New Interface Era</span>
          <h1 className="hero-title">A Premium AI Campus for Modern Builders</h1>
          <p className="hero-lead">
            Reimagined from zero. Clean architecture, premium visuals, and a focused learning flow
            built for operators who need outcomes, not noise.
          </p>

          <div className="hero-cta-row">
            <PrimaryButton href="/courses">Explore Courses</PrimaryButton>
            <PrimaryButton href="/pricing" variant="ghost">
              View Memberships
            </PrimaryButton>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <b>120+</b>
              <p>Curated lessons</p>
            </div>
            <div className="hero-stat">
              <b>4.9/5</b>
              <p>Member rating</p>
            </div>
            <div className="hero-stat">
              <b>24h</b>
              <p>Average support SLA</p>
            </div>
          </div>
        </div>

        <aside className="hero-panel hero-rail" data-reveal style={{ animationDelay: "0.14s" }}>
          <span className="rail-label">Platform Signals</span>
          <div className="rail-stack">
            {SIGNALS.map((signal, idx) => (
              <article key={signal.title} className="rail-item" data-reveal style={{ animationDelay: `${0.22 + idx * 0.08}s` }}>
                <h3>{signal.title}</h3>
                <p>{signal.copy}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
