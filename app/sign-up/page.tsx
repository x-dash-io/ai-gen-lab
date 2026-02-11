import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="section">
      <div className="container-shell" style={{ maxWidth: "620px" }}>
        <header className="section-head" data-reveal>
          <span className="chip">Membership</span>
          <h1 className="section-title">Create your AI Genius Lab account</h1>
          <p className="section-copy">Join the rebuilt premium platform and start with a clean modern experience.</p>
        </header>

        <div data-reveal style={{ animationDelay: "0.1s" }}>
          <SignUpForm />
          <p style={{ marginTop: "0.9rem", fontSize: "0.93rem" }}>
            Already a member?{" "}
            <Link href="/sign-in" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
