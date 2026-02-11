"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function SignInForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form className="glass-card contact-form" onSubmit={handleSubmit}>
      <label>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>Email</span>
        <input type="email" name="email" placeholder="you@company.com" required />
      </label>

      <label>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>Password</span>
        <input type="password" name="password" placeholder="••••••••" required />
      </label>

      <button className="primary-btn" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>

      {error ? <p style={{ color: "#b42318", fontWeight: 600 }}>{error}</p> : null}
    </form>
  );
}
