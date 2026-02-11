import { PrimaryButton } from "@/components/ui/PrimaryButton";

const COURSES = [
  {
    title: "AI Product Systems",
    level: "Operator Track",
    detail: "Design and ship agent-enabled product loops that compound value.",
  },
  {
    title: "Growth Automation Studio",
    level: "Growth Track",
    detail: "Build acquisition, retention, and monetization workflows powered by AI automation.",
  },
  {
    title: "Modern Prompt Engineering",
    level: "Execution Track",
    detail: "Move from ad-hoc prompts to production-grade prompt and context architectures.",
  },
  {
    title: "Founder AI Stack",
    level: "Founder Track",
    detail: "Deploy AI-first operations for lean teams, client delivery, and rapid validation.",
  },
  {
    title: "Content Engine Pro",
    level: "Creator Track",
    detail: "Create high-volume, high-quality publishing workflows with editorial control.",
  },
  {
    title: "Decision Intelligence",
    level: "Leadership Track",
    detail: "Build executive dashboards and tactical decision systems using AI assistants.",
  },
];

export default function CoursesPage() {
  return (
    <div className="section">
      <div className="container-shell">
        <header className="section-head" data-reveal>
          <span className="chip">Course Catalog</span>
          <h1 className="section-title">Premium tracks for builders, operators, and founders</h1>
          <p className="section-copy">
            Curated for high-impact execution in product, growth, content, and operational systems.
          </p>
        </header>

        <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {COURSES.map((course, idx) => (
            <article
              key={course.title}
              className="glass-card"
              data-reveal
              style={{ animationDelay: `${0.07 + idx * 0.05}s`, padding: "1rem", display: "grid", gap: "0.65rem" }}
            >
              <span className="chip" style={{ width: "fit-content" }}>{course.level}</span>
              <h2 style={{ fontSize: "1.2rem" }}>{course.title}</h2>
              <p>{course.detail}</p>
              <PrimaryButton href="/sign-up">Join this track</PrimaryButton>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
