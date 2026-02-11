const STACK_A = [
  "Roadmaps tuned for founders and operators",
  "Execution blueprints for automation + revenue",
  "Member-only tactical workshops every week",
];

const STACK_B = [
  "High-trust product and growth community",
  "Fast feedback loops for active projects",
  "Priority support on implementation blockers",
];

export function FeatureShowcase() {
  return (
    <section className="section">
      <div className="container-shell showcase-wrap" data-reveal>
        <header className="section-head" style={{ marginBottom: "1rem" }}>
          <span className="chip" style={{ color: "#d7e9ff", borderColor: "rgba(215, 233, 255, 0.25)", background: "rgba(255,255,255,0.06)" }}>
            Core Platform
          </span>
          <h2 className="section-title" style={{ color: "#f2f7ff" }}>
            Designed for builders shipping in real markets
          </h2>
          <p className="section-copy" style={{ color: "#c7d3ec" }}>
            This is a fully new front-end direction built around clarity, speed, and premium feel.
          </p>
        </header>

        <div className="showcase-grid">
          <article className="showcase-column" data-reveal style={{ animationDelay: "0.1s" }}>
            <h3>Execution Engine</h3>
            <ul>
              {STACK_A.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="showcase-column" data-reveal style={{ animationDelay: "0.18s" }}>
            <h3>Operator Network</h3>
            <ul>
              {STACK_B.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
