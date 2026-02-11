const PRINCIPLES = [
  {
    title: "Premium by default",
    copy: "We design for operators who expect speed, polish, and practical leverage.",
  },
  {
    title: "Execution first",
    copy: "Every learning path is built around deployable outcomes, not passive content consumption.",
  },
  {
    title: "Modern systems",
    copy: "The frontend was fully rebuilt to support a new generation of product-grade learning workflows.",
  },
];

export default function AboutPage() {
  return (
    <div className="section">
      <div className="container-shell">
        <header className="section-head" data-reveal>
          <span className="chip">About AI Genius Lab</span>
          <h1 className="section-title">A rebuilt platform for 21st-century AI learning</h1>
          <p className="section-copy">
            This is a brand-new frontend implementation with premium visual language and modern UX architecture.
          </p>
        </header>

        <div className="card-grid value-grid">
          {PRINCIPLES.map((principle, idx) => (
            <article
              key={principle.title}
              className="glass-card value-card"
              data-reveal
              style={{ animationDelay: `${0.08 + idx * 0.08}s` }}
            >
              <span className="kicker">0{idx + 1}</span>
              <h2>{principle.title}</h2>
              <p>{principle.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
