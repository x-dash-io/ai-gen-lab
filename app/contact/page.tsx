import { ContactForm } from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <div className="section">
      <div className="container-shell contact-grid">
        <div className="glass-card" style={{ padding: "1rem" }} data-reveal>
          <span className="chip">Contact</span>
          <h1 className="section-title" style={{ marginTop: "0.8rem" }}>
            Talk to our team
          </h1>
          <p className="section-copy" style={{ marginTop: "0.8rem" }}>
            Share your goal, your team stage, and what you want to build. We will point you to the
            right learning track and implementation path.
          </p>
          <div style={{ marginTop: "1.2rem", display: "grid", gap: "0.55rem", color: "var(--muted)" }}>
            <p>
              <b style={{ color: "var(--ink)" }}>Email:</b> support@aigeniuslab.com
            </p>
            <p>
              <b style={{ color: "var(--ink)" }}>Response window:</b> within 24 hours
            </p>
            <p>
              <b style={{ color: "var(--ink)" }}>Timezone:</b> US business hours
            </p>
          </div>
        </div>

        <div data-reveal style={{ animationDelay: "0.1s" }}>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
