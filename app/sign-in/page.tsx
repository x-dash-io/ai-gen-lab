import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="section">
      <div className="container-shell" style={{ maxWidth: "560px" }}>
        <header className="section-head" data-reveal>
          <span className="chip">Access</span>
          <h1 className="section-title">Sign in to your workspace</h1>
          <p className="section-copy">
            Access your premium learning environment and operator toolkit.
          </p>
        </header>

        <div data-reveal style={{ animationDelay: "0.1s" }}>
          <Suspense fallback={<div className="glass-card contact-form">Loading sign-in form...</div>}>
            <SignInForm />
          </Suspense>
          <p style={{ marginTop: "0.9rem", fontSize: "0.93rem" }}>
            New here?{" "}
            <Link
              href="/sign-up"
              style={{ color: "var(--accent-strong)", fontWeight: 700 }}
            >
              Create your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
