const VALUES = [
  {
    id: "01",
    title: "Premium Delivery",
    copy: "Every module ships with clear execution paths, scorecards, and rollout checklists.",
  },
  {
    id: "02",
    title: "High-Fidelity Learning",
    copy: "Content is sequenced for compounding leverage across product, marketing, and automation.",
  },
  {
    id: "03",
    title: "Serious Design",
    copy: "A focused, modern interface that respects attention and removes friction.",
  },
];

export function ValueGrid() {
  return (
    <section className="section">
      <div className="container-shell">
        <header className="section-head" data-reveal>
          <span className="chip">Why this rebuild matters</span>
          <h2 className="section-title">New frontend. New experience. No legacy drag.</h2>
          <p className="section-copy">
            The previous frontend has been fully removed. This implementation is fresh, intentional,
            and optimized for premium delivery.
          </p>
        </header>

        <div className="card-grid value-grid">
          {VALUES.map((value, idx) => (
            <article
              key={value.id}
              className="glass-card value-card"
              data-reveal
              style={{ animationDelay: `${0.1 + idx * 0.08}s` }}
            >
              <span className="kicker">{value.id}</span>
              <h3>{value.title}</h3>
              <p>{value.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
